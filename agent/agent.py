"""Alove bus-ticket voice agent (LiveKit).

The model owns the conversation, while the Next.js booking APIs remain
server-authoritative for inventory, holds, confirmations, lookups and cancellations.
The worker publishes live UI events over the room data channel and posts final
transcripts plus booking snapshots to the web app's audit endpoint.

Three A/B-testable engine configs (env `AGENT_ENGINE` + `STT_PROVIDER`):
  - VALSEA-first : AGENT_ENGINE=cascade  STT_PROVIDER=valsea       (recommended)
  - cascade      : AGENT_ENGINE=cascade  STT_PROVIDER=speechmatics
  - gemini-sts   : AGENT_ENGINE=gemini-sts                         (speech-to-speech)
"""

import asyncio
import json
import logging
import os
import random
import re
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    AudioConfig,
    BackgroundAudioPlayer,
    JobContext,
    JobProcess,
    RunContext,
    function_tool,
    metrics,
    room_io,
    stt,
)
from livekit.agents.llm import StopResponse
from livekit.plugins import cartesia, google, noise_cancellation, openai, silero, speechmatics
from livekit.plugins.speechmatics import OperatingPoint
from google.cloud import texttospeech
from google.genai import types

from booking_helpers import (
    build_booking_snapshot,
    build_confirmation_request,
    build_realtime_event,
    encode_realtime_event,
)
from call_lifecycle import terminate_livekit_call
from latency_metrics import TurnLatencyAggregator
from provider_config import (
    non_valsea_warning,
    resolve_engine_and_stt,
    validate_required_credentials,
)
from valsea_api import ValseaAPIClient

# Load agent/.env by absolute path so engine mode is picked up regardless of cwd.
load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger(__name__)

# --- Engine + provider selection -------------------------------------------------
# cascade = STT -> LLM -> TTS (default). gemini-sts = single Gemini Live S2S model.
AGENT_ENGINE, STT_PROVIDER = resolve_engine_and_stt(
    os.getenv("AGENT_ENGINE"), os.getenv("STT_PROVIDER")
)
# Cascade STT backend: valsea | speechmatics | openai. Gemini does not use this
# setting, so stale cascade-only STT env cannot block a Gemini worker startup.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai/gpt-4.1")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "cartesia/sonic-3")

# Direct provider keys — when set, the cascade talks to the provider directly
# (bypasses LiveKit's inference gateway + its credit quota). Absent → gateway string.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "").strip()
SPEECHMATICS_API_KEY = os.getenv("SPEECHMATICS_API_KEY", "").strip()
VALSEA_API_KEY = os.getenv("VALSEA_API_KEY", "").strip()

# Google Cloud TTS (Chirp3-HD) — preferred TTS when a GCP service account is set:
# native-ish Vietnamese + true streaming. Provide inline JSON (rides --env-file) or a path.
GOOGLE_TTS_CREDENTIALS_JSON = os.getenv("GOOGLE_TTS_CREDENTIALS_JSON", "")
GOOGLE_TTS_CREDENTIALS_FILE = os.getenv("GOOGLE_TTS_CREDENTIALS_FILE", "")
GOOGLE_TTS_VOICE = os.getenv("GOOGLE_TTS_VOICE", "Kore")


# Gemini Live (speech-to-speech) config, only used when AGENT_ENGINE=gemini-sts.
GEMINI_LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest")
GEMINI_LIVE_VOICE = os.getenv("GEMINI_LIVE_VOICE", "Puck")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
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

# Next.js seam — the only place booking state changes and audit events persist.
# All agent-only endpoints use the same shared secret.
NEXTJS_API_URL = os.getenv("NEXTJS_API_URL", "http://localhost:3000").rstrip("/")
AGENT_WEBHOOK_SECRET = os.getenv("AGENT_WEBHOOK_SECRET", "")
if len(AGENT_WEBHOOK_SECRET.encode()) < 32:
    raise RuntimeError("AGENT_WEBHOOK_SECRET must contain at least 32 bytes")

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

