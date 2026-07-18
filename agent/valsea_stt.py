"""VALSEA streaming STT plugin for livekit-agents.

Wraps VALSEA's realtime WebSocket ASR as a livekit-agents ``stt.STT`` so the
Python worker can run a VALSEA-first cascade:

    session.start -> stream PCM16 16k mono
    <- transcript.partial / transcript.final

Protocol — verified against the live API on 2026-07-18 by probing it directly:

  - Connect  wss://api.valsea.ai/v1/realtime  with `Authorization: Bearer <key>`.
  - Recv     {"type":"session.created", supportedModels:["valsea-rtt"], supportedLanguages:[...131]}
  - Send     {"type":"session.start","audio":{...},"language":"vietnamese","model":"valsea-rtt"}
  - Recv     {"type":"session.ready","engine":"valsea-4"}
  - Send     audio as raw binary PCM16 frames (also accepts
             {"type":"audio.append","audio":"<base64>"}; `data:` is silently ignored).
  - Recv     {"type":"transcript.final","text":"...","rawText":"...","isFinal":true,
             "timestampMs":1234}   — FLAT fields, no nested `transcript` object,
             no start_ms/end_ms/confidence/event_id.
  - Send     {"type":"session.stop"}  ->  {"type":"session.stopped"}

There is NO end-of-utterance/commit message: `input_audio_buffer.commit`, `commit`,
`flush`, `finalize` and `end_utterance` all return
{"code":"UNKNOWN_MESSAGE"}. VALSEA does its own endpointing and emits finals on
its own schedule, so the LiveKit flush sentinel must NOT send anything.

`language` matters: omit it and VALSEA will not transcribe Vietnamese correctly.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os

import aiohttp
from livekit import rtc
from livekit.agents import (
    DEFAULT_API_CONNECT_OPTIONS,
    APIConnectOptions,
    stt,
)

logger = logging.getLogger(__name__)

VALSEA_WS_URL = os.getenv("VALSEA_WS_URL", "wss://api.valsea.ai/v1/realtime")
VALSEA_MODEL = os.getenv("VALSEA_MODEL", "valsea-rtt")
SAMPLE_RATE = 16000

# VALSEA names languages in full ("vietnamese"), not as ISO codes ("vi").
_LANGUAGE_NAMES = {"vi": "vietnamese", "en": "english"}


def _valsea_language(code: str) -> str:
    return _LANGUAGE_NAMES.get(code, code)


class VALSEASTT(stt.STT):
    """livekit-agents STT backed by VALSEA realtime ASR."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        language: str = "vi",
        sample_rate: int = SAMPLE_RATE,
    ) -> None:
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=True, interim_results=True)
        )
        configured_key = api_key if api_key is not None else os.getenv("VALSEA_API_KEY", "")
        self._api_key = configured_key.strip()
        if not self._api_key:
            raise ValueError("VALSEA_API_KEY not set")
        self._language = language
        self._sample_rate = sample_rate

    async def _recognize_impl(
        self,
        buffer,
        *,
        language: str | None = None,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ):
        raise NotImplementedError("VALSEA STT is streaming-only; use .stream()")

    def stream(
        self,
        *,
        language: str | None = None,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "VALSEASpeechStream":
        return VALSEASpeechStream(
            stt=self,
            api_key=self._api_key,
            language=language or self._language,
            sample_rate=self._sample_rate,
            conn_options=conn_options,
        )


class VALSEASpeechStream(stt.SpeechStream):
    def __init__(
        self,
        *,
        stt: VALSEASTT,
        api_key: str,
        language: str,
        sample_rate: int,
        conn_options: APIConnectOptions,
    ) -> None:
        super().__init__(stt=stt, conn_options=conn_options, sample_rate=sample_rate)
        self._api_key = api_key
        self._language = language
        self._sr = sample_rate
        # Set when VALSEA answers session.ready; audio sent before that is refused
        # with NOT_READY, so send_task buffers until this fires.
        self._ready = asyncio.Event()

    async def _run(self) -> None:
        async with aiohttp.ClientSession() as http:
            async with http.ws_connect(
                VALSEA_WS_URL, headers={"Authorization": f"Bearer {self._api_key}"}
            ) as ws:
                await ws.send_str(
                    json.dumps(
                        {
                            "type": "session.start",
                            "audio": {
                                "encoding": "pcm_s16le",
                                "sample_rate": self._sr,
                                "channels": 1,
                            },
                            # Without an explicit language VALSEA does not transcribe
                            # Vietnamese correctly.
                            "language": _valsea_language(self._language),
                            "model": VALSEA_MODEL,
                        }
                    )
                )

                async def send_task() -> None:
                    # VALSEA rejects audio with NOT_READY until it has answered
                    # session.ready. Buffer the caller's opening words instead of
                    # dropping them — without this the first ~1-3s of every
                    # utterance is lost and the agent answers a truncated sentence.
                    pending: list[bytes] = []
                    # The base stream resamples mic audio to self._sr and yields
                    # rtc.AudioFrame; a FlushSentinel marks end-of-utterance.
                    async for data in self._input_ch:
                        # VALSEA endpoints on its own and rejects every commit-style
                        # message, so the flush sentinel is deliberately a no-op.
                        if isinstance(data, self._FlushSentinel):
                            continue
                        frame: rtc.AudioFrame = data
                        if ws.closed:
                            continue
                        audio = bytes(frame.data)
                        if not self._ready.is_set():
                            # ~10s of 16k mono audio; far more than the handshake needs.
                            if len(pending) < 320:
                                pending.append(audio)
                            continue
                        if pending:
                            for buffered in pending:
                                await ws.send_bytes(buffered)
                            pending.clear()
                        await ws.send_bytes(audio)
                    if not ws.closed:
                        await ws.send_str(json.dumps({"type": "session.stop"}))

                async def recv_task() -> None:
                    async for msg in ws:
                        if msg.type != aiohttp.WSMsgType.TEXT:
                            continue
                        try:
                            self._emit(json.loads(msg.data))
                        except Exception as exc:  # noqa: BLE001 — one bad event shouldn't kill the stream
                            logger.debug("VALSEA event parse failed: %s", exc)

                tasks = [
                    asyncio.create_task(send_task()),
                    asyncio.create_task(recv_task()),
                ]
                try:
                    await asyncio.gather(*tasks)
                finally:
                    for task in tasks:
                        task.cancel()

    def _emit(self, raw: dict) -> None:
        event_type = raw.get("type")
        if event_type == "session.ready":
            self._ready.set()
            return
        if event_type == "error":
            logger.warning("VALSEA error: %s %s", raw.get("code"), raw.get("message"))
            return
        if event_type not in ("transcript.partial", "transcript.final"):
            return
        # Live payload is flat: {"text","rawText","isFinal","timestampMs"}. Older
        # docs described a nested {"transcript":{...}} object — tolerate both.
        nested = raw.get("transcript")
        source = nested if isinstance(nested, dict) else raw
        text = (source.get("text") or "").strip()
        if not text:
            return
        # VALSEA does not report a per-utterance confidence; report full confidence
        # rather than inventing a score.
        confidence = float(source.get("confidence") or 1.0)
        data = stt.SpeechData(language=self._language, text=text, confidence=confidence)
        if event_type == "transcript.final" or raw.get("isFinal") is True:
            self._event_ch.send_nowait(
                stt.SpeechEvent(type=stt.SpeechEventType.FINAL_TRANSCRIPT, alternatives=[data])
            )
            self._event_ch.send_nowait(stt.SpeechEvent(type=stt.SpeechEventType.END_OF_SPEECH))
        else:
            self._event_ch.send_nowait(
                stt.SpeechEvent(type=stt.SpeechEventType.INTERIM_TRANSCRIPT, alternatives=[data])
            )
