"""Alove bus-ticket voice agent (LiveKit).

Ported from the project-4 interview agent, domain-swapped to bus-ticket booking.
The booking itself stays DETERMINISTIC and server-authoritative: this worker never
invents prices, trips, seats, passenger info or ticket codes. Every customer turn is
relayed to the Next.js `/api/booking/advance` endpoint (which runs @ordervoice/core
`advanceBookingAgent`); the worker only speaks the exact reply core returns and
publishes the authoritative booking snapshot back to the browser over the room's
data channel.

Three A/B-testable engine configs (env `AGENT_ENGINE` + `STT_PROVIDER`):
  - VALSEA-first : AGENT_ENGINE=cascade  STT_PROVIDER=valsea       (brief default)
  - cascade      : AGENT_ENGINE=cascade  STT_PROVIDER=speechmatics (project-4 parity)
  - gemini-sts   : AGENT_ENGINE=gemini-sts                         (speech-to-speech)
"""

import asyncio
import json
import logging
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    function_tool,
    metrics,
    room_io,
    stt,
)
from livekit.agents.llm import StopResponse
from livekit.plugins import cartesia, elevenlabs, google, noise_cancellation, openai, silero, speechmatics
from livekit.plugins.speechmatics import OperatingPoint
from google.genai import types

# Load agent/.env by absolute path so engine mode is picked up regardless of cwd.
load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger(__name__)

# --- Engine + provider selection -------------------------------------------------
# cascade = STT -> LLM -> TTS (default). gemini-sts = single Gemini Live S2S model.
AGENT_ENGINE = os.getenv("AGENT_ENGINE", "cascade").lower()
# Cascade STT backend: valsea | speechmatics | openai.
STT_PROVIDER = os.getenv("STT_PROVIDER", "speechmatics").lower()
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai/gpt-4.1")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "cartesia/sonic-3")

# Direct provider keys — when set, the cascade talks to the provider directly
# (bypasses LiveKit's inference gateway + its credit quota). Absent → gateway string.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "")
SPEECHMATICS_API_KEY = os.getenv("SPEECHMATICS_API_KEY", "")
VALSEA_API_KEY = os.getenv("VALSEA_API_KEY", "")

# Google Cloud TTS (Chirp3-HD) — preferred TTS when a GCP service account is set:
# native-ish Vietnamese + true streaming. Provide inline JSON (rides --env-file) or a path.
GOOGLE_TTS_CREDENTIALS_JSON = os.getenv("GOOGLE_TTS_CREDENTIALS_JSON", "")
GOOGLE_TTS_CREDENTIALS_FILE = os.getenv("GOOGLE_TTS_CREDENTIALS_FILE", "")
GOOGLE_TTS_VOICE = os.getenv("GOOGLE_TTS_VOICE", "Kore")

# ElevenLabs: giọng mặc định, đổi sang Google bằng công tắc ẩn trên giao diện.
# flash_v2_5 là model độ trễ thấp nhất còn hỗ trợ tiếng Việt.
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "s6W2NupNY6TykGJoDtWy")
ELEVENLABS_MODEL = os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5")
TTS_DEFAULT = os.getenv("TTS_DEFAULT", "elevenlabs").lower()

# Gemini Live (speech-to-speech) config, only used when AGENT_ENGINE=gemini-sts.
GEMINI_LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest")
GEMINI_LIVE_VOICE = os.getenv("GEMINI_LIVE_VOICE", "Puck")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_THINKING = os.getenv("GEMINI_THINKING", "off").lower() == "on"
GEMINI_END_SENSITIVITY = os.getenv("GEMINI_END_SENSITIVITY", "high").lower()
GEMINI_SILENCE_MS = int(os.getenv("GEMINI_SILENCE_MS", "400"))

# Cascade end-of-turn tuning. RULES = deterministic Vietnamese dangling-word EOU
# on the live transcript (turn_rules.py); ~0ms, every decision explainable.
CASCADE_TURN_DETECTOR = os.getenv("CASCADE_TURN_DETECTOR", "rules").lower()
CASCADE_MIN_ENDPOINTING_DELAY = float(
    os.getenv("CASCADE_MIN_ENDPOINTING_DELAY", "0.8" if CASCADE_TURN_DETECTOR == "rules" else "1.0")
)
CASCADE_MAX_ENDPOINTING_DELAY = float(os.getenv("CASCADE_MAX_ENDPOINTING_DELAY", "5.0"))
CASCADE_PREEMPTIVE = os.getenv("CASCADE_PREEMPTIVE", "on").lower() == "on"
CASCADE_MIN_INTERRUPTION_DURATION = float(os.getenv("CASCADE_MIN_INTERRUPTION_DURATION", "0.8"))
CASCADE_MIN_INTERRUPTION_WORDS = int(os.getenv("CASCADE_MIN_INTERRUPTION_WORDS", "2"))

from speech_text import normalize_for_speech  # local, thuần hàm

# Ranh giới câu: dấu chấm/hỏi/than KHÔNG đứng ngay sau chữ số (1.060.000) và có
# khoảng trắng hoặc hết chuỗi phía sau.
_SENTENCE_END_RE = re.compile(r"(?<!\d)[.!?…]+(?=\s|$)")

