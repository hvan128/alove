import unittest

from provider_config import (
    DEFAULT_AGENT_ENGINE,
    DEFAULT_STT_PROVIDER,
    non_valsea_warning,
    resolve_agent_engine,
    resolve_engine_and_stt,
    resolve_stt_provider,
    validate_required_credentials,
)


class ProviderConfigTest(unittest.TestCase):
    def test_missing_or_blank_engine_defaults_to_cascade(self) -> None:
        self.assertEqual(resolve_agent_engine(None), DEFAULT_AGENT_ENGINE)
        self.assertEqual(resolve_agent_engine("   "), DEFAULT_AGENT_ENGINE)

    def test_supported_engine_is_normalized(self) -> None:
        self.assertEqual(resolve_agent_engine(" Cascade "), "cascade")
        self.assertEqual(resolve_agent_engine("GEMINI-STS"), "gemini-sts")

    def test_unknown_engine_fails_closed(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unsupported AGENT_ENGINE"):
            resolve_agent_engine("gemini")

    def test_missing_or_blank_provider_defaults_to_valsea(self) -> None:
        self.assertEqual(resolve_stt_provider(None), DEFAULT_STT_PROVIDER)
        self.assertEqual(resolve_stt_provider("   "), DEFAULT_STT_PROVIDER)

    def test_supported_provider_is_normalized(self) -> None:
        self.assertEqual(resolve_stt_provider(" VALSEA "), "valsea")
        self.assertEqual(resolve_stt_provider("Speechmatics"), "speechmatics")
        self.assertEqual(resolve_stt_provider("OPENAI"), "openai")

    def test_unknown_provider_fails_closed(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unsupported STT_PROVIDER"):
            resolve_stt_provider("typo-provider")

    def test_gemini_ignores_stale_invalid_cascade_stt(self) -> None:
        self.assertEqual(
            resolve_engine_and_stt(" gemini-sts ", "retired-provider"),
            ("gemini-sts", DEFAULT_STT_PROVIDER),
        )

    def test_cascade_still_validates_stt_provider(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unsupported STT_PROVIDER"):
            resolve_engine_and_stt("cascade", "retired-provider")

    def test_offline_routing_and_credential_matrix(self) -> None:
        cases = [
            ("cascade", "valsea", "valsea-key", "", ""),
            ("cascade", "openai", "", "openai-key", ""),
            ("cascade", "speechmatics", "", "", ""),
            ("gemini-sts", "ignored-provider", "", "", "gemini-key"),
        ]
        for raw_engine, raw_stt, valsea_key, openai_key, gemini_key in cases:
            with self.subTest(engine=raw_engine, stt=raw_stt):
                engine, stt_provider = resolve_engine_and_stt(raw_engine, raw_stt)
                validate_required_credentials(
                    engine,
                    stt_provider,
                    valsea_api_key=valsea_key,
                    openai_api_key=openai_key,
                    gemini_api_key=gemini_key,
                )

    def test_active_direct_routes_reject_missing_or_whitespace_keys(self) -> None:
        failures = [
            ("cascade", "valsea", "   ", "", "", "VALSEA_API_KEY"),
            ("cascade", "openai", "", "   ", "", "OPENAI_API_KEY"),
            ("gemini-sts", "valsea", "", "", "   ", "GEMINI_API_KEY"),
        ]
        for engine, stt_provider, valsea_key, openai_key, gemini_key, message in failures:
            with self.subTest(engine=engine, stt=stt_provider):
                with self.assertRaisesRegex(ValueError, message):
                    validate_required_credentials(
                        engine,
                        stt_provider,
                        valsea_api_key=valsea_key,
                        openai_api_key=openai_key,
                        gemini_api_key=gemini_key,
                    )

    def test_non_valsea_selection_has_an_explicit_warning(self) -> None:
        self.assertIsNone(non_valsea_warning("valsea"))
        warning = non_valsea_warning("speechmatics")
        self.assertIsNotNone(warning)
        self.assertIn("explicit A/B comparison", warning or "")


if __name__ == "__main__":
    unittest.main()
