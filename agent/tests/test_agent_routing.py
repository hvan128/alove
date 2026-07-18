import os
import unittest
from unittest.mock import patch


_IMPORT_ENV = {
    "AGENT_WEBHOOK_SECRET": "0123456789abcdef0123456789abcdef",
    "AGENT_ENGINE": "gemini-sts",
    "STT_PROVIDER": "stale-invalid-provider",
    "OPENAI_API_KEY": "  openai-key  ",
    "CARTESIA_API_KEY": "  cartesia-key  ",
    "SPEECHMATICS_API_KEY": "   ",
    "VALSEA_API_KEY": "  valsea-key  ",
    "GEMINI_API_KEY": "  gemini-key  ",
}

with patch.dict(os.environ, _IMPORT_ENV):
    import agent as worker


class AgentRoutingTest(unittest.TestCase):
    def test_import_normalizes_engine_and_direct_credentials(self) -> None:
        self.assertEqual(worker.AGENT_ENGINE, "gemini-sts")
        self.assertEqual(worker.STT_PROVIDER, "valsea")
        self.assertEqual(worker.OPENAI_API_KEY, "openai-key")
        self.assertEqual(worker.CARTESIA_API_KEY, "cartesia-key")
        self.assertEqual(worker.SPEECHMATICS_API_KEY, "")
        self.assertEqual(worker.VALSEA_API_KEY, "valsea-key")
        self.assertEqual(worker.GEMINI_API_KEY, "gemini-key")

    def test_missing_active_stt_key_fails_before_route_log_or_session(self) -> None:
        cases = [
            ("valsea", "", "openai-key", "VALSEA_API_KEY"),
            ("openai", "valsea-key", "", "OPENAI_API_KEY"),
        ]
        for provider, valsea_key, openai_key, message in cases:
            with self.subTest(provider=provider):
                with (
                    patch.multiple(
                        worker,
                        AGENT_ENGINE="cascade",
                        STT_PROVIDER=provider,
                        VALSEA_API_KEY=valsea_key,
                        OPENAI_API_KEY=openai_key,
                    ),
                    patch.object(worker.logger, "info") as route_log,
                    patch.object(worker, "AgentSession") as session,
                ):
                    with self.assertRaisesRegex(ValueError, message):
                        worker.build_agent_session("vi", vad=object())
                    route_log.assert_not_called()
                    session.assert_not_called()

    def test_missing_gemini_key_fails_before_log_or_sdk_construction(self) -> None:
        with (
            patch.multiple(
                worker,
                AGENT_ENGINE="gemini-sts",
                STT_PROVIDER="valsea",
                GEMINI_API_KEY="",
            ),
            patch.object(worker.logger, "info") as route_log,
            patch.object(worker.google.beta.realtime, "RealtimeModel") as realtime_model,
        ):
            with self.assertRaisesRegex(ValueError, "GEMINI_API_KEY"):
                worker.build_agent_session("vi")
            route_log.assert_not_called()
            realtime_model.assert_not_called()

    def test_mocked_gemini_route_constructs_sdk_only_after_validation(self) -> None:
        realtime = object()
        session = object()
        with (
            patch.multiple(
                worker,
                AGENT_ENGINE="gemini-sts",
                STT_PROVIDER="valsea",
                GEMINI_API_KEY="gemini-key",
            ),
            patch.object(
                worker.google.beta.realtime,
                "RealtimeModel",
                return_value=realtime,
            ) as realtime_model,
            patch.object(worker, "AgentSession", return_value=session) as agent_session,
        ):
            self.assertIs(worker.build_agent_session("vi"), session)

        self.assertEqual(realtime_model.call_args.kwargs["api_key"], "gemini-key")
        agent_session.assert_called_once_with(llm=realtime)

    def test_whitespace_speechmatics_key_selects_gateway(self) -> None:
        with patch.multiple(
            worker,
            STT_PROVIDER="speechmatics",
            SPEECHMATICS_API_KEY="",
            OPENAI_API_KEY="",
        ):
            self.assertEqual(worker._cascade_stt("vi"), "speechmatics/enhanced:vi")


if __name__ == "__main__":
    unittest.main()