if CASCADE_TURN_DETECTOR == "rules":
    from turn_rules import RuleBasedTurnDetector  # local, deterministic

# Next.js seam — the ONLY place booking state changes. Auth with the shared secret.
NEXTJS_API_URL = os.getenv("NEXTJS_API_URL", "http://localhost:3000").rstrip("/")
AGENT_WEBHOOK_SECRET = os.getenv("AGENT_WEBHOOK_SECRET", "")

# Named agent → explicit dispatch. Must match LIVEKIT_AGENT_NAME on the web side.
LIVEKIT_AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "alove")
# A local `agent.py dev`/`console` worker shares the prod agent name and LiveKit
# load-balances across all workers under a name — a stray local worker would steal
# prod dispatches. Force a distinct "-dev" name in dev/console mode.
if any(cmd in sys.argv for cmd in ("dev", "console")) and not LIVEKIT_AGENT_NAME.endswith("-dev"):
    LIVEKIT_AGENT_NAME = f"{LIVEKIT_AGENT_NAME}-dev"
    logger.info("Dev/console mode → agent name forced to %s (isolated from prod)", LIVEKIT_AGENT_NAME)

# Data-channel topic shared with the browser (see apps/web livekit-call.tsx).
EVENTS_TOPIC = "alove-events"

ROOM_PREFIX = "booking-"

