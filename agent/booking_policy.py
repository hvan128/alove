"""Human-in-the-loop policy for the VéĐi booking voice worker."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class AgentMode(StrEnum):
    HUMAN = "human"
    AUTO = "auto"


@dataclass(frozen=True)
class PolicyDecision:
    publish_transcript: bool = False
    generate_reply: bool = False
    speak_text: str | None = None
    commit_turn: bool = False
    end_call: bool = False


class BookingVoicePolicy:
    def __init__(self) -> None:
        self.mode = AgentMode.HUMAN
        self.transcript_language = "original"

    def on_caller_final(self, text: str) -> PolicyDecision:
        if not text.strip():
            return PolicyDecision()
        return PolicyDecision(
            publish_transcript=True,
            generate_reply=self.mode is AgentMode.AUTO,
        )

    def apply_room_command(self, event: dict[str, Any]) -> PolicyDecision:
        event_type = event.get("type")
        if event_type == "staff.preferences":
            mode = event.get("mode")
            if mode in {AgentMode.HUMAN.value, AgentMode.AUTO.value}:
                self.mode = AgentMode(mode)
            language = event.get("transcriptLanguage")
            if language in {"original", "vi", "en"}:
                self.transcript_language = language
            return PolicyDecision()
        if event_type == "staff.speak":
            text = event.get("text")
            if isinstance(text, str) and text.strip():
                return PolicyDecision(speak_text=text.strip())
            return PolicyDecision()
        if event_type == "staff.end_turn":
            return PolicyDecision(commit_turn=True)
        if event_type == "staff.end_call":
            return PolicyDecision(end_call=True)
        return PolicyDecision()


def normalize_session_code(value: str) -> str:
    normalized = re.sub(r"[\s-]+", "", value.strip()).upper()
    if not re.fullmatch(r"[A-Z0-9]{4,12}", normalized):
        raise ValueError("Invalid session code.")
    return normalized


def session_code_from_dispatch(*, room_name: str, dispatch_metadata: str | None) -> str:
    if dispatch_metadata:
        try:
            value = json.loads(dispatch_metadata)
            if isinstance(value, dict) and isinstance(value.get("sessionCode"), str):
                return normalize_session_code(value["sessionCode"])
        except (json.JSONDecodeError, ValueError):
            pass
    if room_name.startswith("vedi-"):
        return normalize_session_code(room_name.removeprefix("vedi-"))
    raise ValueError("Unable to resolve session code from dispatch metadata or room name.")


def caller_identity_for_session(session_code: str) -> str:
    return f"caller-{normalize_session_code(session_code)}"
