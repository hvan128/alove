"""VALSEA streaming STT plugin for livekit-agents.

Wraps VALSEA's realtime WebSocket ASR (the same protocol the Node provider in
`packages/providers/src/valsea.ts` uses) as a livekit-agents `stt.STT` so the
cascade pipeline can run VALSEA-first per the VéĐi brief:

    session.start -> stream PCM16 16k mono -> input_audio_buffer.commit
    <- transcript.partial / transcript.final

Protocol (authoritative source: packages/providers/src/valsea.ts):
  - Connect  wss://api.valsea.ai/v1/realtime  with `Authorization: Bearer <key>`.
  - Send     {"type":"session.start","audio":{"encoding":"pcm_s16le","sample_rate":16000,"channels":1}}
  - Send     raw little-endian PCM16 bytes as binary frames.
  - Send     {"type":"input_audio_buffer.commit"}  to close an utterance.
  - Receive  {"type":"transcript.partial|final","transcript":{"text",...}}  (or flat fields).
  - Send     {"type":"session.stop"}  before closing.

NOTE: targets livekit-agents ~1.3. The transcript mapping + wire protocol are
verified against the Node adapter; the STT/SpeechStream glue follows the standard
plugin shape (deepgram/openai). It has NOT been run against a live VALSEA key in
this workspace — verify end-to-end before trusting it in a pilot.
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
SAMPLE_RATE = 16000


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
        self._api_key = api_key or os.getenv("VALSEA_API_KEY", "")
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
                        }
                    )
                )

                async def send_task() -> None:
                    # The base stream resamples mic audio to self._sr and yields
                    # rtc.AudioFrame; a FlushSentinel marks end-of-utterance.
                    async for data in self._input_ch:
                        if isinstance(data, self._FlushSentinel):
                            if not ws.closed:
                                await ws.send_str(json.dumps({"type": "input_audio_buffer.commit"}))
                            continue
                        frame: rtc.AudioFrame = data
                        if not ws.closed:
                            await ws.send_bytes(bytes(frame.data))
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
        if event_type not in ("transcript.partial", "transcript.final"):
            return
        transcript = raw.get("transcript") if isinstance(raw.get("transcript"), dict) else raw
        text = (transcript.get("text") or raw.get("text") or "").strip()
        if not text:
            return
        confidence = transcript.get("confidence") or raw.get("confidence") or 1.0
        data = stt.SpeechData(language=self._language, text=text, confidence=float(confidence))
        if event_type == "transcript.final":
            self._event_ch.send_nowait(
                stt.SpeechEvent(type=stt.SpeechEventType.FINAL_TRANSCRIPT, alternatives=[data])
            )
            self._event_ch.send_nowait(stt.SpeechEvent(type=stt.SpeechEventType.END_OF_SPEECH))
        else:
            self._event_ch.send_nowait(
                stt.SpeechEvent(type=stt.SpeechEventType.INTERIM_TRANSCRIPT, alternatives=[data])
            )