# Câu đệm lấp chặng im lặng ngay sau khi khách nói xong. Phát bằng session.say
# kèm text nên vừa đúng giọng ghi sẵn vừa hiện lên transcript như một lượt nói
# thật — BackgroundAudioPlayer không làm được điều thứ hai.
#
# Bắn ngay lúc lượt khách chốt, KHÔNG chờ mô hình nghĩ xong, nên nó phủ trọn
# khoảng chờ chứ không phải chỉ phần đuôi.
THINKING_CLIPS = ["da.wav", "um.wav", "da-vang.wav", "vang.wav"]
THINKING_SOUND_ON = os.getenv("THINKING_SOUND", "on").lower() == "on"
SOUND_SAMPLE_RATE = 24000


def load_thinking_clips() -> list:
    """Đường dẫn các clip câu đệm còn tồn tại."""
    base = Path(__file__).resolve().parent / "sounds"
    clips = []
    for name in THINKING_CLIPS:
        path = base / name
        if path.exists():
            clips.append(str(path))
        else:
            logger.warning("thiếu câu đệm %s", path)
    return clips

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
        "- ĐỪNG mở đầu câu bằng \"Dạ\", \"Vâng\" hay \"Ừm\". Hệ thống đã tự phát câu đệm "
        "trong lúc bạn nghĩ, nên bạn mở đầu bằng mấy chữ đó nữa là khách nghe lặp hai lần. "
        "Vào thẳng nội dung.\n"
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
        "AI NÓI KẾT QUẢ:\n"
        "- search_trips: công cụ chỉ trả dữ liệu, CHÍNH BẠN đọc các chuyến cho khách nghe, "
        "nói tự nhiên và gợi ý giúp khách chọn.\n"
        "- hold_seats, confirm_booking, cancel_booking: hệ thống TỰ ĐỌC kết quả cho khách ngay "
        "sau khi công cụ chạy xong. Bạn chỉ cần nói câu báo đang xử lý trước khi gọi, rồi "
        "dừng lại. Đừng nói lại số ghế, giá tiền hay mã vé nữa — khách đã nghe rồi.\n\n"
        "IM LẶNG KHI GỌI CÔNG CỤ:\n"
        "- Trước khi gọi công cụ, ĐỪNG nói gì cả. Hệ thống đã tự phát câu đệm ngay khi khách "
        "vừa dứt lời, nên bạn nói thêm 'em kiểm tra nhé' nữa là khách phải nghe hai câu chờ "
        "rồi mới tới kết quả. Cứ gọi công cụ, có kết quả thì nói luôn.\n\n"
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
        "- Khách đổi ý ngay trong cuộc gọi này thì gọi cancel_booking không có tham số, "
        "rồi tìm chuyến khác.\n"
        "- Khách gọi lại để hỏi, đổi hay huỷ vé đã đặt HÔM TRƯỚC thì vé đó không thuộc cuộc "
        "gọi này. Phải hỏi CẢ mã vé VÀ số điện thoại lúc đặt rồi mới gọi find_booking. "
        "Đọc lại vé tìm được cho khách xác nhận đúng vé trước khi huỷ, rồi truyền cả mã vé "
        "và số điện thoại đó vào cancel_booking.\n\n"
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
_valsea_http_client: Optional[httpx.AsyncClient] = None
_valsea_api_client: Optional[ValseaAPIClient] = None
_background_tasks: set[asyncio.Task] = set()


def schedule_background(coroutine) -> None:
    """Keep a strong reference until a best-effort background job finishes."""
    task = asyncio.create_task(coroutine)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


def api_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=10.0,
            headers={"Authorization": f"Bearer {AGENT_WEBHOOK_SECRET}"},
            limits=httpx.Limits(max_keepalive_connections=4, keepalive_expiry=300.0),
        )
    return _http_client


def valsea_annotation_client() -> Optional[ValseaAPIClient]:
    """Return a lazy keep-alive client when advisory annotations are configured."""
    global _valsea_http_client, _valsea_api_client
    if not VALSEA_API_KEY:
        return None
    if _valsea_http_client is None or _valsea_http_client.is_closed:
        _valsea_http_client = httpx.AsyncClient(
            timeout=3.0,
            limits=httpx.Limits(max_keepalive_connections=2, keepalive_expiry=300.0),
        )
        _valsea_api_client = ValseaAPIClient(
            api_key=VALSEA_API_KEY,
            http_client=_valsea_http_client,
        )
    return _valsea_api_client


