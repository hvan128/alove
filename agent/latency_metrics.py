"""Bounded aggregation for LiveKit per-speech latency metrics.

LiveKit may emit EOU, LLM and TTS metrics in any order, and preemptive
generation means their durations can overlap. This module therefore reports the
individual measurements and the slowest measured stage; it deliberately does
not add them into a fictional end-to-end total.
"""

from __future__ import annotations

import math
import time
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable


@dataclass(frozen=True)
class TurnLatency:
    speech_id: str
    turn_timestamp: float
    end_of_utterance_seconds: float
    transcription_seconds: float
    llm_ttft_seconds: float
    tts_ttfb_seconds: float

    @property
    def slowest_stage_seconds(self) -> float:
        return max(
            self.end_of_utterance_seconds,
            self.transcription_seconds,
            self.llm_ttft_seconds,
            self.tts_ttfb_seconds,
        )

    def to_event_payload(self) -> dict[str, object]:
        measured_at = datetime.fromtimestamp(
            self.turn_timestamp,
            tz=timezone.utc,
        ).isoformat().replace("+00:00", "Z")
        return {
            "type": "latency.turn",
            "latency": {
                "speechId": self.speech_id,
                "measuredAt": measured_at,
                "slowestStageSeconds": self.slowest_stage_seconds,
                "endOfUtteranceSeconds": self.end_of_utterance_seconds,
                "transcriptionSeconds": self.transcription_seconds,
                "llmTtftSeconds": self.llm_ttft_seconds,
                "ttsTtfbSeconds": self.tts_ttfb_seconds,
            },
        }


@dataclass
class _PendingLatency:
    updated_at: float
    turn_timestamp: float | None = None
    end_of_utterance_seconds: float | None = None
    transcription_seconds: float | None = None
    llm_ttft_seconds: float | None = None
    tts_ttfb_seconds: float | None = None

    def complete(self) -> bool:
        return all(
            value is not None
            for value in (
                self.end_of_utterance_seconds,
                self.transcription_seconds,
                self.llm_ttft_seconds,
                self.tts_ttfb_seconds,
            )
        )


