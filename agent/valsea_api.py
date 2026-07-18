"""Validated client for VALSEA's advisory text-annotation endpoint."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Mapping, Optional

import httpx


DEFAULT_API_BASE_URL = "https://api.valsea.ai"


class ValseaAnnotationResponseError(ValueError):
    """Raised when VALSEA returns JSON that does not match its documented schema."""


def _required_string(value: object, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValseaAnnotationResponseError(f"{path} must be a non-empty string")
    return value


def _optional_string(value: object, path: str) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValseaAnnotationResponseError(f"{path} must be a string when present")
    return value


def _optional_array(payload: Mapping[str, object], field: str) -> list[object]:
    value = payload.get(field)
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValseaAnnotationResponseError(f"{field} must be an array when present")
    return value


def _is_json_value(value: object) -> bool:
    if value is None or isinstance(value, (str, bool, int)):
        return True
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, list):
        return all(_is_json_value(item) for item in value)
    if isinstance(value, dict):
        return all(isinstance(key, str) and _is_json_value(item) for key, item in value.items())
    return False


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
    return display if len(display) <= 240 else f"{display[:239]}…"


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
        if not _is_json_value(value):
            raise ValseaAnnotationResponseError(f"{path} must be a finite JSON value")
        return cls(value=value, display=_display_json_value(value, preferred_keys))


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
        response = await self._http_client.post(
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
        )
        response.raise_for_status()
        try:
            payload = response.json()
        except ValueError as exc:
            raise ValseaAnnotationResponseError(
                "annotation response must contain valid JSON"
            ) from exc
        return ValseaAnnotationResponse.from_json(payload)