def bus_agent_instructions(today_vn: str) -> str:
    """System prompt. The model owns the CONVERSATION — understanding whatever the
    caller says, in any phrasing, and holding a natural exchange. It owns none of
    the FACTS: departures, prices, seats and ticket codes come back from tools that
    read the database, so the model can restate them but never make them up."""
    return (
        "Bạn là nhân viên tổng đài nhà xe Mai Anh, đang nghe điện thoại. Xưng \"em\", gọi khách "
        "là \"anh\" hoặc \"chị\".\n\n"
        f"Hôm nay là {today_vn} (giờ Việt Nam). Tự quy ngày khách nói ra ngày cụ thể: "
        "\"mai\", \"ngày 20 tháng 7\", \"thứ sáu tuần này\", \"cuối tuần\"...\n\n"
        "NÓI CHUYỆN NHƯ NGƯỜI THẬT:\n"
        "- Câu ngắn. Mỗi lượt nói một hai câu thôi, đừng đọc một tràng dài.\n"
        "- ĐỪNG XÁC NHẬN LẠI SAU MỖI THÔNG TIN. Nghe xong thì đi tiếp. Chỉ xác nhận ở ba "
        "chỗ có rủi ro thật: khi khách đổi hẳn điểm đến, trước khi chốt vé, và sau khi đặt "
        "xong. Xác nhận từng ly từng tí nghe như máy hỏi cung.\n"
        "- CHỈ gọi tên khách khi chính khách đã nói tên trong cuộc gọi này. Khách chưa xưng "
        "tên thì tuyệt đối không được gọi bằng tên nào cả — không suy đoán, không lấy tên ở "
        "đâu khác. Gọi nhầm tên người lạ là hỏng cả cuộc gọi.\n"
        "- Khi khách đã cho tên rồi thì dùng tên đó nhất quán, đừng quay lại \"anh chị\". "
        "Chưa biết giới tính thì \"anh chị\" một lần rồi thôi.\n"
        "- Đừng mở đầu câu nào cũng \"Dạ\". Xen kẽ, hoặc vào thẳng nội dung.\n"
        "- Không dùng từ của phần mềm khi nói với khách: đừng nói \"loại xe không chọn lọc\", "
        "\"bộ lọc\", \"hệ thống\". Nói như người: \"xe nào cũng được\".\n"
        "- Đọc lại thông tin thì tách thành câu ngắn, đừng dồn hết vào một câu dài, khách "
        "nghe không kịp và không phát hiện được chỗ sai.\n"
        "- Nghe khách xong thì đáp lại cái vừa nghe rồi mới hỏi tiếp, đừng hỏi trống không.\n"
        "- Đừng bao giờ hỏi lại thứ khách đã nói. Nhớ hết những gì khách đã cung cấp.\n"
        "- MỖI LƯỢT CHỈ HỎI MỘT THỨ. Không bao giờ hỏi dồn kiểu \"đi từ đâu đến đâu, ngày "
        "nào, mấy vé ạ?\" — khách chỉ nhớ câu cuối và nghe như điền biểu mẫu. Hỏi gọn từng "
        "cái: \"Dạ anh đi ngày nào ạ?\", nghe xong rồi mới hỏi tiếp.\n"
        "- Khách thường tự khai sẵn nhiều thứ trong một câu (\"cho tôi 2 vé đi Vinh mai\"). "
        "Nhận hết những gì khách đã nói, chỉ hỏi phần còn thiếu.\n"
        "- Khách nói lộn xộn, ngập ngừng, đổi ý, nói nhầm thì cứ bình thường như người thật.\n\n"
        "LẤP KHOẢNG CHỜ:\n"
        "- Trước khi gọi bất kỳ công cụ nào (tra chuyến, giữ chỗ, xuất vé), hãy nói một câu "
        "ngắn báo cho khách biết mình đang làm gì rồi hãy gọi: \"Dạ anh chờ em chút, em kiểm "
        "tra chuyến ạ\", \"Vâng để em giữ chỗ cho mình nhé\", \"Dạ em đang xuất vé ạ\". "
        "Đổi cách nói mỗi lần. Việc này giúp khách không phải nghe im lặng lúc hệ thống tra cứu.\n\n"
        "CÁCH ĐỌC SỐ VÀ NGÀY:\n"
        "- Viết tiền bằng chữ số kèm \"đồng\" (ví dụ 530.000 đồng), hệ thống sẽ tự đọc thành lời.\n"
        "- Nói ngày kiểu người Việt: \"ngày 20 tháng 7\", không đọc dạng năm-tháng-ngày.\n"
        "- Đọc số điện thoại tách từng cụm cho khách dễ nghe.\n\n"
        "QUY TRÌNH:\n"
        "- Đủ điểm đi, điểm đến, ngày, số vé thì gọi search_trips.\n"
        "- Mời chuyến thì nói luôn ĐIỂM ĐÓN và ĐIỂM TRẢ thật (pickupPoint, dropoffPoint do "
        "công cụ trả về), đừng để tới lúc xuất vé khách mới biết đón ở đâu. Gọi tên nơi trả "
        "đúng như dữ liệu (\"Bến xe Vinh\"), đừng nói chung chung tên tỉnh.\n"
        "- Gọi chỗ ngồi đúng từ nhà xe dùng: công cụ trả về seatNoun (\"ghế\", \"giường\" hay "
        "\"phòng\"). Xe limousine phòng VIP thì phải nói \"phòng A1\", không nói \"ghế A1\".\n"
        "- Khách chọn chuyến thì gọi hold_seats, rồi xin họ tên và số điện thoại.\n"
        "- Số điện thoại: đọc lại theo từng cụm cho khách nghe rõ và hỏi đúng chưa, vì nghe "
        "nhầm số là hỏng cả vé. Số không hợp lệ thì xin khách đọc lại, đừng đoán.\n"
        "- Đọc lại cho khách nghe, khách đồng ý mới gọi confirm_booking.\n"
        "- Báo mã vé, chúc đi đường bình an, rồi gọi end_call.\n"
        "- Khách đổi ý ngay trong cuộc gọi này thì gọi cancel_booking (không cần tham số) "
        "rồi tìm chuyến khác.\n"
        "- Khách gọi lại để hỏi, đổi hay huỷ vé đã đặt HÔM TRƯỚC thì vé đó không thuộc cuộc "
        "gọi này. Hỏi khách mã vé, nếu khách không nhớ thì hỏi số điện thoại lúc đặt, rồi "
        "gọi find_booking. Đọc lại vé tìm được cho khách xác nhận đúng vé trước khi huỷ, "
        "và truyền mã vé đó vào cancel_booking.\n\n"
        "KHÔNG ĐƯỢC:\n"
        "- Không tự nghĩ ra chuyến, giờ chạy, giá vé, số ghế trống hay mã vé. Những thứ đó chỉ "
        "lấy từ kết quả công cụ. Chưa gọi công cụ thì chưa được nói.\n"
        "- search_trips không có chuyến thì phân biệt rõ: tuyến có mà ngày đó không chạy thì "
        "mời ngày khác; tuyến thật sự không chạy thì nói thật.\n"
        "- Chỉ mời những tuyến công cụ trả về trong suggestedRoutes. Không tự nghĩ ra tuyến "
        "thay thế, và không bao giờ mời khách đi chiều ngược lại với chiều họ cần.\n"
        "- Không hứa giữ đủ ghế khi hold_seats báo còn ít hơn."
    )

# Spoken when the booking backend is unreachable — never leave the caller in silence.
BACKEND_ERROR_REPLY = "Dạ xin lỗi anh chị, hệ thống đặt vé đang bận, anh chị chờ em một chút ạ."
# Hai câu kết khác nhau. Câu cảm ơn đã đặt vé từng được đọc cho cả khách bỏ
# ngang giữa chừng — khách vừa nói "bỏ" mà tổng đài chúc đi đường bình an thì
# lộ ngay là máy đọc kịch bản. Chọn theo việc có vé thật hay không.
CLOSING_BOOKED = "Dạ cảm ơn anh chị đã đặt vé nhà xe Mai Anh. Chúc anh chị đi đường bình an ạ!"
CLOSING_NO_BOOKING = "Dạ vâng, cảm ơn anh chị đã gọi nhà xe Mai Anh. Khi nào cần anh chị cứ gọi lại nhé ạ."


def conversation_id_from_room(room_name: str) -> Optional[str]:
    if room_name.startswith(ROOM_PREFIX):
        return room_name[len(ROOM_PREFIX):]
    return None


