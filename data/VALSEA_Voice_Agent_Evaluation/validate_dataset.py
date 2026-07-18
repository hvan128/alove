#!/usr/bin/env python3
"""Dependency-free validator for the VALSEA voice-agent benchmark."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Mapping, Sequence


CASE_COUNT = 30
SECTION_TITLES = (
    "Scenario Metadata",
    "Customer Persona",
    "Conversation",
    "Internal State Tracking",
    "Final Workflow Output",
    "Final Ticket",
    "Evaluation Criteria",
)
TURN_COMPONENTS = (
    "Customer",
    "Expected Agent Response",
    "Expected Agent Action",
    "Expected Internal State Update",
)
COMPONENT_CODES = {
    "Customer": "turn.customer",
    "Expected Agent Response": "turn.response",
    "Expected Agent Action": "turn.action",
    "Expected Internal State Update": "turn.state_update",
}
PLACEHOLDER_RE = re.compile(
    r"^\s*(?:\.{3}|…|TODO|TBD|FIXME|PLACEHOLDER|\[PLACEHOLDER\])\s*$",
    re.IGNORECASE,
)
MOJIBAKE_RE = re.compile(r"(?:Ã|Ä|Æ|â€|ï¿½|\ufffd)")
JSON_FENCE = chr(96) * 3

TOP_LEVEL_KEYS = {
    "schema_version",
    "case_id",
    "title",
    "metadata",
    "turn_expectations",
    "final_state",
    "final_workflow_output",
}
METADATA_KEYS = {
    "scenario_type",
    "customer_region",
    "audio_conditions",
    "languages",
    "difficulty",
    "call_datetime",
    "timezone",
    "coverage_tags",
}
SCENARIO_TYPES = {
    "core_booking",
    "hotline_behavior",
    "regional_speech",
    "code_switching",
    "difficult_audio",
    "extreme",
}
DIFFICULTIES = {"easy", "medium", "hard", "extreme"}
ACTION_KEYS = {
    "intent",
    "action",
    "missing_fields",
    "arguments",
    "expected_result",
}
INTENTS = {"BOOK_TICKET", "ASK_INFORMATION", "END_CONVERSATION"}
ACTIONS = {
    "GREET_AND_DISCOVER",
    "ASK_MISSING_INFORMATION",
    "CLARIFY_AMBIGUITY",
    "ANSWER_AND_REDIRECT",
    "CAPTURE_PASSENGER_DETAILS",
    "CAPTURE_PAYMENT_PREFERENCE",
    "VERIFY_PAYMENT",
    "SEARCH_TRIPS",
    "PRESENT_TRIP_OPTIONS",
    "UPDATE_REQUIREMENTS",
    "HOLD_SEATS",
    "CONFIRM_DETAILS",
    "CONFIRM_BOOKING",
    "END_CALL",
}
TOOL_PAYLOAD_KEYS = {
    "SEARCH_TRIPS": (
        {"origin", "destination", "travel_date", "passenger_count"},
        {"trip_ids"},
    ),
    "HOLD_SEATS": (
        {"trip_id", "passenger_count", "seat_preference"},
        {"assigned_seats", "unit_fare_vnd", "total_fare_vnd"},
    ),
    "CONFIRM_BOOKING": (
        {"trip_id", "customer_name", "customer_phone"},
        {"booking_id", "booking_status"},
    ),
    "VERIFY_PAYMENT": (
        {"payment_method", "payment_reference"},
        {"payment_status", "provider_reference"},
    ),
}
STATE_FIELDS = {
    "origin",
    "destination",
    "travel_date",
    "departure_time",
    "trip_id",
    "passenger_count",
    "vehicle_type",
    "seat_preference",
    "assigned_seats",
    "pickup_location",
    "dropoff_location",
    "customer_name",
    "customer_phone",
    "passenger_details",
    "payment_method",
    "payment_status",
    "booking_id",
    "booking_status",
    "explicit_confirmation",
}
NULLABLE_STATE_FIELDS = STATE_FIELDS - {
    "assigned_seats",
    "passenger_details",
    "payment_status",
    "booking_status",
    "explicit_confirmation",
}
INITIAL_STATE: dict[str, Any] = {
    **{field: None for field in NULLABLE_STATE_FIELDS},
    "assigned_seats": [],
    "passenger_details": [],
    "payment_status": "NOT_STARTED",
    "booking_status": "COLLECTING",
    "explicit_confirmation": False,
}
CONFIRMATION_SENSITIVE_FIELDS = {
    "origin",
    "destination",
    "travel_date",
    "departure_time",
    "trip_id",
    "passenger_count",
    "vehicle_type",
    "seat_preference",
    "assigned_seats",
    "pickup_location",
    "dropoff_location",
    "customer_name",
    "customer_phone",
    "passenger_details",
    "payment_method",
}
REQUIRED_BOOKING_FIELDS = CONFIRMATION_SENSITIVE_FIELDS | {"payment_status"}
PASSENGER_TYPES = {"ADULT", "CHILD", "SENIOR"}
PAYMENT_METHODS = {"CASH_ON_BOARDING", "BANK_TRANSFER", "QR"}
PAYMENT_STATUSES = {"PENDING", "PAID"}
TICKET_PAYMENT_METHOD_LABELS = {
    "CASH_ON_BOARDING": "Tiền mặt khi lên xe",
    "BANK_TRANSFER": "Chuyển khoản ngân hàng",
    "QR": "QR",
}
TICKET_PAYMENT_STATUS_LABELS = {
    "PENDING": "Chờ thanh toán",
    "PAID": "Đã thanh toán",
}
TICKET_BOOKING_STATUS_LABELS = {"CONFIRMED": "Đã xác nhận"}
WORKFLOW_KEYS = {
    "customer",
    "passengers",
    "trip",
    "vehicle",
    "pickup_dropoff",
    "payment",
    "booking",
    "outcome",
}
REQUIRED_COVERAGE_TAGS: dict[int, set[str]] = {
    1: {"first_time_customer", "booking_confirmation"},
    2: {"family", "multiple_passengers", "seat_selection"},
    3: {"multiple_passengers", "southern"},
    4: {"vehicle_choice", "change_options", "vip"},
    5: {"seat_selection", "sold_out_recovery"},
    6: {"payment", "payment_failure_recovery"},
    7: {"change_options", "reconfirmation"},
    8: {"multiple_passengers", "pickup_change"},
    9: {"sold_out_recovery", "trip_alternative"},
    10: {"identity_correction", "phone_correction"},
    11: {"identity_check", "vague_request"},
    12: {"vague_request", "date_clarification"},
    13: {"storytelling", "context_memory"},
    14: {"changed_mind", "change_options"},
    15: {"unrelated_question", "answer_and_redirect"},
    16: {"northern", "regional_language"},
    17: {"nghe_an", "regional_language"},
    18: {"ha_tinh", "regional_language"},
    19: {"southern", "regional_language"},
    20: {"central", "regional_language"},
    21: {"code_switch", "booking_confirmation"},
    22: {"code_switch", "upgrade", "seat_selection"},
    23: {"code_switch", "date_clarification"},
    24: {"code_switch", "multilingual_bonus"},
    25: {"telephone", "clipping", "repair"},
    26: {"background_noise", "bus_station", "overlap"},
    27: {"field_recording", "packet_loss", "repair"},
    28: {"regional_language", "code_switch", "telephone", "changed_mind"},
    29: {"regional_language", "bus_station", "multiple_passengers", "changed_mind"},
    30: {"multilingual_bonus", "code_switch", "background_noise", "changed_mind"},
}
REGIONAL_TERMS = {"mô", "răng", "rứa", "ni", "vô", "chi"}
CODE_SWITCH_TERMS = {
    "book",
    "ticket",
    "schedule",
    "pickup",
    "confirm",
    "upgrade",
    "vip cabin",
}
DOMAIN_TERMS = {
    "vé",
    "chuyến",
    "giường nằm",
    "phòng vip",
    "ghế tầng dưới",
    "điểm đón",
    "điểm trả",
    "giữ chỗ",
    "mã vé",
    "trung chuyển",
    "hành lý",
    "bến xe",
}


class DataReadError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class DuplicateKeyError(ValueError):
    pass


@dataclass(frozen=True, order=True)
class Issue:
    path: str
    line: int
    code: str
    severity: str
    message: str


@dataclass(frozen=True)
class ValidationReport:
    issues: tuple[Issue, ...] = ()
    case_count: int = 0
    turn_count: int = 0

    def __post_init__(self) -> None:
        ordered = tuple(
            sorted(self.issues, key=lambda issue: (issue.path, issue.line, issue.code, issue.message))
        )
        object.__setattr__(self, "issues", ordered)

    @property
    def errors(self) -> tuple[Issue, ...]:
        return tuple(issue for issue in self.issues if issue.severity == "error")

    @property
    def warnings(self) -> tuple[Issue, ...]:
        return tuple(issue for issue in self.issues if issue.severity == "warning")

    @property
    def ok(self) -> bool:
        return not self.errors


@dataclass(frozen=True)
class Turn:
    number: int
    line: int
    customer: str
    response: str
    action: Mapping[str, Any]
    state_update: Mapping[str, Any]


@dataclass(frozen=True)
class ParsedCase:
    path: Path
    case_id: str
    title: str
    turns: tuple[Turn, ...]
    final_state: Mapping[str, Any]
    final_workflow_output: Mapping[str, Any]
    ticket_text: str
    evaluation_criteria: str

    @property
    def customer_text(self) -> str:
        return "\n".join(turn.customer for turn in self.turns)


class _Collector:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root.resolve() if root is not None else None
        self.issues: list[Issue] = []

    def _path(self, path: Path | str) -> str:
        value = Path(path)
        if self.root is not None:
            try:
                return value.resolve().relative_to(self.root).as_posix()
            except ValueError:
                pass
        return value.as_posix()

    def add(
        self,
        path: Path | str,
        code: str,
        message: str,
        *,
        line: int = 0,
        severity: str = "error",
    ) -> None:
        self.issues.append(
            Issue(self._path(path), max(line, 0), code, severity, message)
        )

    def report(self, case_count: int = 0, turn_count: int = 0) -> ValidationReport:
        return ValidationReport(tuple(self.issues), case_count, turn_count)


def read_text_strict(path: Path | str) -> str:
    source = Path(path)
    try:
        raw = source.read_bytes()
    except OSError as exc:
        raise DataReadError("file.read", str(exc)) from exc
    try:
        text = raw.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError as exc:
        raise DataReadError("encoding.invalid_utf8", str(exc)) from exc
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = unicodedata.normalize("NFC", text)
    if "\ufffd" in text:
        raise DataReadError(
            "encoding.replacement_character",
            "replacement character U+FFFD is forbidden",
        )
    marker = MOJIBAKE_RE.search(text)
    if marker:
        raise DataReadError(
            "encoding.mojibake",
            f"common mojibake marker {marker.group(0)!r} is forbidden",
        )
    return text


def _object_without_duplicate_keys(pairs: Sequence[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate object key: {key}")
        result[key] = value
    return result


def _reject_nonfinite(value: str) -> None:
    raise DataReadError("json.nonfinite", f"non-finite JSON number is forbidden: {value}")


def loads_json_strict(text: str) -> Any:
    try:
        return json.loads(
            text,
            object_pairs_hook=_object_without_duplicate_keys,
            parse_constant=_reject_nonfinite,
        )
    except DuplicateKeyError:
        raise
    except DataReadError:
        raise
    except (json.JSONDecodeError, ValueError) as exc:
        raise DataReadError("json.invalid", str(exc)) from exc


def load_json_strict(path: Path | str) -> Any:
    return loads_json_strict(read_text_strict(path))


def _outside_fence_lines(lines: Sequence[str]) -> list[tuple[int, str]]:
    outside: list[tuple[int, str]] = []
    fence: str | None = None
    for index, line in enumerate(lines):
        stripped = line.lstrip()
        marker = None
        if stripped.startswith(JSON_FENCE):
            marker = JSON_FENCE
        elif stripped.startswith("~~~"):
            marker = "~~~"
        if marker is not None:
            if fence is None:
                fence = marker
            elif fence == marker:
                fence = None
            continue
        if fence is None:
            outside.append((index, line))
    return outside


def _parse_json_fence(
    lines: Sequence[str],
    path: Path,
    collector: _Collector,
    *,
    line_offset: int,
    cardinality_code: str,
) -> Mapping[str, Any]:
    fence_re = re.compile(r"^\s*" + re.escape(JSON_FENCE) + r"json\s*$")
    close_re = re.compile(r"^\s*" + re.escape(JSON_FENCE) + r"\s*$")
    starts = [index for index, line in enumerate(lines) if fence_re.match(line)]
    if len(starts) != 1:
        collector.add(
            path,
            cardinality_code,
            "expected exactly one JSON fenced object",
            line=line_offset + 1,
        )
        return {}
    start = starts[0]
    ends = [
        index
        for index in range(start + 1, len(lines))
        if close_re.match(lines[index])
    ]
    if not ends:
        collector.add(
            path,
            "json.invalid",
            "unterminated JSON fence",
            line=line_offset + start + 1,
        )
        return {}
    end = ends[0]
    if any(line.strip() for line in lines[:start]) or any(
        line.strip() for line in lines[end + 1 :]
    ):
        collector.add(
            path,
            cardinality_code,
            "JSON component must contain only one fenced object",
            line=line_offset + 1,
        )
    try:
        value = loads_json_strict("\n".join(lines[start + 1 : end]))
    except DuplicateKeyError as exc:
        collector.add(
            path,
            "json.duplicate_key",
            str(exc),
            line=line_offset + start + 2,
        )
        return {}
    except DataReadError as exc:
        collector.add(
            path,
            exc.code,
            str(exc),
            line=line_offset + start + 2,
        )
        return {}
    if not isinstance(value, dict):
        collector.add(
            path,
            "json.object_required",
            "expected a JSON object",
            line=line_offset + start + 2,
        )
        return {}
    return value


def _numbered_sections(
    lines: Sequence[str], path: Path, collector: _Collector
) -> dict[int, int]:
    occurrences: dict[int, list[tuple[int, str]]] = {
        number: [] for number in range(1, 8)
    }
    for index, line in _outside_fence_lines(lines):
        match = re.match(r"^##\s+([1-7])\.\s+(.+?)\s*$", line)
        if match:
            occurrences[int(match.group(1))].append((index, match.group(2)))
    positions: dict[int, int] = {}
    for number, expected_title in enumerate(SECTION_TITLES, start=1):
        found = occurrences[number]
        if not found:
            collector.add(
                path,
                "markdown.section_missing",
                f"missing section {number}. {expected_title}",
            )
            continue
        positions[number] = found[0][0]
        if len(found) > 1:
            collector.add(
                path,
                "markdown.section_duplicate",
                f"section {number} appears {len(found)} times",
                line=found[1][0] + 1,
            )
        if found[0][1] != expected_title:
            collector.add(
                path,
                "markdown.section_title",
                f"section {number} must be titled {expected_title!r}",
                line=found[0][0] + 1,
            )
    ordered = [positions[number] for number in range(1, 8) if number in positions]
    if ordered != sorted(ordered):
        collector.add(
            path,
            "markdown.section_order",
            "numbered sections are out of order",
        )
    return positions


def _section_content(
    lines: Sequence[str], positions: Mapping[int, int], number: int
) -> tuple[list[str], int]:
    if number not in positions:
        return [], 0
    start = positions[number] + 1
    later = [
        position for section, position in positions.items() if section > number
    ]
    end = min(later) if later else len(lines)
    return list(lines[start:end]), start


def _parse_turns(
    lines: Sequence[str],
    path: Path,
    collector: _Collector,
    *,
    line_offset: int,
) -> tuple[Turn, ...]:
    headings: list[tuple[int, int]] = []
    for index, line in _outside_fence_lines(lines):
        match = re.match(r"^##\s+Turn\s+(\d+)\s*$", line)
        if match:
            headings.append((index, int(match.group(1))))
    numbers = [number for _, number in headings]
    if numbers != list(range(1, len(numbers) + 1)):
        collector.add(
            path,
            "turn.noncontiguous",
            f"turn numbers must be contiguous from 1; found {numbers}",
            line=line_offset + 1,
        )
    if len(headings) < 15:
        collector.add(
            path,
            "turn.count",
            f"expected at least 15 turns, found {len(headings)}",
            line=line_offset + 1,
        )
    turns: list[Turn] = []
    for heading_index, (start, number) in enumerate(headings):
        end = (
            headings[heading_index + 1][0]
            if heading_index + 1 < len(headings)
            else len(lines)
        )
        block = list(lines[start + 1 : end])
        found: dict[str, list[int]] = {name: [] for name in TURN_COMPONENTS}
        for index, line in _outside_fence_lines(block):
            match = re.match(r"^###\s+(.+?)\s*$", line)
            if match and match.group(1) in found:
                found[match.group(1)].append(index)
        positions: dict[str, int] = {}
        for name in TURN_COMPONENTS:
            occurrences = found[name]
            if not occurrences:
                collector.add(
                    path,
                    COMPONENT_CODES[name],
                    f"turn {number} is missing {name}",
                    line=line_offset + start + 1,
                )
                continue
            positions[name] = occurrences[0]
            if len(occurrences) > 1:
                collector.add(
                    path,
                    COMPONENT_CODES[name],
                    f"turn {number} has duplicate {name} headings",
                    line=line_offset + start + occurrences[1] + 2,
                )
        ordered = [positions[name] for name in TURN_COMPONENTS if name in positions]
        if ordered != sorted(ordered):
            collector.add(
                path,
                "turn.component_order",
                f"turn {number} components are out of order",
                line=line_offset + start + 1,
            )

        def content(name: str) -> tuple[list[str], int]:
            if name not in positions:
                return [], line_offset + start + 1
            position = positions[name]
            later = [value for value in positions.values() if value > position]
            component_end = min(later) if later else len(block)
            return (
                block[position + 1 : component_end],
                line_offset + start + position + 2,
            )

        customer_lines, customer_line = content("Customer")
        response_lines, response_line = content("Expected Agent Response")
        customer = "\n".join(customer_lines).strip()
        response = "\n".join(response_lines).strip()
        for value, code, value_line, present in (
            (customer, "turn.customer", customer_line, "Customer" in positions),
            (
                response,
                "turn.response",
                response_line,
                "Expected Agent Response" in positions,
            ),
        ):
            if present and not value:
                collector.add(
                    path, code, f"turn {number} content is empty", line=value_line
                )
            elif value and PLACEHOLDER_RE.fullmatch(value):
                collector.add(
                    path,
                    "turn.placeholder",
                    f"turn {number} uses a placeholder",
                    line=value_line,
                )
        if customer and "**" in customer:
            collector.add(
                path,
                "turn.customer_markup",
                f"turn {number} customer text contains Markdown emphasis",
                line=customer_line,
            )
        action_lines, action_line = content("Expected Agent Action")
        update_lines, update_line = content("Expected Internal State Update")
        action = (
            _parse_json_fence(
                action_lines,
                path,
                collector,
                line_offset=action_line - 1,
                cardinality_code="turn.action",
            )
            if "Expected Agent Action" in positions
            else {}
        )
        state_update = (
            _parse_json_fence(
                update_lines,
                path,
                collector,
                line_offset=update_line - 1,
                cardinality_code="turn.state_update",
            )
            if "Expected Internal State Update" in positions
            else {}
        )
        turns.append(
            Turn(
                number,
                line_offset + start + 1,
                customer,
                response,
                action,
                state_update,
            )
        )
    return tuple(turns)


def parse_case(path: Path | str) -> tuple[ParsedCase | None, tuple[Issue, ...]]:
    source = Path(path)
    collector = _Collector()
    try:
        text = read_text_strict(source)
    except DataReadError as exc:
        collector.add(source, exc.code, str(exc))
        return None, collector.report().issues
    lines = text.split("\n")
    title_match = None
    for _, line in _outside_fence_lines(lines):
        match = re.match(r"^#\s+(CASE_\d{3})\s+[—-]\s+(.+?)\s*$", line)
        if match:
            title_match = match
            break
    if title_match is None:
        collector.add(
            source, "markdown.case_title", "missing canonical CASE_XXX title"
        )
        case_id, title = source.stem, ""
    else:
        case_id, title = title_match.group(1), title_match.group(2)
    sections = _numbered_sections(lines, source, collector)
    conversation, conversation_offset = _section_content(lines, sections, 3)
    turns = _parse_turns(
        conversation,
        source,
        collector,
        line_offset=conversation_offset,
    )
    state_lines, state_offset = _section_content(lines, sections, 4)
    workflow_lines, workflow_offset = _section_content(lines, sections, 5)
    ticket_lines, _ = _section_content(lines, sections, 6)
    criteria_lines, criteria_offset = _section_content(lines, sections, 7)
    final_state = _parse_json_fence(
        state_lines,
        source,
        collector,
        line_offset=state_offset,
        cardinality_code="case.final_state",
    )
    workflow = _parse_json_fence(
        workflow_lines,
        source,
        collector,
        line_offset=workflow_offset,
        cardinality_code="case.final_workflow",
    )
    ticket = "\n".join(ticket_lines).strip()
    criteria = "\n".join(criteria_lines).strip()
    if not ticket or PLACEHOLDER_RE.fullmatch(ticket):
        collector.add(
            source, "case.final_ticket", "final ticket is empty or a placeholder"
        )
    if not criteria or PLACEHOLDER_RE.fullmatch(criteria):
        collector.add(
            source,
            "case.evaluation_criteria",
            "evaluation criteria are empty or a placeholder",
            line=criteria_offset + 1,
        )
    parsed = ParsedCase(
        source,
        case_id,
        title,
        turns,
        final_state,
        workflow,
        ticket,
        criteria,
    )
    return parsed, collector.report().issues


def _check_exact_keys(
    value: Any,
    required: set[str],
    path: Path,
    collector: _Collector,
    context: str,
) -> bool:
    if not isinstance(value, dict):
        collector.add(path, "schema.type", f"{context} must be an object")
        return False
    missing = sorted(required - set(value))
    unknown = sorted(set(value) - required)
    for key in missing:
        collector.add(
            path,
            "schema.required_key",
            f"{context} is missing required key {key!r}",
        )
    for key in unknown:
        collector.add(
            path,
            "schema.unknown_key",
            f"{context} contains unknown key {key!r}",
        )
    return not missing


def _valid_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def _valid_time(value: Any) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r"\d{2}:\d{2}", value):
        return False
    hours, minutes = (int(part) for part in value.split(":"))
    return hours < 24 and minutes < 60


def _valid_phone(value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch(r"0\d{9}", value) is not None


def _nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _safe_string_set(
    value: Any, *, allow_empty: bool = False
) -> set[str] | None:
    if not isinstance(value, list) or (not allow_empty and not value):
        return None
    if any(not _nonempty_string(item) for item in value):
        return None
    return set(value)


def _validate_string_list(
    value: Any,
    path: Path,
    collector: _Collector,
    context: str,
    *,
    allow_empty: bool = False,
) -> bool:
    string_set = _safe_string_set(value, allow_empty=allow_empty)
    valid = string_set is not None and len(value) == len(string_set)
    if not valid:
        collector.add(
            path,
            "schema.type",
            f"{context} must be a {'possibly empty ' if allow_empty else 'non-empty '}list of unique strings",
        )
    return valid


def _validate_metadata(
    metadata: Any, path: Path, collector: _Collector
) -> None:
    if not _check_exact_keys(metadata, METADATA_KEYS, path, collector, "metadata"):
        return
    if metadata.get("scenario_type") not in SCENARIO_TYPES:
        collector.add(path, "schema.enum", "metadata.scenario_type is invalid")
    if metadata.get("difficulty") not in DIFFICULTIES:
        collector.add(path, "schema.enum", "metadata.difficulty is invalid")
    if metadata.get("timezone") != "Asia/Ho_Chi_Minh":
        collector.add(
            path,
            "schema.enum",
            "metadata.timezone must be Asia/Ho_Chi_Minh",
        )
    if not _nonempty_string(metadata.get("customer_region")):
        collector.add(
            path, "schema.type", "metadata.customer_region must be non-empty"
        )
    for field in ("audio_conditions", "languages", "coverage_tags"):
        _validate_string_list(
            metadata.get(field), path, collector, f"metadata.{field}"
        )
    call_datetime = metadata.get("call_datetime")
    try:
        parsed_datetime = datetime.fromisoformat(call_datetime)
        valid_datetime = (
            isinstance(call_datetime, str)
            and parsed_datetime.tzinfo is not None
            and parsed_datetime.utcoffset() is not None
        )
    except (TypeError, ValueError):
        valid_datetime = False
    if not valid_datetime:
        collector.add(
            path,
            "schema.format",
            "metadata.call_datetime must be an offset-aware ISO datetime",
        )


def _validate_passenger_detail(
    value: Any, path: Path, collector: _Collector, context: str
) -> None:
    if not _check_exact_keys(
        value, {"name", "type", "seat"}, path, collector, context
    ):
        return
    if not _nonempty_string(value.get("name")) or not _nonempty_string(
        value.get("seat")
    ):
        collector.add(
            path,
            "schema.type",
            f"{context}.name and .seat must be non-empty strings",
        )
    if value.get("type") not in PASSENGER_TYPES:
        collector.add(path, "schema.enum", f"{context}.type is invalid")


def _validate_action(
    action: Any,
    path: Path,
    collector: _Collector,
    context: str,
) -> None:
    if not _check_exact_keys(action, ACTION_KEYS, path, collector, context):
        return
    if action.get("intent") not in INTENTS:
        collector.add(path, "schema.enum", f"{context}.intent is invalid")
    action_name = action.get("action")
    if action_name not in ACTIONS:
        collector.add(path, "action.unknown", f"{context}.action is invalid")
    missing_fields = action.get("missing_fields")
    if not isinstance(missing_fields, list) or not all(
        isinstance(field, str) for field in missing_fields
    ):
        collector.add(
            path,
            "action.payload",
            f"{context}.missing_fields must contain only strings",
        )
    elif len(missing_fields) != len(set(missing_fields)):
        collector.add(
            path,
            "action.payload",
            f"{context}.missing_fields must be a unique list",
        )
    elif any(field not in STATE_FIELDS for field in missing_fields):
        collector.add(
            path,
            "action.payload",
            f"{context}.missing_fields contains an unknown state field",
        )
    arguments = action.get("arguments")
    result = action.get("expected_result")
    if not isinstance(arguments, dict) or not isinstance(result, dict):
        collector.add(
            path,
            "action.payload",
            f"{context}.arguments and expected_result must be objects",
        )
        return
    if action_name in TOOL_PAYLOAD_KEYS:
        expected_arguments, expected_result = TOOL_PAYLOAD_KEYS[action_name]
        if set(arguments) != expected_arguments or set(result) != expected_result:
            collector.add(
                path,
                "action.payload",
                f"{context} has an invalid {action_name} payload shape",
            )
        if action_name == "SEARCH_TRIPS":
            trip_ids = result.get("trip_ids")
            trip_id_set = _safe_string_set(trip_ids)
            if trip_id_set is None or len(trip_ids) != len(trip_id_set):
                collector.add(
                    path,
                    "action.payload",
                    f"{context}.expected_result.trip_ids must be unique strings",
                )
        elif action_name == "HOLD_SEATS":
            assigned_seats = result.get("assigned_seats")
            assigned_set = _safe_string_set(assigned_seats)
            if assigned_set is None or len(assigned_seats) != len(assigned_set):
                collector.add(
                    path,
                    "action.payload",
                    f"{context}.expected_result.assigned_seats must be unique strings",
                )
        elif action_name == "VERIFY_PAYMENT":
            if arguments.get("payment_method") not in PAYMENT_METHODS:
                collector.add(
                    path,
                    "action.payload",
                    f"{context}.arguments.payment_method is invalid",
                )
            if not _nonempty_string(arguments.get("payment_reference")):
                collector.add(
                    path,
                    "action.payload",
                    f"{context}.arguments.payment_reference must be non-empty",
                )
            if result.get("payment_status") != "PAID":
                collector.add(
                    path,
                    "action.payload",
                    f"{context}.expected_result.payment_status must be PAID",
                )
            if not _nonempty_string(result.get("provider_reference")):
                collector.add(
                    path,
                    "action.payload",
                    f"{context}.expected_result.provider_reference must be non-empty",
                )
    elif arguments or result:
        collector.add(
            path,
            "action.payload",
            f"{context} non-tool actions require empty payload objects",
        )


def _validate_state_value(
    field: str,
    value: Any,
    path: Path,
    collector: _Collector,
    context: str,
) -> None:
    if field == "customer_phone" and value is not None and not _valid_phone(value):
        collector.add(path, "schema.format", f"{context} is not a Vietnamese phone")
    elif field == "travel_date" and value is not None and not _valid_date(value):
        collector.add(path, "schema.format", f"{context} is not an ISO date")
    elif field == "departure_time" and value is not None and not _valid_time(value):
        collector.add(path, "schema.format", f"{context} is not HH:MM")
    elif field == "passenger_count" and value is not None and (
        not isinstance(value, int) or isinstance(value, bool) or value < 1
    ):
        collector.add(path, "schema.type", f"{context} must be a positive integer")
    elif field in {"assigned_seats", "passenger_details"} and not isinstance(
        value, list
    ):
        collector.add(path, "schema.type", f"{context} must be an array")
    elif field == "payment_method" and value is not None and value not in PAYMENT_METHODS:
        collector.add(path, "schema.enum", f"{context} is invalid")
    elif field == "payment_status" and value not in {
        "NOT_STARTED",
        *PAYMENT_STATUSES,
    }:
        collector.add(path, "schema.enum", f"{context} is invalid")
    elif field == "booking_status" and value not in {"COLLECTING", "CONFIRMED"}:
        collector.add(path, "schema.enum", f"{context} is invalid")
    elif field == "explicit_confirmation" and not isinstance(value, bool):
        collector.add(path, "schema.type", f"{context} must be boolean")
    elif field in NULLABLE_STATE_FIELDS - {
        "passenger_count",
        "travel_date",
        "departure_time",
        "customer_phone",
        "payment_method",
    } and value is not None and not _nonempty_string(value):
        collector.add(path, "schema.type", f"{context} must be a non-empty string")
    if field == "passenger_details" and isinstance(value, list):
        for index, detail in enumerate(value):
            _validate_passenger_detail(
                detail, path, collector, f"{context}[{index}]"
            )
    if field == "assigned_seats" and isinstance(value, list):
        _validate_string_list(
            value, path, collector, context, allow_empty=True
        )


def _validate_state_patch(
    patch: Any,
    path: Path,
    collector: _Collector,
    context: str,
) -> bool:
    if not _check_exact_keys(patch, {"set", "clear"}, path, collector, context):
        return False
    set_values, clear_fields = patch.get("set"), patch.get("clear")
    if not isinstance(set_values, dict) or not isinstance(clear_fields, list):
        collector.add(
            path,
            "schema.type",
            f"{context}.set must be an object and clear must be an array",
        )
        return False
    clear_fields_valid = all(isinstance(field, str) for field in clear_fields)
    if not clear_fields_valid:
        collector.add(
            path,
            "schema.type",
            f"{context}.clear must contain only state-field strings",
        )
    clear_names = clear_fields if clear_fields_valid else []
    unknown = (set(set_values) | set(clear_names)) - STATE_FIELDS
    if unknown:
        collector.add(
            path,
            "state.field_unknown",
            f"{context} contains unknown fields {sorted(unknown)}",
        )
    if len(clear_names) != len(set(clear_names)):
        collector.add(
            path,
            "state.patch_conflict",
            f"{context}.clear contains duplicates",
        )
    overlap = set(set_values) & set(clear_names)
    if overlap:
        collector.add(
            path,
            "state.patch_conflict",
            f"{context} sets and clears {sorted(overlap)}",
        )
    for field, value in set_values.items():
        if field in STATE_FIELDS:
            _validate_state_value(
                field, value, path, collector, f"{context}.set.{field}"
            )
    return clear_fields_valid and not unknown and not overlap


def _validate_workflow(
    workflow: Any, case_id: str, path: Path, collector: _Collector
) -> None:
    if not _check_exact_keys(
        workflow, WORKFLOW_KEYS, path, collector, "final_workflow_output"
    ):
        return
    nested_keys = {
        "customer": {"name", "phone"},
        "passengers": {"count", "details"},
        "trip": {
            "trip_id",
            "origin",
            "destination",
            "travel_date",
            "departure_time",
            "arrival_time",
        },
        "vehicle": {"type", "seat_preference", "assigned_seats"},
        "pickup_dropoff": {"pickup_location", "dropoff_location"},
        "payment": {"method", "status", "unit_fare_vnd", "total_fare_vnd"},
        "booking": {"booking_id", "booking_status"},
        "outcome": {"completed_goal", "confirmation_turn"},
    }
    if not all(
        _check_exact_keys(
            workflow.get(section),
            keys,
            path,
            collector,
            f"final_workflow_output.{section}",
        )
        for section, keys in nested_keys.items()
    ):
        return
    customer = workflow["customer"]
    passengers = workflow["passengers"]
    trip = workflow["trip"]
    vehicle = workflow["vehicle"]
    pickup = workflow["pickup_dropoff"]
    payment = workflow["payment"]
    booking = workflow["booking"]
    outcome = workflow["outcome"]
    if not _nonempty_string(customer.get("name")):
        collector.add(path, "schema.type", "customer.name must be non-empty")
    if not _valid_phone(customer.get("phone")):
        collector.add(path, "schema.format", "customer.phone is invalid")
    if not isinstance(passengers.get("count"), int) or isinstance(
        passengers.get("count"), bool
    ) or passengers.get("count", 0) < 1:
        collector.add(path, "schema.type", "passengers.count must be positive")
    details = passengers.get("details")
    if not isinstance(details, list):
        collector.add(path, "schema.type", "passengers.details must be an array")
        details = []
    for index, detail in enumerate(details):
        _validate_passenger_detail(
            detail, path, collector, f"passengers.details[{index}]"
        )
    for field in ("trip_id", "origin", "destination"):
        if not _nonempty_string(trip.get(field)):
            collector.add(path, "schema.type", f"trip.{field} must be non-empty")
    if not _valid_date(trip.get("travel_date")):
        collector.add(path, "schema.format", "trip.travel_date is invalid")
    for field in ("departure_time", "arrival_time"):
        if not _valid_time(trip.get(field)):
            collector.add(path, "schema.format", f"trip.{field} is invalid")
    for field in ("type", "seat_preference"):
        if not _nonempty_string(vehicle.get(field)):
            collector.add(path, "schema.type", f"vehicle.{field} must be non-empty")
    assigned = vehicle.get("assigned_seats")
    if not isinstance(assigned, list):
        collector.add(path, "schema.type", "vehicle.assigned_seats must be an array")
        assigned = []
    else:
        _validate_string_list(
            assigned, path, collector, "vehicle.assigned_seats"
        )
    for field in ("pickup_location", "dropoff_location"):
        if not _nonempty_string(pickup.get(field)):
            collector.add(
                path, "schema.type", f"pickup_dropoff.{field} must be non-empty"
            )
    if payment.get("method") not in PAYMENT_METHODS:
        collector.add(path, "schema.enum", "payment.method is invalid")
    if payment.get("status") not in PAYMENT_STATUSES:
        collector.add(path, "schema.enum", "payment.status is invalid")
    for field in ("unit_fare_vnd", "total_fare_vnd"):
        if not isinstance(payment.get(field), int) or isinstance(
            payment.get(field), bool
        ) or payment.get(field, 0) <= 0:
            collector.add(path, "schema.type", f"payment.{field} must be positive")
    booking_id = booking.get("booking_id")
    if not isinstance(booking_id, str):
        collector.add(path, "schema.type", "booking.booking_id must be a string")
    elif booking_id != f"VA-{case_id}":
        collector.add(
            path,
            "schema.format",
            f"booking.booking_id must be VA-{case_id}",
        )
    if booking.get("booking_status") != "CONFIRMED":
        collector.add(path, "schema.enum", "booking.booking_status must be CONFIRMED")
    if outcome.get("completed_goal") is not True:
        collector.add(path, "schema.enum", "outcome.completed_goal must be true")
    if not isinstance(outcome.get("confirmation_turn"), int) or isinstance(
        outcome.get("confirmation_turn"), bool
    ):
        collector.add(
            path, "schema.type", "outcome.confirmation_turn must be an integer"
        )
    count = passengers.get("count")
    if isinstance(count, int) and len(details) != count:
        collector.add(
            path,
            "workflow.passenger_count",
            "passenger count does not equal passenger-detail count",
        )
    if isinstance(count, int) and len(assigned) != count:
        collector.add(
            path,
            "workflow.seat_count",
            "passenger count does not equal assigned-seat count",
        )
    passenger_seats = [
        detail.get("seat") for detail in details if isinstance(detail, dict)
    ]
    if passenger_seats != assigned:
        collector.add(
            path,
            "workflow.passenger_seat",
            "passenger seats do not equal assigned seats",
        )
    unit_fare = payment.get("unit_fare_vnd")
    total_fare = payment.get("total_fare_vnd")
    if (
        isinstance(count, int)
        and isinstance(unit_fare, int)
        and total_fare != unit_fare * count
    ):
        collector.add(
            path,
            "workflow.fare",
            "total fare must equal unit fare times passenger count",
        )


def _validate_expected_schema(
    expected: Mapping[str, Any],
    case_id: str,
    path: Path,
    collector: _Collector,
) -> None:
    if not _check_exact_keys(
        expected, TOP_LEVEL_KEYS, path, collector, "expected output"
    ):
        return
    if expected.get("schema_version") != "1.0":
        collector.add(path, "schema.enum", "schema_version must be 1.0")
    if expected.get("case_id") != case_id:
        collector.add(path, "case.id", f"case_id must equal {case_id}")
    if not _nonempty_string(expected.get("title")):
        collector.add(path, "schema.type", "title must be non-empty")
    _validate_metadata(expected.get("metadata"), path, collector)
    expectations = expected.get("turn_expectations")
    if not isinstance(expectations, list):
        collector.add(
            path, "schema.type", "turn_expectations must be an array"
        )
        expectations = []
    numbers: list[Any] = []
    for index, item in enumerate(expectations):
        context = f"turn_expectations[{index}]"
        if not _check_exact_keys(
            item, {"turn", "action", "state_update"}, path, collector, context
        ):
            continue
        numbers.append(item.get("turn"))
        _validate_action(item.get("action"), path, collector, f"{context}.action")
        _validate_state_patch(
            item.get("state_update"),
            path,
            collector,
            f"{context}.state_update",
        )
    if numbers != list(range(1, len(expectations) + 1)):
        collector.add(
            path,
            "turn.noncontiguous",
            "JSON turn expectations must be contiguous from 1",
        )
    confirm_booking_count = sum(
        1
        for item in expectations
        if isinstance(item, dict)
        and isinstance(item.get("action"), dict)
        and item["action"].get("action") == "CONFIRM_BOOKING"
    )
    if confirm_booking_count != 1:
        collector.add(
            path,
            "action.confirm_booking_cardinality",
            f"expected exactly one CONFIRM_BOOKING action, found {confirm_booking_count}",
        )
    final_state = expected.get("final_state")
    if _check_exact_keys(
        final_state, STATE_FIELDS, path, collector, "final_state"
    ):
        for field, value in final_state.items():
            _validate_state_value(
                field, value, path, collector, f"final_state.{field}"
            )
    _validate_workflow(
        expected.get("final_workflow_output"), case_id, path, collector
    )


def _missing_booking_fields(state: Mapping[str, Any]) -> list[str]:
    missing: list[str] = []
    for field in sorted(REQUIRED_BOOKING_FIELDS):
        value = state.get(field)
        if value is None or value == [] or value == "":
            missing.append(field)
        elif field == "payment_status" and value not in PAYMENT_STATUSES:
            missing.append(field)
    return missing


def _replay_state(
    expectations: Sequence[Any],
    case_id: str,
    path: Path,
    collector: _Collector,
) -> tuple[dict[str, Any], int | None, tuple[int, ...]]:
    state = deepcopy(INITIAL_STATE)
    confirmation_transitions: list[int] = []
    booking_turns: list[int] = []
    for index, item in enumerate(expectations, start=1):
        if not isinstance(item, dict):
            continue
        turn_number = item.get("turn")
        if not isinstance(turn_number, int):
            turn_number = index
        action = item.get("action")
        patch = item.get("state_update")
        if not isinstance(action, dict) or not isinstance(patch, dict):
            continue
        action_name = action.get("action")
        if action_name == "CONFIRM_BOOKING":
            booking_turns.append(turn_number)
            missing = _missing_booking_fields(state)
            if not state.get("explicit_confirmation") or not confirmation_transitions:
                collector.add(
                    path,
                    "state.booking_before_confirmation",
                    f"turn {turn_number} books before an earlier explicit confirmation",
                )
            if missing:
                collector.add(
                    path,
                    "state.booking_missing_fields",
                    f"turn {turn_number} books with missing fields {missing}",
                )
            arguments = action.get("arguments", {})
            expected_arguments = {
                "trip_id": state.get("trip_id"),
                "customer_name": state.get("customer_name"),
                "customer_phone": state.get("customer_phone"),
            }
            if arguments != expected_arguments:
                collector.add(
                    path,
                    "action.binding",
                    f"turn {turn_number} CONFIRM_BOOKING arguments do not match pre-action state",
                )
            result = action.get("expected_result", {})
            if isinstance(result, dict) and (
                result.get("booking_id") != f"VA-{case_id}"
                or result.get("booking_status") != "CONFIRMED"
            ):
                collector.add(
                    path,
                    "action.payload",
                    f"turn {turn_number} CONFIRM_BOOKING result is not deterministic",
                )
                collector.add(
                    path,
                    "action.binding",
                    f"turn {turn_number} CONFIRM_BOOKING result does not match the case booking contract",
                )
        set_values = patch.get("set", {})
        clear_fields = patch.get("clear", [])
        if not isinstance(set_values, dict) or not isinstance(clear_fields, list):
            continue
        result = action.get("expected_result", {})
        arguments = action.get("arguments", {})
        if set_values.get("payment_status") == "PAID":
            effective_method = set_values.get(
                "payment_method", state.get("payment_method")
            )
            verified = (
                action_name == "VERIFY_PAYMENT"
                and isinstance(arguments, dict)
                and arguments.get("payment_method") == effective_method
                and isinstance(result, dict)
                and result.get("payment_status") == "PAID"
                and _nonempty_string(result.get("provider_reference"))
            )
            if not verified:
                collector.add(
                    path,
                    "payment.evidence",
                    f"turn {turn_number} marks payment PAID without verified evidence",
                )
        elif action_name == "VERIFY_PAYMENT":
            collector.add(
                path,
                "payment.evidence",
                f"turn {turn_number} verifies payment without setting payment_status PAID",
            )
        clear_names = [field for field in clear_fields if isinstance(field, str)]
        before_confirmation = state.get("explicit_confirmation") is True
        touched_sensitive = (
            set(set_values) | set(clear_names)
        ) & CONFIRMATION_SENSITIVE_FIELDS
        next_confirmation = state.get("explicit_confirmation")
        if "explicit_confirmation" in set_values:
            next_confirmation = set_values["explicit_confirmation"]
        if "explicit_confirmation" in clear_names:
            next_confirmation = INITIAL_STATE["explicit_confirmation"]
        if before_confirmation and touched_sensitive and next_confirmation is True:
            collector.add(
                path,
                "state.stale_confirmation",
                f"turn {turn_number} changes confirmed requirements without clearing confirmation",
            )
        before = state.get("explicit_confirmation") is True
        for field, value in set_values.items():
            if field in STATE_FIELDS:
                state[field] = deepcopy(value)
        for field in clear_names:
            if field in STATE_FIELDS:
                state[field] = deepcopy(INITIAL_STATE[field])
        after = state.get("explicit_confirmation") is True
        if not before and after:
            missing = _missing_booking_fields(state)
            if missing:
                collector.add(
                    path,
                    "state.confirmation_missing_fields",
                    f"turn {turn_number} confirms before fields {missing} are complete",
                )
            confirmation_transitions.append(turn_number)
    confirmation_turn = None
    if booking_turns:
        last_booking = booking_turns[-1]
        eligible = [turn for turn in confirmation_transitions if turn < last_booking]
        if eligible:
            confirmation_turn = eligible[-1]
    return state, confirmation_turn, tuple(booking_turns)


def _project_state_to_workflow(
    state: Mapping[str, Any],
    workflow: Mapping[str, Any],
    path: Path,
    collector: _Collector,
) -> None:
    if not WORKFLOW_KEYS.issubset(workflow):
        return
    projection = {
        ("customer", "name"): "customer_name",
        ("customer", "phone"): "customer_phone",
        ("passengers", "count"): "passenger_count",
        ("passengers", "details"): "passenger_details",
        ("trip", "trip_id"): "trip_id",
        ("trip", "origin"): "origin",
        ("trip", "destination"): "destination",
        ("trip", "travel_date"): "travel_date",
        ("trip", "departure_time"): "departure_time",
        ("vehicle", "type"): "vehicle_type",
        ("vehicle", "seat_preference"): "seat_preference",
        ("vehicle", "assigned_seats"): "assigned_seats",
        ("pickup_dropoff", "pickup_location"): "pickup_location",
        ("pickup_dropoff", "dropoff_location"): "dropoff_location",
        ("payment", "method"): "payment_method",
        ("payment", "status"): "payment_status",
        ("booking", "booking_id"): "booking_id",
        ("booking", "booking_status"): "booking_status",
    }
    for (section, field), state_field in projection.items():
        nested = workflow.get(section)
        if (
            isinstance(nested, dict)
            and nested.get(field) != state.get(state_field)
        ):
            collector.add(
                path,
                "workflow.state_projection",
                f"{section}.{field} does not equal final_state.{state_field}",
            )


def _validate_confirm_booking_workflow_binding(
    expectations: Sequence[Any],
    workflow: Mapping[str, Any],
    path: Path,
    collector: _Collector,
) -> None:
    trip = workflow.get("trip")
    customer = workflow.get("customer")
    booking = workflow.get("booking")
    if not all(isinstance(value, dict) for value in (trip, customer, booking)):
        return
    expected_arguments = {
        "trip_id": trip.get("trip_id"),
        "customer_name": customer.get("name"),
        "customer_phone": customer.get("phone"),
    }
    expected_result = {
        "booking_id": booking.get("booking_id"),
        "booking_status": booking.get("booking_status"),
    }
    for item in expectations:
        action = item.get("action") if isinstance(item, dict) else None
        if not isinstance(action, dict) or action.get("action") != "CONFIRM_BOOKING":
            continue
        turn = item.get("turn")
        if action.get("arguments") != expected_arguments:
            collector.add(
                path,
                "action.binding",
                f"turn {turn} CONFIRM_BOOKING arguments do not match final workflow",
            )
        if action.get("expected_result") != expected_result:
            collector.add(
                path,
                "action.binding",
                f"turn {turn} CONFIRM_BOOKING result does not match final workflow",
            )


def _catalog_points(trip: Mapping[str, Any], kind: str) -> list[Any]:
    candidates = {
        "pickup": (
            "pickup_points",
            "pickup_locations",
            "allowed_pickup_points",
        ),
        "dropoff": (
            "dropoff_points",
            "dropoff_locations",
            "allowed_dropoff_points",
        ),
    }
    for key in candidates[kind]:
        value = trip.get(key)
        if isinstance(value, list):
            return value
    return []


def _catalog_trips(catalog: Any) -> dict[str, Mapping[str, Any]]:
    if not isinstance(catalog, dict) or not isinstance(catalog.get("trips"), list):
        return {}
    return {
        trip["trip_id"]: trip
        for trip in catalog["trips"]
        if isinstance(trip, dict) and isinstance(trip.get("trip_id"), str)
    }


def _validate_catalog_grounding(
    expected: Mapping[str, Any],
    catalog: Any,
    path: Path,
    collector: _Collector,
) -> None:
    workflow = expected.get("final_workflow_output")
    expectations = expected.get("turn_expectations")
    if not isinstance(workflow, dict) or not isinstance(expectations, list):
        return
    trips = _catalog_trips(catalog)
    trip_output = workflow.get("trip")
    if not isinstance(trip_output, dict):
        return
    trip_id = trip_output.get("trip_id")
    if not isinstance(trip_id, str):
        collector.add(
            path,
            "catalog.mismatch",
            "selected workflow trip_id must be a string",
        )
        return
    selected = trips.get(trip_id)
    if selected is None:
        collector.add(
            path, "catalog.trip", f"selected trip {trip_id!r} is not in catalog"
        )
        return
    vehicle = workflow.get("vehicle", {})
    pickup = workflow.get("pickup_dropoff", {})
    payment = workflow.get("payment", {})
    comparisons = {
        "trip.origin": (trip_output.get("origin"), selected.get("origin")),
        "trip.destination": (
            trip_output.get("destination"),
            selected.get("destination"),
        ),
        "trip.travel_date": (
            trip_output.get("travel_date"),
            selected.get("travel_date"),
        ),
        "trip.departure_time": (
            trip_output.get("departure_time"),
            selected.get("departure_time"),
        ),
        "trip.arrival_time": (
            trip_output.get("arrival_time"),
            selected.get("arrival_time"),
        ),
        "vehicle.type": (
            vehicle.get("type") if isinstance(vehicle, dict) else None,
            selected.get("vehicle_type"),
        ),
        "payment.unit_fare_vnd": (
            payment.get("unit_fare_vnd") if isinstance(payment, dict) else None,
            selected.get("unit_fare_vnd"),
        ),
    }
    for field, (actual, fixture) in comparisons.items():
        if actual != fixture:
            collector.add(
                path,
                "catalog.mismatch",
                f"{field}={actual!r} does not match catalog {fixture!r}",
            )
    if isinstance(pickup, dict):
        pickup_points = _safe_string_set(
            _catalog_points(selected, "pickup"), allow_empty=True
        )
        dropoff_points = _safe_string_set(
            _catalog_points(selected, "dropoff"), allow_empty=True
        )
        if (
            pickup_points is None
            or pickup.get("pickup_location") not in pickup_points
        ):
            collector.add(
                path, "catalog.mismatch", "pickup location is not catalog-allowed"
            )
        if (
            dropoff_points is None
            or pickup.get("dropoff_location") not in dropoff_points
        ):
            collector.add(
                path, "catalog.mismatch", "drop-off location is not catalog-allowed"
            )
    seats = vehicle.get("assigned_seats") if isinstance(vehicle, dict) else []
    available = selected.get("available_seats", [])
    seat_set = _safe_string_set(seats, allow_empty=True)
    available_set = _safe_string_set(available, allow_empty=True)
    if (
        seat_set is None
        or available_set is None
        or len(seats) != len(seat_set)
        or not seat_set.issubset(available_set)
    ):
        collector.add(
            path, "catalog.mismatch", "assigned seats are not available in catalog"
        )
    for item in expectations:
        if not isinstance(item, dict) or not isinstance(item.get("action"), dict):
            continue
        action = item["action"]
        name = action.get("action")
        arguments = action.get("arguments", {})
        result = action.get("expected_result", {})
        if not isinstance(arguments, dict) or not isinstance(result, dict):
            continue
        if name == "SEARCH_TRIPS":
            returned = result.get("trip_ids")
            if not isinstance(returned, list) or not returned:
                collector.add(path, "catalog.mismatch", "SEARCH_TRIPS must return trip IDs")
                continue
            for returned_id in returned:
                if not isinstance(returned_id, str):
                    collector.add(
                        path,
                        "catalog.mismatch",
                        "SEARCH_TRIPS returned a non-string trip ID",
                    )
                    continue
                trip = trips.get(returned_id)
                if trip is None or any(
                    trip.get(field) != arguments.get(field)
                    for field in ("origin", "destination", "travel_date")
                ):
                    collector.add(
                        path,
                        "catalog.mismatch",
                        f"SEARCH_TRIPS returned ungrounded trip {returned_id!r}",
                    )
                else:
                    trip_seats = _safe_string_set(
                        trip.get("available_seats"), allow_empty=True
                    )
                    passenger_count = arguments.get("passenger_count")
                    insufficient = (
                        trip_seats is None
                        or not isinstance(passenger_count, int)
                        or isinstance(passenger_count, bool)
                        or len(trip_seats) < passenger_count
                    )
                    if not insufficient:
                        continue
                    collector.add(
                        path,
                        "catalog.mismatch",
                        f"SEARCH_TRIPS returned trip {returned_id!r} without enough seats",
                    )
        elif name == "HOLD_SEATS":
            held_trip_id = arguments.get("trip_id")
            held_trip = trips.get(held_trip_id) if isinstance(held_trip_id, str) else None
            if held_trip is None:
                collector.add(path, "catalog.mismatch", "HOLD_SEATS trip is unknown")
                continue
            assigned = result.get("assigned_seats")
            count = arguments.get("passenger_count")
            unit = result.get("unit_fare_vnd")
            total = result.get("total_fare_vnd")
            assigned_set = _safe_string_set(assigned)
            held_available_set = _safe_string_set(
                held_trip.get("available_seats"), allow_empty=True
            )
            if (
                assigned_set is None
                or held_available_set is None
                or not isinstance(count, int)
                or isinstance(count, bool)
                or len(assigned) != count
                or len(assigned) != len(assigned_set)
                or not assigned_set.issubset(held_available_set)
                or not isinstance(unit, int)
                or isinstance(unit, bool)
                or unit != held_trip.get("unit_fare_vnd")
                or total != unit * count
            ):
                collector.add(
                    path, "catalog.mismatch", "HOLD_SEATS result is not catalog-grounded"
                )


TICKET_LABELS = {
    "booking id": "booking_id",
    "mã đặt vé": "booking_id",
    "mã vé": "booking_id",
    "customer": "customer",
    "khách hàng": "customer",
    "phone": "phone",
    "điện thoại": "phone",
    "số điện thoại": "phone",
    "route": "route",
    "tuyến": "route",
    "departure": "departure",
    "khởi hành": "departure",
    "vehicle": "vehicle",
    "loại xe": "vehicle",
    "seats": "seats",
    "ghế": "seats",
    "pickup": "pickup",
    "điểm đón": "pickup",
    "drop-off": "dropoff",
    "dropoff": "dropoff",
    "điểm trả": "dropoff",
    "passenger count": "passenger_count",
    "passengers": "passenger_count",
    "hành khách": "passenger_count",
    "số hành khách": "passenger_count",
    "payment": "payment",
    "thanh toán": "payment",
    "status": "status",
    "trạng thái": "status",
}


def _normalized_scalar(value: Any) -> str:
    return " ".join(unicodedata.normalize("NFC", str(value)).split())


def _ticket_fields(
    ticket: str, path: Path, collector: _Collector
) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in ticket.splitlines():
        cleaned = line.strip()
        if cleaned.startswith(("- ", "* ")):
            cleaned = cleaned[2:].strip()
        cleaned = cleaned.replace("**", "")
        if ":" not in cleaned:
            continue
        label, value = cleaned.split(":", 1)
        key = TICKET_LABELS.get(_normalized_scalar(label).casefold())
        if key is None:
            continue
        if key in fields:
            collector.add(
                path,
                "ticket.field_duplicate",
                f"ticket field {key} appears more than once",
            )
        fields[key] = _normalized_scalar(value)
    return fields


def _validate_ticket(
    ticket: str,
    workflow: Any,
    path: Path,
    collector: _Collector,
) -> None:
    if not isinstance(workflow, dict) or not WORKFLOW_KEYS.issubset(workflow):
        return
    fields = _ticket_fields(ticket, path, collector)
    required = {
        "booking_id",
        "customer",
        "phone",
        "route",
        "departure",
        "vehicle",
        "seats",
        "pickup",
        "dropoff",
        "passenger_count",
        "payment",
        "status",
    }
    for field in sorted(required - set(fields)):
        collector.add(
            path, "ticket.field_missing", f"ticket is missing field {field}"
        )
    if not required.issubset(fields):
        return
    assigned_seats = workflow["vehicle"].get("assigned_seats", [])
    assigned_seat_set = _safe_string_set(assigned_seats, allow_empty=True)
    expected = {
        "booking_id": workflow["booking"].get("booking_id"),
        "customer": workflow["customer"].get("name"),
        "phone": workflow["customer"].get("phone"),
        "route": (
            f"{workflow['trip'].get('origin')} → "
            f"{workflow['trip'].get('destination')}"
        ),
        "departure": (
            f"{workflow['trip'].get('travel_date')} "
            f"{workflow['trip'].get('departure_time')}"
        ),
        "vehicle": workflow["vehicle"].get("type"),
        "seats": (
            ", ".join(assigned_seats)
            if assigned_seat_set is not None
            else None
        ),
        "pickup": workflow["pickup_dropoff"].get("pickup_location"),
        "dropoff": workflow["pickup_dropoff"].get("dropoff_location"),
        "passenger_count": workflow["passengers"].get("count"),
        "status": TICKET_BOOKING_STATUS_LABELS.get(
            workflow["booking"].get("booking_status")
        ),
    }
    for field, value in expected.items():
        if value is None:
            continue
        if fields.get(field) != _normalized_scalar(value):
            collector.add(
                path,
                "ticket.field_mismatch",
                f"ticket {field} does not equal workflow output",
            )
    payment_tokens = [
        _normalized_scalar(token)
        for token in re.split(r"\s*(?:\||/|—|–)\s*", fields.get("payment", ""))
    ]
    expected_payment_tokens = [
        _normalized_scalar(
            TICKET_PAYMENT_METHOD_LABELS.get(workflow["payment"].get("method"))
        ),
        _normalized_scalar(
            TICKET_PAYMENT_STATUS_LABELS.get(workflow["payment"].get("status"))
        ),
    ]
    if payment_tokens != expected_payment_tokens:
        collector.add(
            path,
            "ticket.field_mismatch",
            "ticket payment method/status tokens do not equal workflow output",
        )


def _validate_case_pair(
    parsed: ParsedCase,
    expected: Mapping[str, Any],
    catalog: Any,
    case_id: str,
    markdown_path: Path,
    json_path: Path,
    collector: _Collector,
) -> None:
    _validate_expected_schema(expected, case_id, json_path, collector)
    if expected.get("title") != parsed.title:
        collector.add(
            json_path, "cross_file.title", "Markdown and JSON titles differ"
        )
    expectations = expected.get("turn_expectations")
    if not isinstance(expectations, list):
        expectations = []
    if len(expectations) != len(parsed.turns):
        collector.add(
            json_path,
            "cross_file.turn_expectation",
            "Markdown and JSON turn counts differ",
        )
    else:
        for parsed_turn, item in zip(parsed.turns, expectations):
            if not isinstance(item, dict) or (
                item.get("turn") != parsed_turn.number
                or item.get("action") != parsed_turn.action
                or item.get("state_update") != parsed_turn.state_update
            ):
                collector.add(
                    json_path,
                    "cross_file.turn_expectation",
                    f"turn {parsed_turn.number} differs between Markdown and JSON",
                )
    final_state = expected.get("final_state")
    workflow = expected.get("final_workflow_output")
    if parsed.final_state != final_state:
        collector.add(
            json_path,
            "cross_file.final_state",
            "Markdown section 4 differs from JSON final_state",
        )
    if parsed.final_workflow_output != workflow:
        collector.add(
            json_path,
            "cross_file.workflow",
            "Markdown section 5 differs from JSON final_workflow_output",
        )
    replayed, confirmation_turn, _ = _replay_state(
        expectations, case_id, json_path, collector
    )
    if replayed != final_state:
        collector.add(
            json_path,
            "state.replay_mismatch",
            "replayed state differs from final_state",
        )
    if isinstance(workflow, dict):
        outcome = workflow.get("outcome")
        if isinstance(outcome, dict) and outcome.get(
            "confirmation_turn"
        ) != confirmation_turn:
            collector.add(
                json_path,
                "state.confirmation_turn",
                "outcome.confirmation_turn is not the final valid confirmation transition",
            )
        _project_state_to_workflow(replayed, workflow, json_path, collector)
        _validate_confirm_booking_workflow_binding(
            expectations, workflow, json_path, collector
        )
    _validate_catalog_grounding(expected, catalog, json_path, collector)
    _validate_ticket(parsed.ticket_text, workflow, markdown_path, collector)


def _scenario_type_for(number: int) -> str:
    if number <= 10:
        return "core_booking"
    if number <= 15:
        return "hotline_behavior"
    if number <= 20:
        return "regional_speech"
    if number <= 24:
        return "code_switching"
    if number <= 27:
        return "difficult_audio"
    return "extreme"


def _terms_present(text: str, terms: set[str]) -> set[str]:
    folded = unicodedata.normalize("NFC", text).casefold()
    return {term for term in terms if term.casefold() in folded}


def _validate_per_case_distribution(
    number: int,
    parsed: ParsedCase,
    expected: Mapping[str, Any],
    json_path: Path,
    collector: _Collector,
) -> None:
    metadata = expected.get("metadata")
    if not isinstance(metadata, dict):
        return
    expected_type = _scenario_type_for(number)
    if metadata.get("scenario_type") != expected_type:
        collector.add(
            json_path,
            "distribution.scenario_type",
            f"CASE_{number:03d} must use scenario_type {expected_type}",
        )
    tags = metadata.get("coverage_tags")
    tags_set = (
        {tag for tag in tags if isinstance(tag, str)}
        if isinstance(tags, list)
        else set()
    )
    missing_tags = REQUIRED_COVERAGE_TAGS.get(number, set()) - tags_set
    if missing_tags:
        collector.add(
            json_path,
            "distribution.coverage_tag",
            f"CASE_{number:03d} is missing coverage tags {sorted(missing_tags)}",
        )
    region = metadata.get("customer_region")
    if isinstance(region, str) and region != region.strip():
        collector.add(
            json_path,
            "metadata.whitespace",
            "metadata.customer_region has surrounding whitespace",
            severity="warning",
        )
    domain_count = len(_terms_present(parsed.customer_text, DOMAIN_TERMS))
    if domain_count < 2:
        collector.add(
            parsed.path,
            "distribution.domain_terms_case",
            f"CASE_{number:03d} customer text contains only {domain_count} domain terms",
        )


def _validate_aggregate_distribution(
    cases: Mapping[int, tuple[ParsedCase, Mapping[str, Any], Path]],
    collector: _Collector,
) -> None:
    paid_cases: list[int] = []
    for number, (_, expected, _) in cases.items():
        workflow = expected.get("final_workflow_output")
        payment = workflow.get("payment") if isinstance(workflow, dict) else None
        if isinstance(payment, dict) and payment.get("status") == "PAID":
            paid_cases.append(number)
    if len(paid_cases) < 3:
        collector.add(
            Path("expected_outputs"),
            "distribution.payment_status",
            "dataset must contain at least three evidence-backed PAID bookings",
        )
    regional_text = "\n".join(
        cases[number][0].customer_text
        for number in (*range(16, 21), *range(28, 31))
        if number in cases
    )
    missing_regional = REGIONAL_TERMS - _terms_present(
        regional_text, REGIONAL_TERMS
    )
    if missing_regional:
        collector.add(
            Path("scenarios"),
            "distribution.regional_lexicon",
            f"customer text is missing regional terms {sorted(missing_regional)}",
        )
    code_text = "\n".join(
        cases[number][0].customer_text
        for number in (*range(21, 25), 28, 30)
        if number in cases
    )
    missing_code = CODE_SWITCH_TERMS - _terms_present(
        code_text, CODE_SWITCH_TERMS
    )
    if missing_code:
        collector.add(
            Path("scenarios"),
            "distribution.code_switch_lexicon",
            f"customer text is missing code-switch terms {sorted(missing_code)}",
        )
    audio_values: set[str] = set()
    for number in range(25, 31):
        if number not in cases:
            continue
        metadata = cases[number][1].get("metadata")
        if isinstance(metadata, dict) and isinstance(
            metadata.get("audio_conditions"), list
        ):
            audio_values.update(
                str(value).casefold() for value in metadata["audio_conditions"]
            )
    audio_text = " ".join(audio_values)
    required_audio = {
        "telephone": any("telephone" in value for value in audio_values),
        "background_noise": any(
            "background" in value for value in audio_values
        ),
        "bus_station": any("bus_station" in value for value in audio_values),
        "field_recording": any("field" in value for value in audio_values),
    }
    missing_audio = sorted(
        name for name, present in required_audio.items() if not present
    )
    if missing_audio:
        collector.add(
            Path("expected_outputs"),
            "distribution.audio_condition",
            f"difficult-audio metadata is missing {missing_audio}",
        )
    case_thirty = cases.get(30)
    if case_thirty is not None:
        parsed, expected, path = case_thirty
        metadata = expected.get("metadata")
        languages = (
            metadata.get("languages") if isinstance(metadata, dict) else []
        )
        has_thai = re.search(r"[\u0E00-\u0E7F]", parsed.customer_text) is not None
        if not has_thai or not isinstance(languages, list) or "th" not in languages:
            collector.add(
                path,
                "distribution.multilingual",
                "CASE_030 must contain Thai customer text and language code th",
            )
    union_text = "\n".join(parsed.customer_text for parsed, _, _ in cases.values())
    missing_domain = DOMAIN_TERMS - _terms_present(union_text, DOMAIN_TERMS)
    if missing_domain:
        collector.add(
            Path("scenarios"),
            "distribution.domain_terms_union",
            f"dataset customer text is missing domain terms {sorted(missing_domain)}",
        )


def _validate_booking_id_uniqueness(
    cases: Mapping[int, tuple[ParsedCase, Mapping[str, Any], Path]],
    collector: _Collector,
) -> None:
    seen: dict[Any, Path] = {}
    for _, (_, expected, path) in sorted(cases.items()):
        workflow = expected.get("final_workflow_output")
        booking = workflow.get("booking") if isinstance(workflow, dict) else None
        booking_id = booking.get("booking_id") if isinstance(booking, dict) else None
        if not isinstance(booking_id, str):
            continue
        if booking_id in seen:
            collector.add(
                path,
                "dataset.duplicate_booking_id",
                f"booking ID {booking_id!r} duplicates {seen[booking_id].as_posix()}",
            )
        else:
            seen[booking_id] = path


def _discover(directory: Path, suffix: str) -> dict[int, Path]:
    result: dict[int, Path] = {}
    if not directory.is_dir():
        return result
    pattern = re.compile(r"^CASE_(\d{3})\." + re.escape(suffix) + r"$")
    for path in directory.iterdir():
        match = pattern.fullmatch(path.name)
        if match:
            result[int(match.group(1))] = path
    return result


def _load_json_for_report(
    path: Path, collector: _Collector
) -> Mapping[str, Any] | None:
    try:
        value = load_json_strict(path)
    except DuplicateKeyError as exc:
        collector.add(path, "json.duplicate_key", str(exc))
        return None
    except DataReadError as exc:
        collector.add(path, exc.code, str(exc))
        return None
    if not isinstance(value, dict):
        collector.add(
            path, "json.object_required", "expected-output root must be an object"
        )
        return None
    return value


def _validate_fixture_header(
    value: Mapping[str, Any],
    path: Path,
    collector: _Collector,
) -> None:
    if (
        value.get("schema_version") != "1.0"
        or value.get("synthetic") is not True
        or value.get("timezone") != "Asia/Ho_Chi_Minh"
    ):
        collector.add(
            path,
            "fixture.schema",
            "fixture must declare schema_version 1.0, synthetic true, and Asia/Ho_Chi_Minh",
        )


def _validate_catalog_fixture(
    value: Mapping[str, Any],
    path: Path,
    collector: _Collector,
) -> None:
    _validate_fixture_header(value, path, collector)
    trips = value.get("trips")
    if not isinstance(trips, list) or not trips:
        collector.add(path, "fixture.schema", "catalog.trips must be non-empty")
        return
    seen_ids: set[str] = set()
    required = {
        "trip_id",
        "origin",
        "destination",
        "travel_date",
        "departure_time",
        "arrival_time",
        "vehicle_type",
        "unit_fare_vnd",
        "available_seats",
    }
    for index, trip in enumerate(trips):
        context = f"trips[{index}]"
        if not isinstance(trip, dict) or not required.issubset(trip):
            collector.add(
                path, "fixture.schema", f"{context} is missing required trip fields"
            )
            continue
        trip_id = trip.get("trip_id")
        if not _nonempty_string(trip_id) or trip_id in seen_ids:
            collector.add(
                path, "fixture.schema", f"{context}.trip_id is empty or duplicated"
            )
        else:
            seen_ids.add(trip_id)
        for field in ("origin", "destination", "vehicle_type"):
            if not _nonempty_string(trip.get(field)):
                collector.add(
                    path, "fixture.schema", f"{context}.{field} must be non-empty"
                )
        if not _valid_date(trip.get("travel_date")):
            collector.add(
                path, "fixture.schema", f"{context}.travel_date is invalid"
            )
        for field in ("departure_time", "arrival_time"):
            if not _valid_time(trip.get(field)):
                collector.add(
                    path, "fixture.schema", f"{context}.{field} is invalid"
                )
        fare = trip.get("unit_fare_vnd")
        if not isinstance(fare, int) or isinstance(fare, bool) or fare <= 0:
            collector.add(
                path, "fixture.schema", f"{context}.unit_fare_vnd must be positive"
            )
        seats = trip.get("available_seats")
        seat_set = _safe_string_set(seats)
        if seat_set is None or len(seats) != len(seat_set):
            collector.add(
                path,
                "fixture.schema",
                f"{context}.available_seats must be unique non-empty strings",
            )
        for kind in ("pickup", "dropoff"):
            points = _catalog_points(trip, kind)
            point_set = _safe_string_set(points)
            if point_set is None or len(points) != len(point_set):
                collector.add(
                    path,
                    "fixture.schema",
                    f"{context} requires unique non-empty {kind} points",
                )


def _validate_policy_fixture(
    value: Mapping[str, Any],
    path: Path,
    collector: _Collector,
) -> None:
    _validate_fixture_header(value, path, collector)
    policies = value.get("policies")
    required = {
        "child_passenger",
        "luggage",
        "accessibility",
        "pet",
        "pickup",
        "payment",
        "change",
        "cancellation",
    }
    if not isinstance(policies, dict):
        collector.add(path, "fixture.schema", "policies must be an object")
        return
    missing = required - set(policies)
    if missing:
        collector.add(
            path,
            "fixture.schema",
            f"policies is missing categories {sorted(missing)}",
        )
    for name, policy in policies.items():
        if policy in (None, "", [], {}) or (
            isinstance(policy, str) and PLACEHOLDER_RE.fullmatch(policy)
        ):
            collector.add(
                path,
                "fixture.schema",
                f"policy {name!r} must contain a non-placeholder rule",
            )


def validate_fixtures(root: Path | str) -> ValidationReport:
    benchmark_root = Path(root)
    collector = _Collector(benchmark_root)
    for filename in ("catalog.json", "policies.json"):
        path = benchmark_root / "fixtures" / filename
        if not path.is_file():
            collector.add(path, "file.missing", f"missing fixture {filename}")
            continue
        value = _load_json_for_report(path, collector)
        if value is None:
            continue
        if filename == "catalog.json":
            _validate_catalog_fixture(value, path, collector)
        else:
            _validate_policy_fixture(value, path, collector)
    return collector.report()


def validate_dataset(
    root: Path | str,
    *,
    case_range: tuple[int, int] | None = None,
    fixtures_only: bool = False,
) -> ValidationReport:
    benchmark_root = Path(root)
    collector = _Collector(benchmark_root)
    fixture_report = validate_fixtures(benchmark_root)
    collector.issues.extend(fixture_report.issues)
    if fixtures_only:
        return collector.report()
    catalog_path = benchmark_root / "fixtures" / "catalog.json"
    try:
        catalog = load_json_strict(catalog_path) if catalog_path.is_file() else {}
    except (DataReadError, DuplicateKeyError):
        catalog = {}
    markdown_files = _discover(benchmark_root / "scenarios", "md")
    json_files = _discover(benchmark_root / "expected_outputs", "json")
    if case_range is None:
        expected = set(range(1, CASE_COUNT + 1))
        if set(markdown_files) != expected or set(json_files) != expected:
            collector.add(
                benchmark_root,
                "dataset.case_ids",
                "expected continuous CASE_001 through CASE_030 Markdown/JSON pairs",
            )
        for number in sorted(set(markdown_files) ^ set(json_files)):
            existing = markdown_files.get(number) or json_files.get(number)
            collector.add(
                existing or benchmark_root,
                "dataset.orphan_file",
                f"CASE_{number:03d} does not have a Markdown/JSON pair",
            )
        for number in sorted((set(markdown_files) | set(json_files)) - expected):
            existing = markdown_files.get(number) or json_files.get(number)
            collector.add(
                existing or benchmark_root,
                "dataset.orphan_file",
                f"unexpected case outside CASE_001 through CASE_030: CASE_{number:03d}",
            )
        target = sorted(expected | set(markdown_files) | set(json_files))
    else:
        target = list(range(case_range[0], case_range[1] + 1))
    parsed_count = 0
    turn_count = 0
    validated_cases: dict[
        int, tuple[ParsedCase, Mapping[str, Any], Path]
    ] = {}
    for number in target:
        case_id = f"CASE_{number:03d}"
        markdown_path = markdown_files.get(number)
        json_path = json_files.get(number)
        if markdown_path is None:
            collector.add(
                benchmark_root / "scenarios" / f"{case_id}.md",
                "file.missing",
                f"missing scenario for {case_id}",
            )
        if json_path is None:
            collector.add(
                benchmark_root / "expected_outputs" / f"{case_id}.json",
                "file.missing",
                f"missing expected output for {case_id}",
            )
        if markdown_path is None or json_path is None:
            continue
        parsed, issues = parse_case(markdown_path)
        for issue in issues:
            collector.add(
                markdown_path,
                issue.code,
                issue.message,
                line=issue.line,
                severity=issue.severity,
            )
        expected_output = _load_json_for_report(json_path, collector)
        if parsed is None or expected_output is None:
            continue
        parsed_count += 1
        turn_count += len(parsed.turns)
        if parsed.case_id != case_id:
            collector.add(
                markdown_path,
                "case.id",
                f"Markdown case ID {parsed.case_id!r} does not match {case_id}",
            )
        if expected_output.get("case_id") != case_id:
            collector.add(
                json_path, "case.id", f"JSON case_id must equal {case_id}"
            )
        try:
            _validate_case_pair(
                parsed,
                expected_output,
                catalog,
                case_id,
                markdown_path,
                json_path,
                collector,
            )
            _validate_per_case_distribution(
                number, parsed, expected_output, json_path, collector
            )
        except Exception as exc:
            collector.add(
                json_path,
                "validator.internal_error",
                f"unexpected {type(exc).__name__} during case semantic validation",
            )
            continue
        validated_cases[number] = (parsed, expected_output, json_path)
    _validate_booking_id_uniqueness(validated_cases, collector)
    if case_range is None:
        _validate_aggregate_distribution(validated_cases, collector)
    return collector.report(parsed_count, turn_count)


def parse_case_range(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d{1,3})-(\d{1,3})", value.strip())
    if not match:
        raise argparse.ArgumentTypeError("case range must use START-END")
    start, end = int(match.group(1)), int(match.group(2))
    if start < 1 or end > CASE_COUNT or start > end:
        raise argparse.ArgumentTypeError(
            "case range must satisfy 1 <= START <= END <= 30"
        )
    return start, end


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "root",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="benchmark root; defaults to the script directory",
    )
    parser.add_argument("--json", action="store_true", dest="json_output")
    parser.add_argument("--strict-warnings", action="store_true")
    parser.add_argument("--fixtures-only", action="store_true")
    parser.add_argument("--case-range", type=parse_case_range)
    return parser


def _payload(report: ValidationReport) -> dict[str, Any]:
    return {
        "ok": report.ok,
        "case_count": report.case_count,
        "turn_count": report.turn_count,
        "errors": len(report.errors),
        "warnings": len(report.warnings),
        "issues": [
            {
                "path": issue.path,
                "line": issue.line,
                "code": issue.code,
                "severity": issue.severity,
                "message": issue.message,
            }
            for issue in report.issues
        ],
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = _parser()
    args = parser.parse_args(argv)
    if args.fixtures_only and args.case_range is not None:
        parser.error("--fixtures-only and --case-range cannot be combined")
    report = validate_dataset(
        args.root,
        case_range=args.case_range,
        fixtures_only=args.fixtures_only,
    )
    if args.json_output:
        print(json.dumps(_payload(report), ensure_ascii=False, sort_keys=True))
    else:
        for issue in report.issues:
            location = issue.path + (f":{issue.line}" if issue.line else "")
            print(
                f"{issue.severity.upper()} {issue.code} "
                f"{location}: {issue.message}"
            )
        if args.fixtures_only:
            print(
                f"Fixtures: {'valid' if report.ok else 'invalid'} "
                f"({len(report.errors)} errors, {len(report.warnings)} warnings)"
            )
        else:
            print(
                f"Cases: {report.case_count}, turns: {report.turn_count}, "
                f"errors: {len(report.errors)}, warnings: {len(report.warnings)}"
            )
    if report.errors or (args.strict_warnings and report.warnings):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
