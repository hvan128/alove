"""Rule-based end-of-turn detection on the live transcript (vi-first).

Both ML detectors failed live verification on Vietnamese (Namo mis-scores
complete sentences ~0; Smart Turn v3 scored real mic answers 0.01-0.20 and
cost 0.5-0.9s/turn on the VPS). This detector instead encodes the one signal
that is unambiguous in Vietnamese: a turn that pauses right after a
*dangling* word - conjunction, classifier, hesitation filler, mid-clause
particle - is NOT finished ("Cho tôi đặt vé đi Đà Lạt và…"). Everything
else commits at min_endpointing_delay, so the common case stays fast and
only clearly-unfinished pauses get the max_endpointing_delay grace window.

Deterministic, ~0ms, no model, every decision explainable from the logs.
"""

import logging
import re
import time

logger = logging.getLogger(__name__)

# Utterance-final tokens that signal an UNFINISHED Vietnamese clause.
# Grouped by why they dangle; matched against the last 1-2 words.
_VI_DANGLING = {
    # hesitation fillers
    "ờ", "ờm", "ừm", "ưm", "à", "ạà", "ề", "ơ",
    # conjunctions / connectors - a clause is coming
    "và", "nhưng", "hoặc", "hay", "rồi", "xong", "nên", "vì", "do", "mà",
    "nếu", "khi", "lúc", "tuy", "dù",
    # copula / relativizer - predicate is coming
    "là", "rằng", "thì",
    # prepositions - object is coming
    "của", "cho", "với", "về", "trong", "ngoài", "trên", "dưới", "từ",
    "đến", "tới", "theo", "bằng", "tại", "ở",
    # auxiliaries - verb is coming
    "đã", "đang", "sẽ", "bị", "được", "cần", "phải", "muốn", "định",
    # classifiers / determiners - noun is coming
    "cái", "những", "các", "một", "mấy", "vài",
    # discourse openers that promise more
    "kiểu", "tức", "chẳng",
}
_VI_DANGLING_BIGRAMS = {
    "tức là", "kiểu như", "ví dụ", "chẳng hạn", "đại loại", "nói chung",
    "thật ra", "thực ra", "sau đó", "tiếp theo", "đầu tiên", "thứ nhất",
    "thứ hai", "thứ ba", "bởi vì", "tại vì", "cho nên", "vậy nên",
    "so với", "đối với", "dựa trên", "dựa vào", "cùng với", "ngoài ra",
}

# English equivalents for en/bilingual sessions.
_EN_DANGLING = {
    "and", "but", "or", "so", "because", "since", "although", "though",
    "if", "when", "while", "that", "which", "who", "like", "um", "uh",
    "the", "a", "an", "my", "our", "their", "its",
    "to", "of", "in", "on", "at", "for", "with", "from", "by", "about",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "will", "would", "can", "could", "should", "must", "very", "really",
    "such", "as", "than", "also", "then", "first", "second", "basically",
    "actually", "especially", "example",
}

_WORD_RE = re.compile(r"[\wÀ-ỹ]+", re.UNICODE)


def is_dangling(text: str) -> bool:
    """True when the utterance ends mid-clause (turn very likely unfinished)."""
    words = _WORD_RE.findall(text.lower())
    if not words:
        return False
    if words[-1] in _VI_DANGLING or words[-1] in _EN_DANGLING:
        return True
    return len(words) >= 2 and f"{words[-2]} {words[-1]}" in _VI_DANGLING_BIGRAMS


class RuleBasedTurnDetector:
    """livekit-agents _TurnDetector backed by is_dangling()."""

    @property
    def model(self) -> str:
        return "vi-dangling-rules"

    @property
    def provider(self) -> str:
        return "rules"

    async def unlikely_threshold(self, language: str | None) -> float | None:
        return 0.5

    async def supports_language(self, language: str | None) -> bool:
        return True

    async def predict_end_of_turn(self, chat_ctx, *, timeout: float | None = None) -> float:
        start = time.time()
        try:
            text = ""
            for item in reversed(chat_ctx.items):
                if getattr(item, "role", None) == "user":
                    text = (getattr(item, "text_content", None) or "").strip()
                    break
            if not text:
                return 1.0  # nothing transcribed -> behave like plain VAD
            dangling = is_dangling(text)
            probability = 0.0 if dangling else 1.0
            logger.info(
                "[turn-rules] dangling=%s tail=%r took=%.1fms",
                dangling, text[-40:], (time.time() - start) * 1000,
            )
            return probability
        except Exception as exc:
            logger.warning("turn-rules failed (fail-open): %s", exc)
            return 1.0