def tts_choice_from_room(room) -> Optional[str]:
    """Giọng đọc do người gọi chọn, gửi kèm metadata của participant lúc mint token.

    Công tắc nằm ẩn trên giao diện nên chỉ đổi được giữa các cuộc gọi, đúng ý:
    so giọng trên cùng một kịch bản mà người nghe không biết đang đổi."""
    try:
        for participant in room.remote_participants.values():
            raw = getattr(participant, "metadata", "") or ""
            if not raw:
                continue
            choice = (json.loads(raw).get("tts") or "").lower()
            if choice in ("elevenlabs", "google"):
                return choice
    except Exception as exc:  # noqa: BLE001 — metadata hỏng thì dùng mặc định
        logger.debug("đọc metadata giọng đọc thất bại: %s", exc)
    return None


def detect_sip_caller(room) -> tuple[str, Optional[str]]:
    """Return (channel, caller_number). A PSTN caller joins as a SIP participant
    whose attributes carry the dialed metadata (sip.phoneNumber); browser callers
    have no such attributes."""
    try:
        for participant in room.remote_participants.values():
            attrs = getattr(participant, "attributes", None) or {}
            if any(key.startswith("sip.") for key in attrs):
                return "phone", attrs.get("sip.phoneNumber") or None
    except Exception as exc:  # noqa: BLE001 — detection is best-effort metadata
        logger.debug("sip caller detection failed: %s", exc)
    return "web", None


# One shared client per worker process. A fresh httpx.AsyncClient per call
# re-does DNS + TCP + TLS every turn — measured ~350ms Singapore->Singapore, all
# of it inside the caller's wait for a reply. Keep-alive drops that to the round
# trip alone.
_http_client: Optional[httpx.AsyncClient] = None


def api_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=10.0,
            headers={"Authorization": f"Bearer {AGENT_WEBHOOK_SECRET}"},
            limits=httpx.Limits(max_keepalive_connections=4, keepalive_expiry=300.0),
        )
    return _http_client


async def post_call_event(
    conversation_id: str, event_type: str, channel: str = "web", caller_number: Optional[str] = None
) -> None:
    """Audit-only notification to the web app; losing it never affects the call."""
    body: dict = {"conversationId": conversation_id, "type": event_type, "channel": channel}
    if caller_number:
        body["callerNumber"] = caller_number
    try:
        await api_client().post(f"{NEXTJS_API_URL}/api/call/events", json=body)
    except Exception as exc:  # noqa: BLE001
        logger.warning("post_call_event(%s) failed: %s", event_type, exc)


# --- Cascade provider builders ---------------------------------------------------
def _cascade_llm():
    if OPENAI_API_KEY and LLM_PROVIDER.startswith("openai/"):
        return openai.LLM(model=LLM_PROVIDER.split("/", 1)[1], api_key=OPENAI_API_KEY)
    return LLM_PROVIDER


def _google_tts_creds() -> Optional[dict]:
    if GOOGLE_TTS_CREDENTIALS_JSON:
        return {"credentials_info": json.loads(GOOGLE_TTS_CREDENTIALS_JSON)}
    if GOOGLE_TTS_CREDENTIALS_FILE:
        return {"credentials_file": GOOGLE_TTS_CREDENTIALS_FILE}
    return None


def _elevenlabs_tts(language: str):
    """Giọng ElevenLabs. None khi thiếu key để gọi thoại rơi về Google thay vì tắt tiếng."""
    if not ELEVENLABS_API_KEY:
        logger.warning("ELEVENLABS_API_KEY trống — quay về Google TTS")
        return None
    return elevenlabs.TTS(
        voice_id=ELEVENLABS_VOICE_ID,
        model=ELEVENLABS_MODEL,
        api_key=ELEVENLABS_API_KEY,
        language=("en" if language == "en" else "vi"),
    )


def _cascade_tts(language: str, provider: Optional[str] = None):
    """Preferred: Google Cloud TTS (Chirp3-HD) when creds are set; else Cartesia
    direct; else the gateway provider string. VALSEA has no TTS in this workspace,
    so VALSEA mode reuses this TTS chain."""
    choice = (provider or TTS_DEFAULT).lower()
    if choice == "elevenlabs":
        eleven = _elevenlabs_tts(language)
        if eleven is not None:
            return eleven

    gcreds = _google_tts_creds()
    if gcreds is not None:
        loc = "en-US" if language == "en" else "vi-VN"
        return google.TTS(
            language=loc,
            voice_name=f"{loc}-Chirp3-HD-{GOOGLE_TTS_VOICE}",
            use_streaming=True,
            **gcreds,
        )
    if CARTESIA_API_KEY and TTS_PROVIDER.startswith("cartesia/"):
        model, _, voice = TTS_PROVIDER.split("/", 1)[1].partition(":")
        kwargs = dict(model=model, api_key=CARTESIA_API_KEY, language=("en" if language == "en" else "vi"), word_timestamps=False)
        if voice:
            kwargs["voice"] = voice
        return cartesia.TTS(**kwargs)
    return TTS_PROVIDER


def _openai_stt(language: str):
    return openai.STT(
        model="gpt-4o-mini-transcribe",
        language=("en" if language == "en" else "vi"),
        use_realtime=True,
        api_key=OPENAI_API_KEY,
    )


