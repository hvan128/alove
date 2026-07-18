from types import SimpleNamespace

import pytest

from transcript_translation import OpenAITranscriptTranslator


class FakeResponses:
    def __init__(self, output_text: str = "") -> None:
        self.output_text = output_text
        self.calls: list[dict[str, object]] = []

    async def create(self, **kwargs: object) -> SimpleNamespace:
        self.calls.append(kwargs)
        return SimpleNamespace(output_text=self.output_text)


class FailingResponses:
    async def create(self, **kwargs: object) -> SimpleNamespace:
        del kwargs
        raise RuntimeError("provider unavailable")


@pytest.mark.asyncio
async def test_translates_only_when_staff_selects_english_without_storing_pii() -> None:
    responses = FakeResponses("Two tickets from Saigon to Da Lat, please.")
    translator = OpenAITranscriptTranslator(responses, model="gpt-4.1-mini")

    assert await translator.translate("Đặt hai vé đi Đà Lạt.", "original") == {}
    assert await translator.translate("Đặt hai vé đi Đà Lạt.", "vi") == {}
    translated = await translator.translate("Đặt hai vé đi Đà Lạt.", "en")

    assert translated == {"en": "Two tickets from Saigon to Da Lat, please."}
    assert len(responses.calls) == 1
    assert responses.calls[0] == {
        "model": "gpt-4.1-mini",
        "instructions": (
            "Translate the Vietnamese bus-booking transcript to natural English. "
            "Preserve names, phone numbers, dates, times, locations, seat codes, "
            "and uncertainty exactly. Return only the translation."
        ),
        "input": "Đặt hai vé đi Đà Lạt.",
        "max_output_tokens": 180,
        "store": False,
    }


@pytest.mark.asyncio
async def test_translation_failure_keeps_original_transcript_available() -> None:
    translator = OpenAITranscriptTranslator(FailingResponses(), model="gpt-4.1-mini")

    assert await translator.translate("Tôi đi Đà Lạt.", "en") == {}
