"""Validated client for VALSEA's advisory text-annotation endpoint."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Mapping, Optional

import httpx


DEFAULT_API_BASE_URL = "https://api.valsea.ai"
MAX_ANNOTATION_TEXT_CHARS = 4_096
MAX_HTTP_RESPONSE_BYTES = 64 * 1_024
MAX_JSON_NESTING = 8
MAX_JSON_ITEM_NODES = 64
MAX_JSON_RESPONSE_NODES = 512
MAX_ANNOTATION_ITEMS = 16
MAX_DISPLAY_CHARS = 80


class ValseaAnnotationResponseError(ValueError):
    """Raised when VALSEA returns JSON that does not match its documented schema."""


def _required_string(value: object, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValseaAnnotationResponseError(f"{path} must be a non-empty string")
    if len(value) > MAX_ANNOTATION_TEXT_CHARS:
        raise ValseaAnnotationResponseError(
            f"{path} must not exceed {MAX_ANNOTATION_TEXT_CHARS} characters"
        )
    return value


def _optional_string(value: object, path: str) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValseaAnnotationResponseError(f"{path} must be a string when present")
    if len(value) > MAX_ANNOTATION_TEXT_CHARS:
        raise ValseaAnnotationResponseError(
            f"{path} must not exceed {MAX_ANNOTATION_TEXT_CHARS} characters"
        )
    return value


def _optional_array(payload: Mapping[str, object], field: str) -> list[object]:
    value = payload.get(field)
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValseaAnnotationResponseError(f"{field} must be an array when present")
    if len(value) > MAX_ANNOTATION_ITEMS:
        raise ValseaAnnotationResponseError(
            f"{field} must not contain more than {MAX_ANNOTATION_ITEMS} items"
        )
    return value


def _validate_json_value(value: object, *, path: str, max_nodes: int) -> None:
    """Validate bounded finite JSON iteratively so hostile nesting cannot recurse."""

    stack: list[tuple[object, int]] = [(value, 0)]
    node_count = 0
    while stack:
        current, depth = stack.pop()
        node_count += 1
        if node_count > max_nodes:
            raise ValseaAnnotationResponseError(
                f"{path} must not exceed {max_nodes} JSON nodes"
            )
        if depth > MAX_JSON_NESTING:
            raise ValseaAnnotationResponseError(
                f"{path} must not exceed JSON nesting depth {MAX_JSON_NESTING}"
            )

        if current is None or isinstance(current, (str, bool, int)):
            continue
        if isinstance(current, float):
            if not math.isfinite(current):
                raise ValseaAnnotationResponseError(
                    f"{path} must be a finite JSON value"
                )
            continue
        if isinstance(current, list):
            stack.extend((item, depth + 1) for item in reversed(current))
            continue
        if isinstance(current, dict):
            if not all(isinstance(key, str) for key in current):
                raise ValseaAnnotationResponseError(
                    f"{path} must have string JSON object keys"
                )
            stack.extend((item, depth + 1) for item in reversed(tuple(current.values())))
            continue
        raise ValseaAnnotationResponseError(f"{path} must be a finite JSON value")


def _display_json_value(value: object, preferred_keys: tuple[str, ...]) -> str:
    if isinstance(value, str) and value.strip():
        display = value.strip()
    elif isinstance(value, dict):
        display = ""
        for key in preferred_keys:
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                display = candidate.strip()
                break
        if not display:
            display = json.dumps(
                value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
            )
    else:
        display = json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return (
        display
        if len(display) <= MAX_DISPLAY_CHARS
        else f"{display[: MAX_DISPLAY_CHARS - 1]}…"
    )


@dataclass(frozen=True)
class AnnotationValue:
    """A finite JSON provider item plus a stable, bounded UI representation."""

    value: object
    display: str

    @classmethod
    def from_json(
        cls,
        value: object,
        *,
        path: str,
        preferred_keys: tuple[str, ...],
    ) -> AnnotationValue:
        _validate_json_value(value, path=path, max_nodes=MAX_JSON_ITEM_NODES)
        try:
            display = _display_json_value(value, preferred_keys)
        except (RecursionError, ValueError) as exc:
            raise ValseaAnnotationResponseError(
                f"{path} must be a finite JSON value"
            ) from exc
        return cls(value=value, display=display)


@dataclass(frozen=True)
class ValseaAnnotationResponse:
    text: str
    raw_text: Optional[str]
    annotated_text: Optional[str]
    accent_corrections: tuple[AnnotationValue, ...]
    semantic_tags: tuple[AnnotationValue, ...]
    annotations: tuple[AnnotationValue, ...]

    @classmethod
    def from_json(cls, payload: object) -> ValseaAnnotationResponse:
        if not isinstance(payload, dict):
            raise ValseaAnnotationResponseError("annotation response must be a JSON object")
        _validate_json_value(
            payload,
            path="annotation response",
            max_nodes=MAX_JSON_RESPONSE_NODES,
        )
        return cls(
            text=_required_string(payload.get("text"), "text"),
            raw_text=_optional_string(payload.get("raw_text"), "raw_text"),
            annotated_text=_optional_string(payload.get("annotated_text"), "annotated_text"),
            accent_corrections=tuple(
                AnnotationValue.from_json(
                    item,
                    path=f"accent_corrections[{index}]",
                    preferred_keys=("correction", "replacement", "text", "label"),
                )
                for index, item in enumerate(_optional_array(payload, "accent_corrections"))
            ),
            semantic_tags=tuple(
                AnnotationValue.from_json(
                    item,
                    path=f"semantic_tags[{index}]",
                    preferred_keys=("tag", "label", "phrase", "text"),
                )
                for index, item in enumerate(_optional_array(payload, "semantic_tags"))
            ),
            annotations=tuple(
                AnnotationValue.from_json(
                    item,
                    path=f"annotations[{index}]",
                    preferred_keys=("phrase", "label", "text", "tag"),
                )
                for index, item in enumerate(_optional_array(payload, "annotations"))
            ),
        )


class ValseaAPIClient:
    """Small async wrapper around ``POST /v1/annotations``.

    The HTTP client is injected so the worker can reuse a keep-alive connection
    and tests can use ``httpx.MockTransport`` without network access.
    """

    def __init__(
        self,
        *,
        api_key: str,
        http_client: httpx.AsyncClient,
        api_base_url: str = DEFAULT_API_BASE_URL,
        timeout_seconds: float = 3.0,
    ) -> None:
        key = (api_key or "").strip()
        if not key:
            raise ValueError("VALSEA_API_KEY not set")
        if not math.isfinite(timeout_seconds) or timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        self._api_key = key
        self._http_client = http_client
        self._endpoint = f"{api_base_url.rstrip('/')}/v1/annotations"
        self._timeout_seconds = timeout_seconds

    async def annotate(self, text: str) -> ValseaAnnotationResponse:
        if not isinstance(text, str) or not text.strip():
            raise ValueError("annotation text must not be empty")
        if len(text) > MAX_ANNOTATION_TEXT_CHARS:
            raise ValueError(
                f"annotation text must not exceed {MAX_ANNOTATION_TEXT_CHARS} characters"
            )

        body = bytearray()
        async with self._http_client.stream(
            "POST",
            self._endpoint,
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={
                "model": "valsea-annotate",
                "text": text,
                "response_format": "verbose_json",
                "language": "vietnamese",
                "enable_correction": True,
                "enable_tags": True,
            },
            timeout=self._timeout_seconds,
        ) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes():
                if len(body) + len(chunk) > MAX_HTTP_RESPONSE_BYTES:
                    raise ValseaAnnotationResponseError(
                        "annotation response exceeds "
                        f"{MAX_HTTP_RESPONSE_BYTES} bytes"
                    )
                body.extend(chunk)

        try:
            payload = json.loads(body)
        except (RecursionError, UnicodeDecodeError, ValueError) as exc:
            raise ValseaAnnotationResponseError(
                "annotation response must contain valid JSON"
            ) from exc
        return ValseaAnnotationResponse.from_json(payload)
