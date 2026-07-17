"""VéĐi LiveKit worker: VALSEA RTT STT, guarded LLM, and Vietnamese TTS."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import sys
import time
import uuid
from collections.abc import AsyncIterable, AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    ModelSettings,
    StopResponse,
    llm,
    room_io,
    stt,
)
from livekit.plugins import noise_cancellation, openai, silero

from booking_policy import (
    AgentMode,
    BookingVoicePolicy,
    caller_identity_for_session,
    session_code_from_dispatch,
)
from valsea_stt import DEFAULT_HINT_TEXT, ValseaRealtimeClient

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger("vedi.agent")
EVENT_TOPIC = "vedi.events"
VALSEA_BASE_URL = "https://api.valsea.ai/v1"
BASE_AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "vedi-booking-agent").strip()
AGENT_NAME = BASE_AGENT_NAME or "vedi-booking-agent"
if any(command in sys.argv for command in ("dev", "console")) and not AGENT_NAME.endswith("-dev"):
    AGENT_NAME = f"{AGENT_NAME}-dev"

BOOKING_INSTRUCTIONS = """
Bạn là tổng đài viên AI của nhà xe VéĐi, hỗ trợ đặt vé xe khách bằng tiếng Việt.
Chỉ dùng thông tin khách đã nói; tuyệt đối không tự bịa hành trình, giờ, giá, ghế
hoặc thông tin cá nhân. Mỗi lượt trả lời tối đa hai câu ngắn. Xác nhận ngắn gọn
thông tin vừa nghe và hỏi tối đa hai dữ kiện còn thiếu. Các dữ kiện quan trọng gồm
điểm đi, điểm đến, ngày đi, giờ mong muốn, số khách, họ tên, số điện thoại, điểm đón
và điểm trả. Nếu có mâu thuẫn, hỏi lại thay vì chọn thay khách.
Không tuyên bố đã đặt vé hoặc thanh toán thành công; nhân viên phải xác nhận cuối cùng.
""".strip()


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex}"


class RoomEventPublisher:
    def __init__(self, room: rtc.Room, session_code: str) -> None:
        self.room = room
        self.session_code = session_code
        self.started_at = time.monotonic()

    def elapsed_ms(self) -> int:
        return max(0, int((time.monotonic() - self.started_at) * 1000))

    async def publish(self, event_type: str, **payload: Any) -> None:
        event = {
            "version": 1,
            "eventId": new_id(event_type.replace(".", "-")),
            "sessionCode": self.session_code,
            "occurredAt": utc_now(),
            "type": event_type,
            **payload,
        }
        await self.room.local_participant.publish_data(
            json.dumps(event, ensure_ascii=False, separators=(",", ":")),
            reliable=True,
            topic=EVENT_TOPIC,
        )

    async def status(
        self,
        *,
        state: str,
        valsea: str,
        agent: str,
        detail: str | None = None,
        caller_present: bool = True,
    ) -> None:
        await self.publish(
            "session.status",
            transport="livekit",
            state=state,
            callerPresent=caller_present,
            valsea=valsea,
            agent=agent,
            detail=detail,
        )

    async def transcript(
        self,
        *,
        kind: str,
        role: str,
        text: str,
        confidence: float | None,
        channel: str = "voice",
        ended_at_ms: int | None = None,
    ) -> None:
        event_id = new_id(f"{kind}-{role}")
        message_id = (
            f"message-live-{self.session_code}"
            if kind == "partial"
            else f"message-{event_id}"
        )
        await self.publish(
            f"transcript.{kind}",
            message={
                "id": message_id,
                "role": role,
                "text": text,
                "language": "vi",
                "translations": {},
                "confidence": confidence,
                "startedAtMs": 0,
                "endedAtMs": ended_at_ms if ended_at_ms is not None else self.elapsed_ms(),
                "channel": channel,
            },
        )

    async def agent_state(self, state: str, detail: str | None = None) -> None:
        await self.publish("agent.state", state=state, detail=detail)

    async def error(self, code: str, message: str, *, recoverable: bool) -> None:
        await self.publish(
            "agent.error",
            code=code,
            message=message,
            recoverable=recoverable,
        )


class VediBookingAgent(Agent):
    def __init__(
        self,
        *,
        valsea_api_key: str,
        publisher: RoomEventPublisher,
        auto_available: bool,
    ) -> None:
        super().__init__(instructions=BOOKING_INSTRUCTIONS)
        self.policy = BookingVoicePolicy()
        self.publisher = publisher
        self.valsea_api_key = valsea_api_key
        self.auto_available = auto_available
        self._valsea_client: ValseaRealtimeClient | None = None
        self._approved_staff_texts: list[str] = []
        self._auto_unavailable_reported = False

    async def on_user_turn_completed(
        self,
        turn_ctx: llm.ChatContext,
        new_message: llm.ChatMessage,
    ) -> None:
        text = (new_message.text_content or "").strip()
        decision = self.policy.on_caller_final(text)
        if decision.generate_reply and self.auto_available:
            return

        turn_ctx.items.append(new_message)
        await self.update_chat_ctx(turn_ctx)
        if self.policy.mode is AgentMode.AUTO and not self.auto_available:
            await self.report_auto_unavailable()
        raise StopResponse()

    async def remember_text_turn(self, text: str) -> None:
        normalized = text.strip()
        if not normalized:
            return
        chat_ctx = self.chat_ctx.copy()
        chat_ctx.add_message(role="user", content=normalized)
        await self.update_chat_ctx(chat_ctx)

    async def report_auto_unavailable(self) -> None:
        if self._auto_unavailable_reported:
            return
        self._auto_unavailable_reported = True
        await self.publisher.error(
            "AUTO_LLM_UNCONFIGURED",
            "Chế độ Auto cần OPENAI_API_KEY mới để tạo câu trả lời. "
            "VALSEA STT và TTS vẫn hoạt động.",
            recoverable=True,
        )

    def mark_staff_speech(self, text: str) -> None:
        self._approved_staff_texts.append(text.strip())

    def consume_staff_speech(self, text: str) -> bool:
        normalized = text.strip()
        for index, queued in enumerate(self._approved_staff_texts):
            if queued == normalized:
                self._approved_staff_texts.pop(index)
                return True
        return False

    async def commit_valsea(self) -> None:
        if self._valsea_client is not None:
            await self._valsea_client.commit()

    async def stt_node(
        self,
        audio: AsyncIterable[rtc.AudioFrame],
        model_settings: ModelSettings,
    ) -> AsyncIterator[stt.SpeechEvent]:
        del model_settings
        ready = asyncio.Event()
        client = ValseaRealtimeClient(
            self.valsea_api_key,
            hint_text=DEFAULT_HINT_TEXT,
        )
        self._valsea_client = client
        sender_task: asyncio.Task[None] | None = None
        await self.publisher.status(
            state="connecting",
            valsea="connecting",
            agent="dispatching",
            detail="Đang mở VALSEA RTT cho tiếng Việt.",
        )
        try:
            await client.connect()
            sender_task = asyncio.create_task(self._forward_audio(audio, client, ready))
            async for provider_event in client.events():
                kind = provider_event.get("kind")
                if kind == "ready":
                    ready.set()
                    await self.publisher.status(
                        state="connected",
                        valsea="live",
                        agent="ready",
                        detail="VALSEA RTT đang nghe người gọi.",
                    )
                    await self.publisher.agent_state("listening", "Human-in-the-loop mặc định.")
                    continue
                if kind == "error":
                    message = str(provider_event.get("message") or "VALSEA realtime error")
                    await self.publisher.error(
                        str(provider_event.get("code") or "VALSEA_ERROR"),
                        message,
                        recoverable=True,
                    )
                    raise RuntimeError(message)
                if kind not in {"partial", "final"}:
                    continue

                text = str(provider_event.get("text") or "").strip()
                if not text:
                    continue
                confidence_value = provider_event.get("confidence")
                confidence = (
                    float(confidence_value)
                    if isinstance(confidence_value, (int, float))
                    and not isinstance(confidence_value, bool)
                    else None
                )
                ended_at_ms = int(provider_event.get("timestamp_ms") or self.publisher.elapsed_ms())
                await self.publisher.transcript(
                    kind=kind,
                    role="caller",
                    text=text,
                    confidence=confidence,
                    ended_at_ms=ended_at_ms,
                )
                yield stt.SpeechEvent(
                    type=(
                        stt.SpeechEventType.FINAL_TRANSCRIPT
                        if kind == "final"
                        else stt.SpeechEventType.INTERIM_TRANSCRIPT
                    ),
                    request_id=new_id("valsea"),
                    alternatives=[
                        stt.SpeechData(
                            language="vi",
                            text=text,
                            confidence=confidence or 0.0,
                            end_time=ended_at_ms / 1000,
                        )
                    ],
                )
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logger.exception("VALSEA realtime stream failed")
            await self.publisher.status(
                state="error",
                valsea="error",
                agent="error",
                detail="Không thể tiếp tục nhận dạng giọng nói.",
            )
            await self.publisher.error(
                "VALSEA_STREAM_FAILED",
                str(error),
                recoverable=True,
            )
            raise
        finally:
            ready.set()
            if sender_task is not None:
                sender_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await sender_task
            await client.close()
            if self._valsea_client is client:
                self._valsea_client = None

    async def _forward_audio(
        self,
        audio: AsyncIterable[rtc.AudioFrame],
        client: ValseaRealtimeClient,
        ready: asyncio.Event,
    ) -> None:
        await asyncio.wait_for(ready.wait(), timeout=15)
        resamplers: dict[int, rtc.AudioResampler] = {}
        async for frame in audio:
            if frame.num_channels != 1:
                raise ValueError("LiveKit caller audio must be mono before VALSEA.")
            frames = [frame]
            if frame.sample_rate != 16_000:
                resampler = resamplers.setdefault(
                    frame.sample_rate,
                    rtc.AudioResampler(frame.sample_rate, 16_000, num_channels=1),
                )
                frames = resampler.push(frame)
            for normalized in frames:
                await client.send_pcm(bytes(normalized.data))
        for resampler in resamplers.values():
            for normalized in resampler.flush():
                await client.send_pcm(bytes(normalized.data))
        await client.commit()


def build_session(valsea_api_key: str) -> tuple[AgentSession, bool]:
    openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
    llm_provider = (
        openai.LLM(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            api_key=openai_api_key,
            temperature=0.2,
        )
        if openai_api_key
        else None
    )
    tts_provider = openai.TTS(
        model="valsea-tts",
        voice=os.getenv("VALSEA_TTS_VOICE", "valsea-neutral"),
        api_key=valsea_api_key,
        base_url=VALSEA_BASE_URL,
        response_format="mp3",
    )
    return (
        AgentSession(
            stt=None,
            llm=llm_provider,
            tts=tts_provider,
            vad=silero.VAD.load(),
            turn_handling={
                "endpointing": {"min_delay": 0.65, "max_delay": 3.0},
                "interruption": {"min_duration": 0.65, "min_words": 2},
            },
        ),
        llm_provider is not None,
    )


def _dispatch_metadata(ctx: JobContext) -> str | None:
    metadata = getattr(ctx.job, "metadata", None)
    return metadata if isinstance(metadata, str) and metadata else None


def _agent_state_value(event: Any) -> str:
    raw = getattr(event, "new_state", None) or getattr(event, "state", None) or "idle"
    value = getattr(raw, "value", raw)
    normalized = str(value).lower()
    for allowed in ("listening", "thinking", "speaking", "idle"):
        if allowed in normalized:
            return allowed
    return "idle"


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext) -> None:
    valsea_api_key = os.getenv("VALSEA_API_KEY", "").strip()
    if not valsea_api_key:
        raise RuntimeError(
            "VALSEA_API_KEY is required; browser or OpenAI STT is not used by this worker."
        )

    await ctx.connect()
    session_code = session_code_from_dispatch(
        room_name=ctx.room.name,
        dispatch_metadata=_dispatch_metadata(ctx),
    )
    caller_identity = caller_identity_for_session(session_code)
    publisher = RoomEventPublisher(ctx.room, session_code)
    session, auto_available = build_session(valsea_api_key)
    agent = VediBookingAgent(
        valsea_api_key=valsea_api_key,
        publisher=publisher,
        auto_available=auto_available,
    )
    auto_greeted = False

    def on_data_received(packet: rtc.DataPacket) -> None:
        if packet.topic != EVENT_TOPIC:
            return
        try:
            event = json.loads(bytes(packet.data).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return
        if not isinstance(event, dict) or event.get("sessionCode") != session_code:
            return
        identity = packet.participant.identity if packet.participant is not None else ""
        event_type = event.get("type")
        is_staff = identity.startswith(f"staff-{session_code}-")
        is_caller = identity == caller_identity
        if isinstance(event_type, str) and event_type.startswith("staff.") and not is_staff:
            return
        if event_type in {"transcript.partial", "transcript.final"} and not is_caller:
            return

        async def apply_event() -> None:
            nonlocal auto_greeted
            if event_type == "transcript.final":
                message = event.get("message")
                text = message.get("text") if isinstance(message, dict) else None
                role = message.get("role") if isinstance(message, dict) else None
                if role != "caller" or not isinstance(text, str) or not text.strip():
                    return
                if agent.policy.mode is AgentMode.AUTO and auto_available:
                    session.generate_reply(user_input=text.strip())
                else:
                    await agent.remember_text_turn(text)
                    if agent.policy.mode is AgentMode.AUTO:
                        await agent.report_auto_unavailable()
                return

            previous_mode = agent.policy.mode
            decision = agent.policy.apply_room_command(event)
            if event_type == "staff.preferences" and agent.policy.mode is AgentMode.AUTO:
                if not auto_greeted:
                    auto_greeted = True
                    await session.say(
                        "Xin chào, VéĐi có thể hỗ trợ anh chị đặt vé xe. "
                        "Anh chị muốn đi từ đâu đến đâu ạ?",
                        allow_interruptions=True,
                    )
                if not auto_available:
                    await agent.report_auto_unavailable()
                if previous_mode is not AgentMode.AUTO:
                    logger.info("Auto mode enabled for session %s", session_code)
            if decision.speak_text:
                agent.mark_staff_speech(decision.speak_text)
                await session.say(decision.speak_text, allow_interruptions=True)
            if decision.commit_turn:
                with contextlib.suppress(Exception):
                    await agent.commit_valsea()
                with contextlib.suppress(Exception):
                    await session.commit_user_turn(transcript_timeout=2.0)
            if decision.end_call:
                session.shutdown(drain=True)

        asyncio.create_task(apply_event())

    ctx.room.on("data_received", on_data_received)

    def on_conversation_item(event: Any) -> None:
        item = getattr(event, "item", None)
        if not isinstance(item, llm.ChatMessage) or item.role != "assistant":
            return
        text = (item.text_content or "").strip()
        if not text or agent.consume_staff_speech(text):
            return
        asyncio.create_task(
            publisher.transcript(
                kind="final",
                role="agent",
                text=text,
                confidence=1.0,
                channel="voice",
            )
        )

    session.on("conversation_item_added", on_conversation_item)

    def on_agent_state(event: Any) -> None:
        asyncio.create_task(publisher.agent_state(_agent_state_value(event)))

    session.on("agent_state_changed", on_agent_state)

    logger.info(
        "Starting VéĐi worker room=%s session=%s caller=%s auto=%s",
        ctx.room.name,
        session_code,
        caller_identity,
        auto_available,
    )
    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            participant_identity=caller_identity,
            text_input=False,
            audio_input=room_io.AudioInputOptions(
                sample_rate=16_000,
                num_channels=1,
                frame_size_ms=40,
                noise_cancellation=noise_cancellation.BVC(),
            ),
            audio_output=True,
            text_output=False,
        ),
        record=False,
    )


if __name__ == "__main__":
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    agents.cli.run_app(server)
