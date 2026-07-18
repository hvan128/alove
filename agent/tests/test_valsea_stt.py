import os
import unittest
from unittest.mock import patch

from valsea_stt import VALSEASTT


class ValseaSTTCredentialTest(unittest.TestCase):
    def test_direct_key_is_trimmed(self) -> None:
        provider = VALSEASTT(api_key="  direct-valsea-key  ")
        self.assertEqual(provider._api_key, "direct-valsea-key")

    def test_environment_key_is_trimmed(self) -> None:
        with patch.dict(os.environ, {"VALSEA_API_KEY": "  env-valsea-key  "}):
            provider = VALSEASTT()
        self.assertEqual(provider._api_key, "env-valsea-key")

    def test_whitespace_key_fails_closed(self) -> None:
        with patch.dict(os.environ, {"VALSEA_API_KEY": "fallback-key"}):
            with self.assertRaisesRegex(ValueError, "VALSEA_API_KEY not set"):
                VALSEASTT(api_key="   ")


if __name__ == "__main__":
    unittest.main()
