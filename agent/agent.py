"""VéĐi bus-ticket voice agent (LiveKit).

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
from livekit.plugins import cartesia, google, noise_cancellation, openai, silero, speechmatics
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
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai/gpt-4.1-mini")
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
LIVEKIT_AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "vedi")
# A local `agent.py dev`/`console` worker shares the prod agent name and LiveKit
# load-balances across all workers under a name — a stray local worker would steal
# prod dispatches. Force a distinct "-dev" name in dev/console mode.
if any(cmd in sys.argv for cmd in ("dev", "console")) and not LIVEKIT_AGENT_NAME.endswith("-dev"):
    LIVEKIT_AGENT_NAME = f"{LIVEKIT_AGENT_NAME}-dev"
    logger.info("Dev/console mode → agent name forced to %s (isolated from prod)", LIVEKIT_AGENT_NAME)

# Data-channel topic shared with the browser (see apps/web livekit-call.tsx).
EVENTS_TOPIC = "vedi-events"

ROOM_PREFIX = "booking-"

def bus_agent_instructions(today_vn: str) -> str:
    """System prompt. The model owns the CONVERSATION — understanding whatever the
    caller says, in any phrasing, and holding a natural exchange. It owns none of
    the FACTS: departures, prices, seats and ticket codes come back from tools that
    read the database, so the model can restate them but never make them up."""
    return (
        "Bạn là nhân viên tổng đài nhà xe VéĐi, đang nghe điện thoại. Xưng \"em\", gọi khách "
        "là \"anh\" hoặc \"chị\".\n\n"
        f"Hôm nay là {today_vn} (giờ Việt Nam). Tự quy ngày khách nói ra ngày cụ thể: "
        "\"mai\", \"ngày 20 tháng 7\", \"thứ sáu tuần này\", \"cuối tuần\"...\n\n"
        "NÓI CHUYỆN NHƯ NGƯỜI THẬT:\n"
        "- Câu ngắn. Mỗi lượt nói một hai câu thôi, đừng đọc một tràng dài.\n"
        "- Mở đầu bằng \"Dạ\", \"Vâng\", \"Dạ rồi\" cho tự nhiên, nhưng đừng lặp mãi một chữ.\n"
        "- Nghe khách xong thì đáp lại cái vừa nghe rồi mới hỏi tiếp, đừng hỏi trống không.\n"
        "- Đừng bao giờ hỏi lại thứ khách đã nói. Nhớ hết những gì khách đã cung cấp.\n"
        "- Đừng nói kiểu liệt kê biểu mẫu (\"điểm đi, điểm đến, ngày đi và số vé\"). Hỏi từng "
        "thứ một cách tự nhiên: \"Dạ anh đi ngày nào ạ?\"\n"
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
        "- Khách chọn chuyến thì gọi hold_seats, rồi xin họ tên và số điện thoại.\n"
        "- Đọc lại cho khách nghe, khách đồng ý mới gọi confirm_booking.\n"
        "- Báo mã vé, chúc đi đường bình an, rồi gọi end_call.\n"
        "- Khách muốn đổi chuyến hoặc bỏ vé đã đặt thì gọi cancel_booking rồi tìm chuyến khác.\n\n"
        "KHÔNG ĐƯỢC:\n"
        "- Không tự nghĩ ra chuyến, giờ chạy, giá vé, số ghế trống hay mã vé. Những thứ đó chỉ "
        "lấy từ kết quả công cụ. Chưa gọi công cụ thì chưa được nói.\n"
        "- search_trips không có chuyến nào thì nói thật, rồi gợi ý tuyến nhà xe đang chạy.\n"
        "- Không hứa giữ đủ ghế khi hold_seats báo còn ít hơn."
    )

# Spoken when the booking backend is unreachable — never leave the caller in silence.
BACKEND_ERROR_REPLY = "Dạ xin lỗi anh chị, hệ thống đặt vé đang bận, anh chị chờ em một chút ạ."
CLOSING_LINE = "Dạ cảm ơn anh chị đã đặt vé qua VéĐi. Chúc anh chị đi đường bình an ạ!"


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


def _cascade_tts(language: str):
    """Preferred: Google Cloud TTS (Chirp3-HD) when creds are set; else Cartesia
    direct; else the gateway provider string. VALSEA has no TTS in this workspace,
    so VALSEA mode reuses this TTS chain."""
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

    valsea      : VALSEA realtime ASR (VéĐi brief default) — see valsea_stt.py.
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


def build_agent_session(language: str, vad=None) -> AgentSession:
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
    tts_route = (
        f"google-chirp3:{GOOGLE_TTS_VOICE}" if _google_tts_creds() is not None
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
        self._ended = False
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

        Trả về danh sách chuyến kèm giờ chạy, loại xe, giá và số ghế còn trống.
        Nếu trips rỗng thì tuyến/ngày đó KHÔNG có chuyến — hãy nói thật, và dùng
        servedRoutes để gợi ý tuyến nhà xe đang chạy. Không được tự nghĩ ra chuyến.
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
    async def cancel_booking(self, context: RunContext) -> dict:
        """Huỷ vé đã đặt trong cuộc gọi này và trả ghế lại cho khách khác.

        Gọi khi khách đổi ý, muốn đổi chuyến hoặc đổi giờ sau khi đã xuất vé.
        Huỷ xong thì tìm chuyến mới bằng search_trips như bình thường.
        cancelled=false nghĩa là không có vé nào để huỷ — nói thật với khách.
        """
        if not self._conversation_id:
            return {"error": "no_conversation"}
        data = await self._call_api(
            "/api/booking/cancel", {"conversationId": self._conversation_id}
        )
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
                await context.session.say(CLOSING_LINE, allow_interruptions=False)
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
        "VéĐi agent connected — room=%s conversation=%s channel=%s",
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
    session = build_agent_session("vi", vad=ctx.proc.userdata.get("vad"))

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
            "Chào khách thật tự nhiên và hỏi anh/chị muốn đi từ đâu đến đâu, "
            "ngày nào và mấy vé. Chưa gọi công cụ nào ở lượt này."
        )
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    agents.cli.run_app(server)
