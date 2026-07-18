import unittest

from call_lifecycle import terminate_livekit_call


class _JobContext:
    def __init__(self, *, delete_error: Exception | None = None) -> None:
        self.events: list[str] = []
        self.delete_error = delete_error

    async def delete_room(self) -> object:
        self.events.append("delete_room")
        if self.delete_error is not None:
            raise self.delete_error
        return object()

    def shutdown(self, reason: str = "user requested") -> None:
        self.events.append(f"shutdown:{reason}")


class CallLifecycleTest(unittest.IsolatedAsyncioTestCase):
    async def test_deletes_room_before_shutting_down_job(self) -> None:
        context = _JobContext()

        await terminate_livekit_call(context)

        self.assertEqual(
            context.events,
            ["delete_room", "shutdown:agent ended call"],
        )

    async def test_still_shuts_down_job_when_room_deletion_raises(self) -> None:
        context = _JobContext(delete_error=RuntimeError("delete failed"))

        with self.assertRaisesRegex(RuntimeError, "delete failed"):
            await terminate_livekit_call(context)

        self.assertEqual(
            context.events,
            ["delete_room", "shutdown:agent ended call"],
        )


if __name__ == "__main__":
    unittest.main()
