"""Chuẩn hoá văn bản trước khi đưa vào TTS.

Mô hình viết ra thứ đọc được bằng mắt: "anh/chị", "1,060,000 đồng", "2026-07-20".
Đọc thành tiếng thì thành "anh trên chị", "một không sáu không không không", và
đọc nguyên chuỗi ngày kiểu máy. Đây là phép biến đổi xác định, đặt ngay trước
TTS nên áp dụng được cho mọi câu, kể cả câu mô hình vừa nghĩ ra.
"""

import re

_UNITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
_SCALES = ["", " nghìn", " triệu", " tỷ"]


def _read_group(n: int, full: bool) -> str:
    """Đọc một nhóm ba chữ số. `full` = có nhóm lớn hơn đứng trước, khi đó phải
    đọc cả 'không trăm' để 1.060.000 ra 'một triệu không trăm sáu mươi nghìn'."""
    hundreds, rest = divmod(n, 100)
    tens, units = divmod(rest, 10)
    parts: list[str] = []

    if hundreds or full:
        parts.append(f"{_UNITS[hundreds]} trăm")

    if tens == 0:
        if units:
            # "linh" chỉ xuất hiện khi có hàng trăm đứng trước
            parts.append(f"linh {_UNITS[units]}" if (hundreds or full) else _UNITS[units])
    elif tens == 1:
        parts.append("mười")
        if units == 5:
            parts.append("lăm")
        elif units:
            parts.append(_UNITS[units])
    else:
        parts.append(f"{_UNITS[tens]} mươi")
        if units == 1:
            parts.append("mốt")   # hai mươi mốt
        elif units == 4:
            parts.append("tư")    # hai mươi tư
        elif units == 5:
            parts.append("lăm")   # hai mươi lăm
        elif units:
            parts.append(_UNITS[units])

    return " ".join(parts).strip()


def number_to_vietnamese(value: int) -> str:
    """1060000 -> 'một triệu không trăm sáu mươi nghìn'."""
    if value == 0:
        return "không"
    if value < 0:
        return f"âm {number_to_vietnamese(-value)}"

    groups: list[int] = []
    while value > 0:
        value, remainder = divmod(value, 1000)
        groups.append(remainder)

    chunks: list[str] = []
    for index in range(len(groups) - 1, -1, -1):
        group = groups[index]
        if group == 0:
            continue
        # Nhóm không phải nhóm cao nhất thì đọc đủ ba chữ số.
        text = _read_group(group, full=index != len(groups) - 1)
        chunks.append(f"{text}{_SCALES[index]}")
    return " ".join(chunks).strip()


_MONEY_RE = re.compile(r"\b(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(đồng|đ|vnđ|vnd)\b", re.IGNORECASE)
# Nuốt luôn chữ "ngày" đứng trước nếu có, nếu không sẽ thành "ngày ngày 20 tháng 7".
_ISO_DATE_RE = re.compile(r"\b(?:ngày\s+)?(\d{4})-(\d{2})-(\d{2})\b", re.IGNORECASE)
_TIME_RE = re.compile(r"\b(\d{1,2}):(\d{2})\b")
# "anh/chị", "và/hoặc" — dấu gạch chéo giữa hai chữ bị đọc thành "trên".
_SLASH_RE = re.compile(r"(?<=[^\W\d_])\s*/\s*(?=[^\W\d_])", re.UNICODE)


def _money(match: re.Match) -> str:
    digits = re.sub(r"[.,]", "", match.group(1))
    return f"{number_to_vietnamese(int(digits))} đồng"


def _iso_date(match: re.Match) -> str:
    # Bỏ năm: chuyến chỉ mở bán trong ít ngày tới nên nói năm nghe rất máy móc,
    # người thật chỉ nói "ngày 20 tháng 7".
    _, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
    return f"ngày {day} tháng {month}"


def _time(match: re.Match) -> str:
    hour, minute = int(match.group(1)), int(match.group(2))
    if minute == 0:
        return f"{hour} giờ"
    if minute == 30:
        return f"{hour} giờ rưỡi"
    return f"{hour} giờ {minute}"


def normalize_for_speech(text: str) -> str:
    """Đưa văn bản về dạng đọc lên nghe như người nói."""
    if not text:
        return text
    text = _MONEY_RE.sub(_money, text)
    text = _ISO_DATE_RE.sub(_iso_date, text)
    text = _TIME_RE.sub(_time, text)
    text = _SLASH_RE.sub(" ", text)
    return text


def spell_phone(number: str) -> str:
    """Đọc số điện thoại theo từng chữ số, nhóm 3-4 số cho dễ nghe."""
    digits = re.sub(r"\D", "", number)
    groups = [digits[0:4], digits[4:7], digits[7:]] if len(digits) == 10 else [digits]
    return ", ".join(" ".join(_UNITS[int(d)] for d in g) for g in groups if g)
