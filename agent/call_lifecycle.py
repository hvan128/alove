"""Small, dependency-free helpers for terminating a LiveKit call."""

from __future__ import annotations

from collections.abc import Awaitable
from typing import Protocol


class LiveKitJobContext(Protocol):
    """The JobContext surface needed to end a browser or SIP call."""

    def delete_room(self, room_name: str | None = None) -> Awaitable[object]: ...

    def shutdown(self, reason: str = "user requested") -> None: ...


async def terminate_livekit_call(job_context: LiveKitJobContext) -> None:
    """Delete the room (disconnecting SIP callers), then stop the current job."""
    try:
        await job_context.delete_room()
    finally:
        job_context.shutdown(reason="agent ended call")
