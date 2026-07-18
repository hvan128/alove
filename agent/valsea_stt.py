"""VALSEA RTT protocol and a small async streaming client.

The pure builders/parsers are intentionally independent from LiveKit so the
mandatory ASR boundary can be verified without provider credentials.
"""

from __future__ import annotations

import asyncio
import base64
import json
from collections.abc import AsyncIterator
from typing import Any

import websockets
from websockets.asyncio.client import ClientConnection

VALSEA_REALTIME_URL = "wss://api.valsea.ai/v1/realtime"
DEFAULT_HINT_TEXT = (
    "đặt vé xe khách, điểm đi, điểm đến, ngày đi, giờ khởi hành, "
    "điểm đón, điểm trả, số ghế, giường nằm, limousine, "
    "Sài Gòn, Đà Lạt, Nha Trang, Bến xe Miền Đông mới"
)


class ValseaProtocolError(ValueError):
    """Raised when audio or a client message violates the VALSEA contract."""


def build_session_start(*, hint_text: str = DEFAULT_HINT_TEXT) -> dict[str, Any]:
    return {
        "type": "session.start",
        "model": "valsea-rtt",
        "language": "vietnamese",
        "hint_text": hint_text.strip() or DEFAULT_HINT_TEXT,
        "enable_correction": True,
        "diarize": False,
    }


def build_audio_append(pcm: bytes) -> dict[str, str]:
    validate_pcm16(pcm, sample_rate=16_000, num_channels=1)
    return {
        "type": "audio.append",
        "audio": base64.b64encode(pcm).decode("ascii"),
    }


def build_audio_commit() -> dict[str, str]:
    return {"type": "audio.commit"}


def build_session_stop() -> dict[str, str]:
    return {"type": "session.stop"}


def validate_pcm16(pcm: bytes, *, sample_rate: int, num_channels: int) -> bytes:
    if not pcm or len(pcm) % 2:
        raise ValseaProtocolError("Audio must contain non-empty PCM16 samples.")
    if sample_rate != 16_000:
        raise ValseaProtocolError("VALSEA input must be resampled to 16000 Hz.")
    if num_channels != 1:
        raise ValseaProtocolError("VALSEA input must be mono.")
    return pcm


def parse_server_message(raw: str | bytes) -> dict[str, Any] | None:
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
        return None
    if not isinstance(value, dict):
        return None

    event_type = value.get("type")
    if event_type in {"session.created", "session.ready"}:
        return {
            "kind": "ready" if event_type == "session.ready" else "created",
            "session_id": _non_empty_string(value.get("sessionId")),
        }
    if event_type == "error":
        return {
            "kind": "error",
            "code": _non_empty_string(value.get("code")) or "VALSEA_ERROR",
            "message": (
                _non_empty_string(value.get("message"))
                or "VALSEA returned an unknown error."
            ),
        }
    if event_type not in {"transcript.partial", "transcript.final"}:
        return None

    text = _non_empty_string(value.get("text"))
    if text is None:
        transcript = value.get("transcript")
        if isinstance(transcript, dict):
            text = _non_empty_string(transcript.get("text"))
    if text is None:
        return None
    timestamp = _non_negative_number(value.get("timestampMs"))
    confidence = _confidence(value.get("confidence"))
    return {
        "kind": "final" if event_type == "transcript.final" else "partial",
        "text": text,
        "timestamp_ms": int(timestamp or 0),
        "confidence": confidence,
    }


def to_room_transcript_event(
    provider_event: dict[str, Any],
    *,
    session_code: str,
    event_id: str,
    occurred_at: str,
) -> dict[str, Any]:
    kind = provider_event.get("kind")
    text = _non_empty_string(provider_event.get("text"))
    if kind not in {"partial", "final"} or text is None:
        raise ValseaProtocolError("Only a VALSEA transcript event can be mapped to room data.")
    timestamp_ms = int(_non_negative_number(provider_event.get("timestamp_ms")) or 0)
    return {
        "version": 1,
        "eventId": event_id,
        "sessionCode": session_code,
        "occurredAt": occurred_at,
        "type": f"transcript.{kind}",
        "message": {
            "id": f"message-{event_id}" if kind == "final" else f"message-live-{session_code}",
            "role": "caller",
            "text": text,
            "language": "vi",
            "translations": {},
            "confidence": _confidence(provider_event.get("confidence")),
            "startedAtMs": 0,
            "endedAtMs": timestamp_ms,
            "channel": "voice",
        },
    }


class ValseaRealtimeClient:
    """One authenticated VALSEA RTT WebSocket session."""

    def __init__(
        self,
        api_key: str,
        *,
        endpoint: str = VALSEA_REALTIME_URL,
        hint_text: str = DEFAULT_HINT_TEXT,
    ) -> None:
        if not api_key.strip():
            raise ValseaProtocolError("VALSEA_API_KEY is required.")
        self._api_key = api_key
        self._endpoint = endpoint
        self._hint_text = hint_text
        self._socket: ClientConnection | None = None

    async def connect(self) -> None:
        if self._socket is not None:
            return
        self._socket = await websockets.connect(
            self._endpoint,
            additional_headers={"Authorization": f"Bearer {self._api_key}"},
            max_size=4 * 1024 * 1024,
            ping_interval=20,
            ping_timeout=20,
        )
        try:
            raw = await asyncio.wait_for(self._socket.recv(), timeout=10)
        except TimeoutError as error:
            await self._socket.close()
            self._socket = None
            raise ValseaProtocolError(
                "VALSEA did not create a realtime session in time."
            ) from error
        created = parse_server_message(raw)
        if created is None or created.get("kind") != "created":
            await self._socket.close()
            self._socket = None
            raise ValseaProtocolError("VALSEA did not return session.created.")
        await self._send_json(build_session_start(hint_text=self._hint_text))

    async def send_pcm(self, pcm: bytes) -> None:
        validate_pcm16(pcm, sample_rate=16_000, num_channels=1)
        socket = self._require_socket()
        await socket.send(pcm)

    async def commit(self) -> None:
        await self._send_json(build_audio_commit())

    async def events(self) -> AsyncIterator[dict[str, Any]]:
        socket = self._require_socket()
        async for raw in socket:
            if not isinstance(raw, (str, bytes)):
                continue
            event = parse_server_message(raw)
            if event is not None:
                yield event

    async def close(self) -> None:
        socket, self._socket = self._socket, None
        if socket is None:
            return
        try:
            await socket.send(json.dumps(build_session_stop(), separators=(",", ":")))
        finally:
            await socket.close()

    async def __aenter__(self) -> ValseaRealtimeClient:
        await self.connect()
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.close()

    async def _send_json(self, value: dict[str, Any]) -> None:
        await self._require_socket().send(json.dumps(value, separators=(",", ":")))

    def _require_socket(self) -> ClientConnection:
        if self._socket is None:
            raise ValseaProtocolError("VALSEA session is not connected.")
        return self._socket


def _non_empty_string(value: object) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def _non_negative_number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value) if value >= 0 else None


def _confidence(value: object) -> float | None:
    number = _non_negative_number(value)
    return number if number is not None and number <= 1 else None
