"""Optional, privacy-conscious final transcript translation for the staff display."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Protocol

logger = logging.getLogger("vedi.translation")

TRANSLATION_INSTRUCTIONS = (
    "Translate the Vietnamese bus-booking transcript to natural English. "
    "Preserve names, phone numbers, dates, times, locations, seat codes, "
    "and uncertainty exactly. Return only the translation."
)


class ResponsesClient(Protocol):
    async def create(self, **kwargs: object) -> Any: ...


class OpenAITranscriptTranslator:
    """Translate finalized Vietnamese turns only when English is selected."""

    def __init__(
        self,
        responses: ResponsesClient,
        *,
        model: str,
        timeout_seconds: float = 2.5,
    ) -> None:
        self._responses = responses
        self._model = model
        self._timeout_seconds = timeout_seconds

    async def translate(self, text: str, target_language: str) -> dict[str, str]:
        normalized = text.strip()
        if target_language != "en" or not normalized:
            return {}

        try:
            response = await asyncio.wait_for(
                self._responses.create(
                    model=self._model,
                    instructions=TRANSLATION_INSTRUCTIONS,
                    input=normalized,
                    max_output_tokens=180,
                    store=False,
                ),
                timeout=self._timeout_seconds,
            )
        except Exception:
            logger.warning("Transcript translation failed; retaining source text.", exc_info=True)
            return {}

        translated = str(getattr(response, "output_text", "") or "").strip()
        return {"en": translated} if translated else {}
