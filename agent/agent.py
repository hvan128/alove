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
import sys
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

BUS_AGENT_INSTRUCTIONS = (
    "Bạn là tổng đài viên đặt vé xe khách của VéĐi, nói tiếng Việt, giọng thân thiện, "
    "ngắn gọn, lịch sự (xưng \"em\", gọi khách \"anh/chị\").\n\n"
    "QUY TẮC BẮT BUỘC:\n"
    "- Bạn KHÔNG tự quyết định bất cứ điều gì về vé. Với MỖI lượt khách nói, hãy gọi ngay "
    "công cụ advance_booking và truyền NGUYÊN VĂN lời khách vào tham số customer_message.\n"
    "- Công cụ trả về đúng một câu — hãy đọc lại chính xác câu đó cho khách (có thể thêm một "
    "từ đệm rất ngắn như \"Dạ,\"). TUYỆT ĐỐI không tự bịa hoặc đổi giá, giờ chuyến, số ghế, "
    "tên khách, số điện thoại hay mã vé.\n"
    "- Nếu khách nói điều ngoài lề, vẫn gọi advance_booking với lời khách rồi đọc câu trả về.\n"
    "- Khi câu trả về có \"Mã vé\" (vé đã xác nhận), cảm ơn khách rồi gọi công cụ end_call.\n\n"
    "Mở đầu: chào khách và hỏi anh/chị muốn đi từ đâu đến đâu, ngày nào, mấy vé."
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


async def post_call_event(
    conversation_id: str, event_type: str, channel: str = "web", caller_number: Optional[str] = None
) -> None:
    """Audit-only notification to the web app; losing it never affects the call."""
    body: dict = {"conversationId": conversation_id, "type": event_type, "channel": channel}
    if caller_number:
        body["callerNumber"] = caller_number
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{NEXTJS_API_URL}/api/call/events",
                json=body,
                headers={"Authorization": f"Bearer {AGENT_WEBHOOK_SECRET}"},
            )
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
        return RuleBasedTurnDetector()
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

    logger.info(
        "Engine: cascade (stt=%s llm=%s tts=%s turn_detector=%s)",
        STT_PROVIDER, LLM_PROVIDER, TTS_PROVIDER, CASCADE_TURN_DETECTOR,
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
    """Relays every customer turn to the deterministic booking core and speaks the
    exact reply it returns. Holds the booking draft between turns and publishes the
    authoritative snapshot to the browser after each advance."""

    def __init__(self, conversation_id: Optional[str], room=None) -> None:
        super().__init__(instructions=BUS_AGENT_INSTRUCTIONS)
        self._conversation_id = conversation_id
        self._room = room
        self._draft = None  # None on the first turn; core initializes it
        self._ended = False

    async def _publish(self, payload: dict) -> None:
        if self._room is None:
            return
        try:
            await self._room.local_participant.publish_data(
                json.dumps(payload).encode(), topic=EVENTS_TOPIC, reliable=True
            )
        except Exception as exc:  # noqa: BLE001 — data-channel best-effort
            logger.debug("publish_data failed: %s", exc)

    @function_tool()
    async def advance_booking(self, context: RunContext, customer_message: str) -> str:
        """Relay the customer's latest utterance to the booking system and get the
        exact sentence to say back. Call this for EVERY customer turn, passing their
        words verbatim as customer_message. Never invent prices, times, seats,
        passenger details or ticket codes — only this tool is authoritative."""
        if not self._conversation_id:
            return BACKEND_ERROR_REPLY
        url = f"{NEXTJS_API_URL}/api/booking/advance"
        headers = {"Authorization": f"Bearer {AGENT_WEBHOOK_SECRET}"}
        body = {"conversationId": self._conversation_id, "draft": self._draft, "text": customer_message}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=body, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:  # noqa: BLE001 — booking backend down → safe fallback
            logger.error("advance_booking failed: %s", exc)
            return BACKEND_ERROR_REPLY
        self._draft = data.get("draft")
        await self._publish({"type": "booking.update", "booking": self._draft})
        return data.get("reply") or BACKEND_ERROR_REPLY

    @function_tool()
    async def end_call(self, context: RunContext):
        """End the call once the ticket is confirmed (the advance_booking reply
        contained a ticket code). Speak a short thank-you first, then call this."""
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

    agent = BusBookingAgent(conversation_id=conversation_id, room=ctx.room)
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
        instructions="Chào khách và hỏi anh/chị muốn đi từ đâu đến đâu, ngày nào, mấy vé."
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    agents.cli.run_app(server)