def _cascade_stt(language: str):
    """STT backend for the cascade engine: valsea | speechmatics | openai.

    valsea      : VALSEA realtime ASR (Alove brief default) — see valsea_stt.py.
    speechmatics: Speechmatics enhanced, OpenAI fallback when a key is present.
    openai      : OpenAI realtime transcription.
    """
    if STT_PROVIDER == "valsea":
        from valsea_stt import VALSEASTT
        return VALSEASTT(language=("en" if language == "en" else "vi"))
    if STT_PROVIDER == "openai" and OPENAI_API_KEY:
        return _openai_stt(language)
    # speechmatics (default)
    locale = "en" if language == "en" else "vi"
    if not SPEECHMATICS_API_KEY:
        return f"speechmatics/enhanced:{locale}"
    primary = speechmatics.STT(
        language=locale, operating_point=OperatingPoint.ENHANCED, api_key=SPEECHMATICS_API_KEY
    )
    if OPENAI_API_KEY:
        return stt.FallbackAdapter([primary, _openai_stt(language)])
    return primary


def _turn_detector():
    if CASCADE_TURN_DETECTOR == "rules":
        # Tiếng Việt: bỏ danh sách từ tiếng Anh, nếu không "Nghệ An" bị coi là
        # câu chưa xong và mỗi lượt phải chờ hết max_endpointing_delay.
        return RuleBasedTurnDetector(language="vi")
    return None


def build_agent_session(language: str, vad=None, tts_provider: Optional[str] = None) -> AgentSession:
    if AGENT_ENGINE == "gemini-sts":
        logger.info("Engine: gemini-sts (model=%s voice=%s)", GEMINI_LIVE_MODEL, GEMINI_LIVE_VOICE)
        end_sens = (
            types.EndSensitivity.END_SENSITIVITY_HIGH
            if GEMINI_END_SENSITIVITY == "high"
            else types.EndSensitivity.END_SENSITIVITY_LOW
        )
        kwargs = dict(
            model=GEMINI_LIVE_MODEL,
            voice=GEMINI_LIVE_VOICE,
            api_key=GEMINI_API_KEY or None,
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            realtime_input_config=types.RealtimeInputConfig(
                automatic_activity_detection=types.AutomaticActivityDetection(
                    end_of_speech_sensitivity=end_sens, silence_duration_ms=GEMINI_SILENCE_MS
                ),
            ),
        )
        if not GEMINI_THINKING:
            kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0, include_thoughts=False)
        realtime = google.beta.realtime.RealtimeModel(**kwargs)
        return AgentSession(llm=realtime)

    # Report the backend actually selected, not the env string. The two diverge
    # (e.g. TTS_PROVIDER stays "cartesia/..." while Google creds silently win),
    # and a log that names the wrong provider sends every debug down a dead end.
    stt_route = (
        "valsea" if STT_PROVIDER == "valsea"
        else "openai" if (STT_PROVIDER == "openai" and OPENAI_API_KEY)
        else "speechmatics+openai-fallback" if (SPEECHMATICS_API_KEY and OPENAI_API_KEY)
        else "speechmatics" if SPEECHMATICS_API_KEY
        else "gateway"
    )
    provider_choice = (tts_provider or TTS_DEFAULT).lower()
    tts_route = (
        f"elevenlabs:{ELEVENLABS_VOICE_ID[:8]}" if (provider_choice == "elevenlabs" and ELEVENLABS_API_KEY)
        else f"google-chirp3:{GOOGLE_TTS_VOICE}" if _google_tts_creds() is not None
        else f"cartesia:{TTS_PROVIDER}" if CARTESIA_API_KEY
        else "gateway"
    )
    logger.info(
        "Engine: cascade (stt=%s llm=%s tts=%s turn_detector=%s)",
        stt_route, "direct" if OPENAI_API_KEY else "gateway", tts_route, CASCADE_TURN_DETECTOR,
    )
    turn_handling: dict = {
        "endpointing": {"min_delay": CASCADE_MIN_ENDPOINTING_DELAY, "max_delay": CASCADE_MAX_ENDPOINTING_DELAY},
        "interruption": {"min_duration": CASCADE_MIN_INTERRUPTION_DURATION, "min_words": CASCADE_MIN_INTERRUPTION_WORDS},
        "preemptive_generation": {"enabled": CASCADE_PREEMPTIVE},
    }
    detector = _turn_detector()
    if detector is not None:
        turn_handling["turn_detection"] = detector
    return AgentSession(
        stt=_cascade_stt(language),
        llm=_cascade_llm(),
        tts=_cascade_tts(language, tts_provider),
        vad=vad or silero.VAD.load(),
        turn_handling=turn_handling,
    )


