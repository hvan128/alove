import base64
import json

import pytest

from valsea_stt import (
    DEFAULT_HINT_TEXT,
    ValseaProtocolError,
    build_audio_append,
    build_audio_commit,
    build_session_start,
    build_session_stop,
    parse_server_message,
    to_room_transcript_event,
    validate_pcm16,
)


def test_builds_official_vietnamese_session_messages() -> None:
    assert build_session_start() == {
        "type": "session.start",
        "model": "valsea-rtt",
        "language": "vietnamese",
        "hint_text": DEFAULT_HINT_TEXT,
        "enable_correction": True,
        "diarize": False,
    }
    assert build_audio_commit() == {"type": "audio.commit"}
    assert build_session_stop() == {"type": "session.stop"}


def test_encodes_pcm16_audio_append_and_validates_format() -> None:
    pcm = b"\x01\x00\xfe\xff"
    assert build_audio_append(pcm) == {
        "type": "audio.append",
        "audio": base64.b64encode(pcm).decode("ascii"),
    }
    assert validate_pcm16(pcm, sample_rate=16_000, num_channels=1) == pcm

    with pytest.raises(ValseaProtocolError, match="PCM16"):
        validate_pcm16(b"\x01", sample_rate=16_000, num_channels=1)
    with pytest.raises(ValseaProtocolError, match="16000"):
        validate_pcm16(pcm, sample_rate=48_000, num_channels=1)
    with pytest.raises(ValseaProtocolError, match="mono"):
        validate_pcm16(pcm, sample_rate=16_000, num_channels=2)


def test_maps_ready_partial_final_and_error_without_inventing_text() -> None:
    assert parse_server_message(json.dumps({
        "type": "session.ready",
        "sessionId": "rtt-001",
    })) == {
        "kind": "ready",
        "session_id": "rtt-001",
    }
    assert parse_server_message(json.dumps({
        "type": "transcript.partial",
        "text": "Tôi muốn đặt hai vé",
        "timestampMs": 800,
    })) == {
        "kind": "partial",
        "text": "Tôi muốn đặt hai vé",
        "timestamp_ms": 800,
        "confidence": None,
    }
    assert parse_server_message(json.dumps({
        "type": "transcript.final",
        "text": "Tôi muốn đặt hai vé đi Đà Lạt.",
        "timestampMs": 1_450,
        "confidence": 0.97,
    })) == {
        "kind": "final",
        "text": "Tôi muốn đặt hai vé đi Đà Lạt.",
        "timestamp_ms": 1_450,
        "confidence": 0.97,
    }
    assert parse_server_message(json.dumps({
        "type": "error",
        "code": "INVALID_MESSAGE",
        "message": "Failed to parse message",
    })) == {
        "kind": "error",
        "code": "INVALID_MESSAGE",
        "message": "Failed to parse message",
    }
    assert parse_server_message('{"type":"transcript.final"}') is None
    assert parse_server_message("not-json") is None


def test_maps_valsea_transcript_to_versioned_room_event() -> None:
    provider = {
        "kind": "final",
        "text": "Đặt hai vé đi Đà Lạt.",
        "timestamp_ms": 1_200,
        "confidence": 0.96,
    }
    event = to_room_transcript_event(
        provider,
        session_code="DEMO42",
        event_id="valsea-final-001",
        occurred_at="2026-07-18T04:00:00.000Z",
    )

    assert event == {
        "version": 1,
        "eventId": "valsea-final-001",
        "sessionCode": "DEMO42",
        "occurredAt": "2026-07-18T04:00:00.000Z",
        "type": "transcript.final",
        "message": {
            "id": "message-valsea-final-001",
            "role": "caller",
            "text": "Đặt hai vé đi Đà Lạt.",
            "language": "vi",
            "translations": {},
            "confidence": 0.96,
            "startedAtMs": 0,
            "endedAtMs": 1_200,
            "channel": "voice",
        },
    }


def test_rejects_non_transcript_room_mapping() -> None:
    with pytest.raises(ValseaProtocolError, match="transcript"):
        to_room_transcript_event(
            {"kind": "ready", "session_id": "rtt-001"},
            session_code="DEMO42",
            event_id="ready-001",
            occurred_at="2026-07-18T04:00:00.000Z",
        )