async def annotate_final_customer_transcript(agent, source_transcript: str) -> None:
    """Publish advisory VALSEA evidence without touching conversation/booking state."""
    try:
        client = valsea_annotation_client()
        if client is None:
            return
        annotation = await client.annotate(source_transcript)
        payload: dict = {
            "type": "semantic.annotation",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sourceTranscript": source_transcript,
            "tags": [tag.display for tag in annotation.semantic_tags],
            "annotations": [item.display for item in annotation.annotations],
        }
        if annotation.text != source_transcript:
            payload["correctedText"] = annotation.text
        await agent._publish(payload)
    except Exception as exc:  # noqa: BLE001 — advisory evidence must never break a call
        logger.warning("VALSEA annotation failed: %s", exc)


async def post_call_event(
    conversation_id: str,
    event_type: str,
    channel: Optional[str] = None,
    caller_number: Optional[str] = None,
    *,
    event_id: Optional[str] = None,
    sequence: Optional[int] = None,
    role: Optional[str] = None,
    text: Optional[str] = None,
    booking: Optional[dict] = None,
) -> None:
    """Post audit data with bounded retries without changing booking outcomes."""
    body: dict = {"conversationId": conversation_id, "type": event_type}
    if channel:
        body["channel"] = channel
    if caller_number:
        body["callerNumber"] = caller_number
    if event_id:
        body["eventId"] = event_id
    if sequence is not None:
        body["sequence"] = sequence
    if role:
        body["role"] = role
    if text:
        body["text"] = text
    if booking is not None:
        body["booking"] = booking
    for attempt in range(3):
        try:
            response = await api_client().post(f"{NEXTJS_API_URL}/api/call/events", json=body)
            response.raise_for_status()
            return
        except Exception as exc:  # noqa: BLE001
            if attempt == 2:
                logger.warning("post_call_event(%s) failed after retries: %s", event_type, exc)
                return
            await asyncio.sleep(0.25 * (2**attempt))


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