class BusBookingAgent(Agent):
    """Conversation is the model's job; inventory is the database's.

    The model understands whatever the caller says and drives the exchange, but
    every departure, price, seat and ticket code comes from these tools, which read
    and write real rows. The model can restate those facts, never invent them."""

    def __init__(self, conversation_id: Optional[str], room=None, today_vn: str = "") -> None:
        super().__init__(instructions=bus_agent_instructions(today_vn))
        self._conversation_id = conversation_id
        self._room = room
        self._ended = False
        # Chỉ bật khi confirm_booking thật sự ra vé, dùng để chọn câu kết.
        self._booked = False
        # Last offers/hold, mirrored to the browser so the ticket card matches
        # what the caller is being told.
        self._selected_trip: Optional[dict] = None
        self._offers: dict[str, dict] = {}

    async def tts_node(self, text, model_settings):
        """Chuẩn hoá ngay trước khi tổng hợp giọng.

        Đặt ở đây chứ không nhờ mô hình tự viết đúng, vì mô hình sẽ quên: chỉ cần
        một câu lọt ra là khách nghe thấy "anh trên chị" hoặc dãy số đọc từng chữ.
        Chặn ở cửa cuối thì mọi câu đều đi qua."""

        async def normalized():
            # Văn bản tới theo từng mảnh nhỏ, "1.060.000" có thể bị cắt làm đôi và
            # regex sẽ trượt. Gom đến hết câu rồi mới chuẩn hoá. Ranh giới câu bỏ
            # qua dấu chấm đứng sau chữ số, vì tiếng Việt dùng dấu chấm ngăn nghìn.
            buffer = ""
            async for chunk in text:
                buffer += chunk
                while True:
                    match = _SENTENCE_END_RE.search(buffer)
                    if not match:
                        break
                    head, buffer = buffer[: match.end()], buffer[match.end():]
                    yield normalize_for_speech(head)
            if buffer:
                yield normalize_for_speech(buffer)

        async for frame in Agent.default.tts_node(self, normalized(), model_settings):
            yield frame

    async def _publish(self, payload: dict) -> None:
        if self._room is None:
            return
        try:
            await self._room.local_participant.publish_data(
                json.dumps(payload).encode(), topic=EVENTS_TOPIC, reliable=True
            )
        except Exception as exc:  # noqa: BLE001 — data-channel best-effort
            logger.debug("publish_data failed: %s", exc)

    def _draft_payload(self, **over) -> dict:
        """A complete BookingDraft for the browser's ticket card.

        The card reads every field (and calls .join on the arrays), so a partial
        object would blow up the UI — always send the whole shape, using nulls and
        empty lists for what is not known yet."""
        trip = self._selected_trip or {}
        offer = trip.get("offer") or {}
        base = {
            "id": f"booking-{self._conversation_id}",
            "conversationId": self._conversation_id,
            "status": "collecting",
            "origin": offer.get("originCity"),
            "destination": offer.get("destinationCity"),
            "travelDateLabel": offer.get("departureLabel"),
            "timeWindow": None,
            "passengerCount": trip.get("seatsHeld"),
            "selectedTrip": (
                {
                    "id": offer.get("tripId") or trip.get("tripId") or "",
                    "origin": offer.get("originCity") or "",
                    "destination": offer.get("destinationCity") or "",
                    "departureTime": (offer.get("departureLabel") or "")[-5:] or "00:00",
                    "arrivalTime": "00:00",
                    "vehicleType": offer.get("vehicleType") or "",
                    "priceVnd": trip.get("priceVnd") or offer.get("priceVnd") or 0,
                    "pickupPoint": offer.get("pickupPoint") or "",
                    "dropoffPoint": offer.get("dropoffPoint") or "",
                    "availableSeats": trip.get("seatCodes") or [],
                }
                if offer or trip.get("tripId")
                else None
            ),
            "seats": trip.get("seatCodes") or [],
            "passengerName": None,
            "phone": None,
            "totalFareVnd": trip.get("totalVnd"),
            "bookingCode": None,
            "evidenceMessageIds": [],
        }
        base.update(over)
        return base

    async def _call_api(self, path: str, body: dict) -> Optional[dict]:
        try:
            resp = await api_client().post(f"{NEXTJS_API_URL}{path}", json=body)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001 — backend down → agent apologises
            logger.error("%s failed: %s", path, exc)
            return None

    @function_tool()
    async def search_trips(
        self,
        context: RunContext,
        origin: str,
        destination: str,
        date: str,
        passengers: int = 1,
    ) -> dict:
        """Tìm chuyến xe THẬT đang mở bán.

        origin/destination: tên thành phố khách nói (ví dụ "Hà Nội", "Nghệ An").
        date: ngày khởi hành dạng YYYY-MM-DD, tự quy đổi từ cách khách nói.
        passengers: số vé cần.

        trips có phần tử: đọc cho khách giờ chạy, loại xe, giá, số ghế còn.

        trips rỗng thì xem hai trường sau, ĐỪNG gộp làm một:
        - routeServed=true kèm otherDates: nhà xe CÓ chạy tuyến này, chỉ là ngày
          khách hỏi không có chuyến. Nói đúng vậy rồi mời khách các ngày trong
          otherDates. Không được bảo là không có tuyến.
        - routeServed=false kèm suggestedRoutes: thật sự chưa chạy tuyến này. Nói
          thật, rồi mời các tuyến trong suggestedRoutes nếu danh sách không rỗng.
          Danh sách này đã lọc sẵn, không bao giờ chứa chiều ngược lại của tuyến
          khách hỏi. suggestedRoutes rỗng thì chỉ xin lỗi, tuyệt đối không tự bịa
          tuyến thay thế.
        """
        data = await self._call_api(
            "/api/booking/search",
            {"origin": origin, "destination": destination, "date": date, "passengers": passengers},
        )
        if data is None:
            return {"error": "backend_unavailable"}
        self._offers = {t["tripId"]: t for t in data.get("trips", [])}
        return data

    @function_tool()
    async def hold_seats(self, context: RunContext, trip_id: str, passengers: int) -> dict:
        """Giữ chỗ THẬT trên một chuyến, dùng trip_id lấy từ search_trips.

        Trả về seatCodes đã giữ được và tổng tiền. Nếu seatsHeld nhỏ hơn số vé
        khách cần (shortfall > 0) thì xe chỉ còn từng ấy chỗ — phải nói đúng số
        còn lại, không được hứa đủ. held=false nghĩa là hết chỗ.
        """
        if not self._conversation_id:
            return {"error": "no_conversation"}
        data = await self._call_api(
            "/api/booking/hold",
            {"conversationId": self._conversation_id, "tripId": trip_id, "passengers": passengers},
        )
        if data is None:
            return {"error": "backend_unavailable"}
        self._selected_trip = {"tripId": trip_id, "offer": self._offers.get(trip_id, {}), **data}
        if data.get("held"):
            await self._publish(
                {"type": "booking.update", "booking": self._draft_payload(status="trip_proposed")}
            )
        return data

    @function_tool()
    async def confirm_booking(
        self, context: RunContext, trip_id: str, passenger_name: str, phone: str
    ) -> dict:
        """Chốt vé sau khi khách đã xác nhận rõ ràng. Chỉ gọi khi đã giữ chỗ và đã
        đọc lại thông tin cho khách nghe.

        phone: dạng số Việt Nam bắt đầu bằng 0.
        Trả về mã vé thật, danh sách ghế và tổng tiền — đọc đúng những giá trị này.
        """
        if not self._conversation_id:
            return {"error": "no_conversation"}
        data = await self._call_api(
            "/api/booking/confirm",
            {
                "conversationId": self._conversation_id,
                "tripId": trip_id,
                "passengerName": passenger_name,
                "phone": phone,
            },
        )
        if data is None:
            return {"error": "backend_unavailable"}
        if data.get("confirmed"):
            self._booked = True
            await self._publish({
                "type": "booking.update",
                "booking": self._draft_payload(
                    status="confirmed",
                    passengerName=passenger_name,
                    phone=phone,
                    seats=data.get("seatCodes") or [],
                    totalFareVnd=data.get("totalVnd"),
                    bookingCode=data.get("code"),
                    passengerCount=len(data.get("seatCodes") or []),
                ),
            })
        return data

    @function_tool()
    async def find_booking(self, context: RunContext, code: str = "", phone: str = "") -> dict:
        """Tra vé đã đặt TRƯỚC ĐÓ, ở cuộc gọi khác.

        Dùng khi khách gọi lại để hỏi, đổi hoặc huỷ vé đã đặt hôm trước. Truyền mã
        vé nếu khách đọc được, không thì truyền số điện thoại khách dùng lúc đặt.
        Trả về danh sách vé còn hiệu lực kèm tuyến, giờ chạy và ghế.

        bookings rỗng nghĩa là không tìm thấy — hỏi lại khách mã vé hoặc số điện
        thoại, đừng đoán.
        """
        if not code and not phone:
            return {"error": "need_code_or_phone"}
        body: dict = {}
        if code:
            body["code"] = code
        if phone:
            body["phone"] = phone
        data = await self._call_api("/api/booking/lookup", body)
        if data is None:
            return {"error": "backend_unavailable"}
        return data

    @function_tool()
    async def cancel_booking(self, context: RunContext, code: str = "", phone: str = "") -> dict:
        """Huỷ vé và trả ghế lại cho khách khác.

        Không truyền gì thì huỷ vé vừa đặt trong chính cuộc gọi này. Khách gọi lại
        để huỷ vé cũ thì truyền mã vé, hoặc số điện thoại lúc đặt.
        Huỷ xong muốn đổi chuyến thì gọi search_trips như bình thường.
        cancelled=false nghĩa là không tìm thấy vé nào để huỷ — nói thật với khách.
        """
        if not self._conversation_id:
            return {"error": "no_conversation"}
        body: dict = {"conversationId": self._conversation_id}
        if code:
            body["code"] = code
        if phone:
            body["phone"] = phone
        data = await self._call_api("/api/booking/cancel", body)
        if data is None:
            return {"error": "backend_unavailable"}
        if data.get("cancelled"):
            self._selected_trip = None
            await self._publish({"type": "booking.update", "booking": self._draft_payload()})
        return data

    @function_tool()
    async def end_call(self, context: RunContext):
        """Kết thúc cuộc gọi sau khi đã báo mã vé cho khách (hoặc khách không đặt
        nữa). Nói lời cảm ơn ngắn trước, rồi gọi công cụ này."""
        if self._ended:
            raise StopResponse()
        self._ended = True
        handle = context.speech_handle
        try:
            await handle.wait_for_playout()
        except Exception:
            pass
        spoke = False
        try:
            for item in handle.chat_items:
                if getattr(item, "role", None) == "assistant" and (getattr(item, "text_content", None) or "").strip():
                    spoke = True
                    break
        except Exception:
            pass
        if not spoke:
            try:
                closing = CLOSING_BOOKED if self._booked else CLOSING_NO_BOOKING
                await context.session.say(closing, allow_interruptions=False)
            except Exception as exc:
                logger.warning("closing line failed: %s", exc)
        await self._publish({"type": "call.end"})
        raise StopResponse()