class TurnLatencyAggregator:
    """Join the first valid EOU/LLM/TTS sample for each LiveKit speech ID."""

    def __init__(
        self,
        *,
        max_records: int = 64,
        ttl_seconds: float = 120.0,
        clock: Callable[[], float] = time.monotonic,
        wall_clock: Callable[[], float] = time.time,
    ) -> None:
        if max_records < 1:
            raise ValueError("max_records must be positive")
        if not math.isfinite(ttl_seconds) or ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive and finite")
        self._max_records = max_records
        self._ttl_seconds = ttl_seconds
        self._clock = clock
        self._wall_clock = wall_clock
        self._pending: OrderedDict[str, _PendingLatency] = OrderedDict()
        self._completed: OrderedDict[str, float] = OrderedDict()
        self._aliases: OrderedDict[str, tuple[str, float]] = OrderedDict()
        self._last_emitted_turn_timestamp = -math.inf

    @property
    def tracked_count(self) -> int:
        return len(self._pending) + len(self._completed) + len(self._aliases)

    def link_speech(self, *, child_speech_id: str, parent_speech_id: str) -> None:
        """Associate TTS from ``session.say()`` with its owning tool turn."""
        if (
            not child_speech_id
            or not parent_speech_id
            or child_speech_id == parent_speech_id
            or len(child_speech_id) > 128
            or len(parent_speech_id) > 128
        ):
            return
        now = self._clock()
        self._expire(now)
        canonical_parent = self._canonical_speech_id(parent_speech_id)
        self._aliases[child_speech_id] = (canonical_parent, now)
        self._aliases.move_to_end(child_speech_id)
        self._enforce_bound()

    def observe(self, metric: object) -> TurnLatency | None:
        now = self._clock()
        self._expire(now)

        kind = getattr(metric, "type", None)
        speech_id = getattr(metric, "speech_id", None)
        if kind not in {"eou_metrics", "llm_metrics", "tts_metrics"}:
            return None
        if not isinstance(speech_id, str) or not speech_id or len(speech_id) > 128:
            return None
        speech_id = self._canonical_speech_id(speech_id)
        if speech_id in self._completed:
            return None
        if kind in {"llm_metrics", "tts_metrics"} and getattr(metric, "cancelled", False):
            return None

        values = self._read_values(metric, kind)
        if values is None:
            return None

        pending = self._pending.get(speech_id)
        if pending is None:
            pending = _PendingLatency(updated_at=now)
            self._pending[speech_id] = pending
        else:
            pending.updated_at = now
            self._pending.move_to_end(speech_id)

        for field, value in values.items():
            if getattr(pending, field) is None:
                setattr(pending, field, value)

        if kind == "eou_metrics" and pending.turn_timestamp is None:
            timestamp = getattr(metric, "timestamp", None)
            if isinstance(timestamp, bool) or not isinstance(timestamp, (int, float)):
                del self._pending[speech_id]
                return None
            timestamp = float(timestamp)
            if not self._valid_turn_timestamp(timestamp):
                del self._pending[speech_id]
                return None
            pending.turn_timestamp = timestamp

        if not pending.complete():
            self._enforce_bound()
            return None

        result = TurnLatency(
            speech_id=speech_id,
            turn_timestamp=pending.turn_timestamp or 0.0,
            end_of_utterance_seconds=pending.end_of_utterance_seconds or 0.0,
            transcription_seconds=pending.transcription_seconds or 0.0,
            llm_ttft_seconds=pending.llm_ttft_seconds or 0.0,
            tts_ttfb_seconds=pending.tts_ttfb_seconds or 0.0,
        )
        del self._pending[speech_id]
        self._completed[speech_id] = now
        self._enforce_bound()
        if result.turn_timestamp <= self._last_emitted_turn_timestamp:
            return None
        self._last_emitted_turn_timestamp = result.turn_timestamp
        return result

    @staticmethod
    def _read_values(metric: object, kind: str) -> dict[str, float] | None:
        if kind == "eou_metrics":
            raw_values = {
                "end_of_utterance_seconds": getattr(metric, "end_of_utterance_delay", None),
                "transcription_seconds": getattr(metric, "transcription_delay", None),
            }
        elif kind == "llm_metrics":
            raw_values = {"llm_ttft_seconds": getattr(metric, "ttft", None)}
        else:
            raw_values = {"tts_ttfb_seconds": getattr(metric, "ttfb", None)}

        values: dict[str, float] = {}
        for field, raw in raw_values.items():
            if isinstance(raw, bool) or not isinstance(raw, (int, float)):
                return None
            value = float(raw)
            if not math.isfinite(value) or value < 0 or value > 300:
                return None
            values[field] = value
        if kind == "eou_metrics" and values["transcription_seconds"] > values["end_of_utterance_seconds"]:
            return None
        return values

    def _canonical_speech_id(self, speech_id: str) -> str:
        seen: set[str] = set()
        current = speech_id
        while current in self._aliases and current not in seen:
            seen.add(current)
            current = self._aliases[current][0]
        return current

    def _valid_turn_timestamp(self, timestamp: float) -> bool:
        if not math.isfinite(timestamp) or timestamp <= 0:
            return False
        if abs(timestamp - self._wall_clock()) > 300:
            return False
        try:
            datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except (OSError, OverflowError, ValueError):
            return False
        return True

    def _expire(self, now: float) -> None:
        while self._pending:
            speech_id, pending = next(iter(self._pending.items()))
            if now - pending.updated_at < self._ttl_seconds:
                break
            del self._pending[speech_id]
        while self._completed:
            speech_id, completed_at = next(iter(self._completed.items()))
            if now - completed_at < self._ttl_seconds:
                break
            del self._completed[speech_id]
        while self._aliases:
            speech_id, (_, linked_at) = next(iter(self._aliases.items()))
            if now - linked_at < self._ttl_seconds:
                break
            del self._aliases[speech_id]

    def _enforce_bound(self) -> None:
        while self.tracked_count > self._max_records:
            candidates: list[tuple[float, str, str]] = []
            pending_item = next(iter(self._pending.items()), None)
            if pending_item is not None:
                candidates.append((pending_item[1].updated_at, "pending", pending_item[0]))
            completed_item = next(iter(self._completed.items()), None)
            if completed_item is not None:
                candidates.append((completed_item[1], "completed", completed_item[0]))
            alias_item = next(iter(self._aliases.items()), None)
            if alias_item is not None:
                candidates.append((alias_item[1][1], "alias", alias_item[0]))
            _, record_type, speech_id = min(candidates)
            if record_type == "pending":
                del self._pending[speech_id]
            elif record_type == "completed":
                del self._completed[speech_id]
            else:
                del self._aliases[speech_id]