def _cascade_tts(language: str):
    """Preferred: Google Cloud TTS (Chirp3-HD) when creds are set; else Cartesia
    direct; else the gateway provider string. VALSEA has no TTS in this workspace,
    so VALSEA mode reuses this TTS chain."""
    gcreds = _google_tts_creds()
    if gcreds is not None:
        loc = "en-US" if language == "en" else "vi-VN"
        # Plugin mặc định audio_encoding=PCM, nhưng giọng Chirp3-HD chỉ nhận
        # LINEAR16, MP3 hoặc OGG_OPUS và trả lỗi ngay khi tổng hợp — nhánh Google
        # sẽ câm tiếng nếu không chỉ định.
        return google.TTS(
            language=loc,
            voice_name=f"{loc}-Chirp3-HD-{GOOGLE_TTS_VOICE}",
            use_streaming=True,
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
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
        if not VALSEA_API_KEY:
            raise ValueError("VALSEA_API_KEY is required when STT_PROVIDER=valsea")
        from valsea_stt import VALSEASTT
        return VALSEASTT(
            api_key=VALSEA_API_KEY,
            language=("en" if language == "en" else "vi"),
        )
    if STT_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required when STT_PROVIDER=openai")
        return _openai_stt(language)
    # speechmatics (explicit A/B route)
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


def build_agent_session(language: str, vad=None) -> AgentSession:
    validate_required_credentials(
        AGENT_ENGINE,
        STT_PROVIDER,
        valsea_api_key=VALSEA_API_KEY,
        openai_api_key=OPENAI_API_KEY,
        gemini_api_key=GEMINI_API_KEY,
    )
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
        else "openai" if STT_PROVIDER == "openai"
        else "speechmatics+openai-fallback" if (SPEECHMATICS_API_KEY and OPENAI_API_KEY)
        else "speechmatics" if SPEECHMATICS_API_KEY
        else "gateway"
    )
    tts_route = (
        f"google-chirp3:{GOOGLE_TTS_VOICE}" if _google_tts_creds() is not None
        else f"cartesia:{TTS_PROVIDER}" if CARTESIA_API_KEY
        else "gateway"
    )
    logger.info(
        "Engine: cascade (stt=%s llm=%s tts=%s turn_detector=%s)",
        stt_route, "direct" if OPENAI_API_KEY else "gateway", tts_route, CASCADE_TURN_DETECTOR,
    )
    warning = non_valsea_warning(STT_PROVIDER)
    if warning:
        logger.warning(warning)
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
        tts=_cascade_tts(language),
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
        self._latency_aggregator = TurnLatencyAggregator()
        self._ended = False
        # Chỉ bật khi confirm_booking thật sự ra vé, dùng để chọn câu kết.
        self._booked = False
        # Last offers/hold, mirrored to the browser so the ticket card matches
        # what the caller is being told.
        self._selected_trip: Optional[dict] = None
        self._offers: dict[str, dict] = {}
        self._thinking_clips = load_thinking_clips() if THINKING_SOUND_ON else []
        self._last_filler: Optional[str] = None
        self._filler_player = None
        # Epoch-millisecond buckets keep ordering monotonic across a worker
        # redispatch/restart; the final three digits order same-process events.
        self._event_sequence = (time.time_ns() // 1_000_000) * 1_000
        # Updated synchronously from conversation_item_added before the model can
        # execute confirm_booking for that user turn.
        self._latest_final_user_transcript: Optional[str] = None

    def _next_event_sequence(self) -> int:
        self._event_sequence = max(
            self._event_sequence + 1,
            (time.time_ns() // 1_000_000) * 1_000,
        )
        return self._event_sequence

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        """Phát câu đệm ngay khi lượt khách chốt, trước cả khi mô hình kịp nghĩ.

        Phát bằng player chứ không phải session.say: say kèm text sẽ đẩy câu đệm
        lên transcript như một lượt nói thật, làm bản ghi hội thoại rối vì toàn
        những tiếng ừm với dạ không mang nội dung gì.

        Bắn ở đây chứ không bám trạng thái "đang nghĩ" của phiên: trạng thái đó
        vào lần thứ hai sau khi agent vừa nói câu báo đang tra cứu, nên câu đệm
        chen vào giữa hai câu của chính agent, nghe rất giả."""
        player = self._filler_player
        if player is None or not self._thinking_clips:
            return
        choices = [c for c in self._thinking_clips if c != self._last_filler] or self._thinking_clips
        path = random.choice(choices)
        self._last_filler = path
        try:
            player.play(AudioConfig(path, volume=1.0, fade_out=0.15))
        except Exception as exc:  # noqa: BLE001 — câu đệm hỏng không được làm chết lượt
            logger.warning("không phát được câu đệm: %s", exc)

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
        if self._room is None or not self._conversation_id:
            return
        sequence = self._next_event_sequence()
        event_id = uuid.uuid4().hex
        event = build_realtime_event(
            call_id=self._conversation_id,
            event_id=event_id,
            sequence=sequence,
            payload=payload,
        )
        try:
            encoded_event = encode_realtime_event(event)
        except Exception:  # noqa: BLE001 — data-channel encoding is best-effort
            logger.debug("realtime event dropped: invalid JSON or byte limit")
        else:
            try:
                await self._room.local_participant.publish_data(
                    encoded_event, topic=EVENTS_TOPIC, reliable=True
                )
            except Exception as exc:  # noqa: BLE001 — data-channel best-effort
                logger.debug("publish_data failed: %s", exc)
        if payload.get("type") == "booking.update" and isinstance(payload.get("booking"), dict):
            schedule_background(
                post_call_event(
                    self._conversation_id,
                    "booking.updated",
                    event_id=event_id,
                    sequence=sequence,
                    booking=payload["booking"],
                )
            )

    def _draft_payload(self, **over) -> dict:
        """A complete BookingSnapshot for the browser's ticket card.

        The card reads every field (and calls .join on the arrays), so a partial
        object would blow up the UI — always send the whole shape, using nulls and
        empty lists for what is not known yet."""
        return build_booking_snapshot(
            self._conversation_id or "local-console",
            self._selected_trip,
            **over,
        )

    async def _say_result(self, context: RunContext, text: str):
        """Đọc thẳng kết quả công cụ rồi dừng, không cho mô hình chạy vòng hai.

        Vòng LLM thứ hai chỉ làm mỗi việc diễn đạt lại dữ liệu đã đầy đủ và chính
        xác, đo được tốn khoảng 730ms mỗi lượt, lại thêm rủi ro mô hình đọc sai
        con số. Câu đệm ở vòng một vẫn đang phát nên khách không nghe im lặng;
        chờ nó phát xong rồi mới đọc kết quả cho khỏi chồng tiếng.

        Chuẩn hoá tại chỗ vì câu này không đi qua đường sinh lời thông thường."""
        handle = getattr(context, "speech_handle", None)
        if handle is not None:
            try:
                await handle.wait_for_playout()
            except Exception:
                pass
        try:
            result_handle = context.session.say(
                normalize_for_speech(text),
                allow_interruptions=True,
            )
            parent_speech_id = getattr(handle, "id", None)
            child_speech_id = getattr(result_handle, "id", None)
            if isinstance(parent_speech_id, str) and isinstance(child_speech_id, str):
                self._latency_aggregator.link_speech(
                    child_speech_id=child_speech_id,
                    parent_speech_id=parent_speech_id,
                )
            await result_handle
        except Exception as exc:  # noqa: BLE001 — nói hỏng thì để mô hình tự xoay
            logger.warning("say kết quả thất bại: %s", exc)
            return
        raise StopResponse()

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
        # Gộp thêm otherDates: model được phép mời khách các chuyến trong danh
        # sách đó, nên chúng cũng phải nằm trong kho offer. Gộp chứ không thay
        # thế, vì lần tìm sau (ngày khác, tuyến khác) không được xoá chuyến mà
        # khách đang cân nhắc — mất offer là mất luôn tuyến, ngày và loại xe
        # trên vé.
        for offer in (data.get("trips") or []) + (data.get("otherDates") or []):
            trip_id = offer.get("tripId")
            if trip_id:
                self._offers[trip_id] = offer
        return data

    @function_tool()
    async def hold_seats(self, context: RunContext, trip_id: str, passengers: int) -> dict:
        """Giữ chỗ THẬT trên một chuyến, dùng trip_id lấy từ search_trips.

        Việc giữ chỗ là all-or-nothing theo số khách yêu cầu. held=false nghĩa là
        không còn đủ chỗ; không được hứa hoặc tự giảm số khách.
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
        noun = data.get("seatNoun") or "chỗ"
        if not data.get("held"):
            return await self._say_result(
                context, f"Dạ chuyến này hết {noun} rồi ạ. Anh chị muốn em tìm chuyến khác không ạ?"
            )
        await self._publish(
            {"type": "booking.update", "booking": self._draft_payload(status="trip_proposed")}
        )
        codes = ", ".join(data.get("seatCodes") or [])
        total = f"{data.get('totalVnd', 0):,}".replace(",", ".")
        return await self._say_result(
            context,
            f"Dạ em giữ được {noun} {codes}, tổng {total} đồng ạ. "
            f"Anh chị cho em xin họ tên và số điện thoại nhé.",
        )

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
        request_body = build_confirmation_request(
            conversation_id=self._conversation_id,
            trip_id=trip_id,
            passenger_name=passenger_name,
            phone=phone,
            latest_final_user_transcript=self._latest_final_user_transcript,
        )
        if request_body is None:
            logger.warning("confirm_booking blocked: no final customer transcript")
            return {"error": "missing_confirmation_transcript"}
        data = await self._call_api(
            "/api/booking/confirm",
            request_body,
        )
        if data is None:
            return {"error": "backend_unavailable"}
        if not data.get("confirmed"):
            return await self._say_result(
                context,
                "Dạ chỗ em giữ đã hết hạn mất rồi ạ. Em giữ lại cho mình nhé?",
            )
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
            noun = (self._selected_trip or {}).get("seatNoun") or "chỗ"
            codes = ", ".join(data.get("seatCodes") or [])
            total = f"{data.get('totalVnd', 0):,}".replace(",", ".")
            return await self._say_result(
                context,
                f"Dạ vé của anh chị xong rồi ạ. Mã vé {data.get('code')}. "
                f"{noun.capitalize()} {codes}, tổng {total} đồng. "
                f"Xe đón tại {data.get('pickupPoint')} lúc {data.get('departureLabel')} ạ.",
            )
        return data

    @function_tool()
    async def find_booking(self, context: RunContext, code: str = "", phone: str = "") -> dict:
        """Tra vé đã đặt TRƯỚC ĐÓ, ở cuộc gọi khác.

        Dùng khi khách gọi lại để hỏi, đổi hoặc huỷ vé đã đặt hôm trước. Vì đây là
        dữ liệu nhạy cảm, phải truyền CẢ mã vé VÀ số điện thoại khách dùng lúc đặt.
        Trả về danh sách vé còn hiệu lực kèm tuyến, giờ chạy và ghế.

        bookings rỗng nghĩa là không tìm thấy — hỏi lại khách cả mã vé và số điện
        thoại, đừng đoán.
        """
        code = (code or "").strip()
        phone = (phone or "").strip()
        if not code or not phone:
            return {"error": "need_code_and_phone"}
        data = await self._call_api("/api/booking/lookup", {"code": code, "phone": phone})
        if data is None:
            return {"error": "backend_unavailable"}
        return data

    @function_tool()
    async def cancel_booking(self, context: RunContext, code: str = "", phone: str = "") -> dict:
        """Huỷ vé và trả ghế lại cho khách khác.

        Không truyền gì thì huỷ vé vừa đặt trong chính cuộc gọi này. Khách gọi lại
        để huỷ vé cũ thì phải truyền cả mã vé và số điện thoại lúc đặt.
        Huỷ xong muốn đổi chuyến thì gọi search_trips như bình thường.
        cancelled=false nghĩa là không tìm thấy vé nào để huỷ — nói thật với khách.
        """
        if not self._conversation_id:
            return {"error": "no_conversation"}
        code = (code or "").strip()
        phone = (phone or "").strip()
        if bool(code) != bool(phone):
            return {"error": "need_code_and_phone"}
        body: dict = {"conversationId": self._conversation_id}
        if code:
            body["code"] = code
        if phone:
            body["phone"] = phone
        data = await self._call_api("/api/booking/cancel", body)
        if data is None:
            return {"error": "backend_unavailable"}
        if not data.get("cancelled"):
            return await self._say_result(
                context,
                "Dạ em không tìm thấy vé nào để huỷ ạ. Anh chị đọc lại giúp em mã vé "
                "và số điện thoại lúc đặt nhé?",
            )
        self._selected_trip = None
        await self._publish({"type": "booking.update", "booking": self._draft_payload()})
        return await self._say_result(
            context,
            f"Dạ em huỷ vé {data.get('code')} rồi ạ. Anh chị cần em tìm chuyến khác không?",
        )

    @function_tool()
    async def end_call(self, context: RunContext):
        """Kết thúc cuộc gọi sau khi đã báo mã vé cho khách (hoặc khách không đặt
        nữa). Nói lời cảm ơn ngắn trước, rồi gọi công cụ này."""
        if self._ended:
            raise StopResponse()
        self._ended = True
        handle = context.speech_handle
        try:
            # LiveKit 1.6 forbids awaiting the owning SpeechHandle from inside
            # its function tool (that is a circular wait). RunContext exposes
            # the pre-tool playout boundary specifically for this case.
            await context.wait_for_playout()
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
        # StopResponse only stops model generation. Deleting the LiveKit room is
        # what disconnects every remote participant, including an inbound SIP
        # caller; then shut down the worker job so its audit callbacks run.
        await terminate_livekit_call(agents.get_job_context())
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
        schedule_background(post_call_event(conversation_id, "call.started", channel, caller_number))

        async def _post_call_ended() -> None:
            pending = list(_background_tasks)
            if pending:
                await asyncio.wait(pending, timeout=3.0)
            await post_call_event(conversation_id, "call.ended", channel, caller_number)

        ctx.add_shutdown_callback(_post_call_ended)

    today_vn = datetime.now(timezone(timedelta(hours=7))).strftime("%d/%m/%Y")
    agent = BusBookingAgent(conversation_id=conversation_id, room=ctx.room, today_vn=today_vn)
    session = build_agent_session("vi", vad=ctx.proc.userdata.get("vad"))

    # A committed conversation item is the final transcript for both cascade and
    # realtime engines. Capture the customer text synchronously so a tool call in
    # the same turn can attach the actual confirmation words to the booking write.
    def _on_conversation_item_added(ev) -> None:
        item = getattr(ev, "item", None)
        raw_role = getattr(item, "role", "")
        item_role = str(getattr(raw_role, "value", raw_role)).lower()
        audit_role = {"user": "customer", "assistant": "agent"}.get(item_role)
        text = (getattr(item, "text_content", None) or "").strip()
        if audit_role is None or not text:
            return
        if audit_role == "customer":
            agent._latest_final_user_transcript = text
        if conversation_id:
            item_id = getattr(item, "id", None)
            event_id = f"transcript-{item_id}" if item_id else uuid.uuid4().hex
            schedule_background(
                post_call_event(
                    conversation_id,
                    "transcript.final",
                    channel,
                    caller_number,
                    event_id=event_id,
                    sequence=agent._next_event_sequence(),
                    role=audit_role,
                    text=text,
                )
            )
            if audit_role == "customer":
                # Annotation is advisory and deliberately runs after the final
                # transcript has claimed its ordered sequence number.
                schedule_background(annotate_final_customer_transcript(agent, text))

    session.on("conversation_item_added", _on_conversation_item_added)

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
            state = str(getattr(raw, "value", raw)).lower()
            if state == "initializing":
                state = "idle"
            if state not in {"idle", "listening", "thinking", "speaking"}:
                logger.debug("ignore unknown agent state: %s", state)
                return
            asyncio.create_task(agent._publish({"type": "agent.state", "state": state}))
        except Exception as exc:
            logger.debug("publish agent state failed: %s", exc)

    session.on("agent_state_changed", _on_agent_state)

    usage_collector = metrics.UsageCollector()
    latency_aggregator = agent._latency_aggregator

    # Preemptive generation makes these stages overlap, so never add them into a
    # fake end-to-end total. Publish all stages and label only the slowest one:
    #   eou  = từ lúc khách ngừng nói tới lúc chốt lượt (gồm cả thời gian chờ im lặng)
    #   ttft = từ lúc bắt đầu request LLM tới token đầu tiên
    #   ttfb = từ lúc bắt đầu request TTS tới mẫu âm thanh đầu tiên
    def _on_metrics(ev) -> None:
        try:
            usage_collector.collect(ev.metrics)
        except Exception as exc:
            logger.debug("metrics collect failed: %s", exc)
        try:
            m = ev.metrics
            kind = getattr(m, "type", None)
            speech = getattr(m, "speech_id", None) or "?"
            if kind == "eou_metrics":
                logger.info(
                    "[latency] eou=%.0fms transcript=%.0fms speech=%s",
                    (getattr(m, "end_of_utterance_delay", 0) or 0) * 1000,
                    (getattr(m, "transcription_delay", 0) or 0) * 1000,
                    speech,
                )
            elif kind == "llm_metrics" and not getattr(m, "cancelled", False):
                logger.info("[latency] ttft=%.0fms speech=%s", (getattr(m, "ttft", 0) or 0) * 1000, speech)
            elif kind == "tts_metrics" and not getattr(m, "cancelled", False):
                logger.info("[latency] ttfb=%.0fms speech=%s", (getattr(m, "ttfb", 0) or 0) * 1000, speech)
            turn_latency = latency_aggregator.observe(m)
            if turn_latency is not None:
                schedule_background(agent._publish(turn_latency.to_event_payload()))
        except Exception as exc:
            logger.debug("latency log failed: %s", exc)

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

    # Player cho câu đệm. KHÔNG truyền agent_session: làm vậy LiveKit sẽ tự phát
    # theo trạng thái "đang nghĩ", tức là phát cả ở vòng gọi mô hình thứ hai và
    # chen vào giữa hai câu của chính agent. Ở đây chỉ phát khi được gọi tay từ
    # on_user_turn_completed.
    if THINKING_SOUND_ON and agent._thinking_clips:
        filler_player = BackgroundAudioPlayer()
        try:
            await filler_player.start(room=ctx.room)
            agent._filler_player = filler_player
            ctx.add_shutdown_callback(filler_player.aclose)
            logger.info("Câu đệm: %d clip", len(agent._thinking_clips))
        except Exception as exc:  # noqa: BLE001
            logger.warning("không bật được câu đệm: %s", exc)

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