def _prewarm(proc: JobProcess) -> None:
    if AGENT_ENGINE != "gemini-sts":
        proc.userdata["vad"] = silero.VAD.load()


server = AgentServer(setup_fnc=_prewarm, num_idle_processes=1, initialize_process_timeout=30.0)


@server.rtc_session(agent_name=LIVEKIT_AGENT_NAME)
async def entrypoint(ctx: JobContext):
    await ctx.connect()

    conversation_id = conversation_id_from_room(ctx.room.name)
    channel, caller_number = detect_sip_caller(ctx.room)
    logger.info(
        "Alove agent connected — room=%s conversation=%s channel=%s",
        ctx.room.name, conversation_id, channel,
    )

    if conversation_id:
        asyncio.create_task(post_call_event(conversation_id, "call.started", channel, caller_number))

        async def _post_call_ended() -> None:
            await post_call_event(conversation_id, "call.ended", channel, caller_number)

        ctx.add_shutdown_callback(_post_call_ended)

    # The model resolves "mai" / "thứ sáu tuần này" itself, so it needs today's
    # date in Vietnam time — the worker runs UTC.
    today_vn = datetime.now(timezone(timedelta(hours=7))).strftime("%d/%m/%Y")
    agent = BusBookingAgent(conversation_id=conversation_id, room=ctx.room, today_vn=today_vn)
    tts_provider = tts_choice_from_room(ctx.room)
    session = build_agent_session(
        "vi", vad=ctx.proc.userdata.get("vad"), tts_provider=tts_provider
    )

    # Commit the customer turn immediately when they press "Tôi nói xong".
    def _on_data_received(packet) -> None:
        if getattr(packet, "topic", None) != EVENTS_TOPIC:
            return
        try:
            msg = json.loads(bytes(packet.data).decode())
        except Exception:
            return
        if msg.get("type") != "user.end_turn":
            return

        async def _commit() -> None:
            try:
                await session.commit_user_turn(transcript_timeout=2.0)
            except Exception as exc:
                logger.debug("commit_user_turn skipped: %s", exc)

        asyncio.create_task(_commit())

    ctx.room.on("data_received", _on_data_received)

    # Mirror the agent's talking/listening/thinking state to the browser badge.
    def _on_agent_state(ev) -> None:
        try:
            raw = getattr(ev, "new_state", None) or getattr(ev, "state", None) or ev
            asyncio.create_task(
                ctx.room.local_participant.publish_data(
                    json.dumps({"type": "agent.state", "state": str(raw).lower()}).encode(),
                    topic=EVENTS_TOPIC,
                )
            )
        except Exception as exc:
            logger.debug("publish agent state failed: %s", exc)

    session.on("agent_state_changed", _on_agent_state)

    usage_collector = metrics.UsageCollector()

    def _on_metrics(ev) -> None:
        try:
            usage_collector.collect(ev.metrics)
        except Exception as exc:
            logger.debug("metrics collect failed: %s", exc)

    session.on("metrics_collected", _on_metrics)

    async def _log_usage() -> None:
        try:
            logger.info("[usage] %s", usage_collector.get_summary())
        except Exception:
            pass

    ctx.add_shutdown_callback(_log_usage)

    # Telephony audio is narrowband — Krisp ships a dedicated BVCTelephony model
    # for it. Fall back to plain BVC on older plugin versions.
    if channel == "phone" and hasattr(noise_cancellation, "BVCTelephony"):
        cancellation = noise_cancellation.BVCTelephony()
    else:
        cancellation = noise_cancellation.BVC()

    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(noise_cancellation=cancellation),
        ),
    )

    # AI speaks first — greet AFTER the session is live so the greeting isn't dropped.
    await session.generate_reply(
        instructions=(
            "Bắt máy: chào khách và xưng danh nhà xe, rồi hỏi MỘT câu mở để khách "
            "nói ra nhu cầu. Ví dụ: \"Dạ em chào anh chị, nhà xe Mai Anh xin nghe ạ. "
            "Anh chị cần đặt vé đi đâu ạ?\". Chỉ một hai câu ngắn. Tuyệt đối không "
            "hỏi dồn điểm đi, ngày và số vé cùng lúc. Chưa gọi công cụ nào ở lượt này."
        )
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    agents.cli.run_app(server)
