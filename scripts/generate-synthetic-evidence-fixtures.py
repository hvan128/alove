#!/usr/bin/env python3
"""Generate the three synthetic/no-PII Phase 03 speech fixtures.

The source sentences are intentionally fictional. Google Cloud TTS creates the
speech; ffmpeg then produces deterministic PCM WAV files, including a seeded
telephone-noise variant. No customer or call recording is read by this script.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import wave
from dataclasses import dataclass
from pathlib import Path

# ffmpeg is spawned after synthesis; disabling gRPC fork support avoids verbose
# inherited-poll warnings without changing the generated audio.
os.environ.setdefault("GRPC_ENABLE_FORK_SUPPORT", "0")

from dotenv import load_dotenv
from google.cloud import texttospeech


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "apps/web/public/evidence/fixtures"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
VOICE_NAME = "vi-VN-Chirp3-HD-Kore"


@dataclass(frozen=True)
class FixtureSource:
    fixture_id: str
    filename: str
    label: str
    description: str
    category: str
    text: str
    expected_english_tokens: tuple[str, ...]
    sample_rate_hz: int
    telephone: bool = False


FIXTURES = (
    FixtureSource(
        fixture_id="tonal-vietnamese",
        filename="tonal-vietnamese.wav",
        label="Tiếng Việt giàu thanh điệu",
        description="Câu tổng hợp chứa nhiều thanh sắc, huyền, hỏi, ngã và nặng.",
        category="tonal-vietnamese",
        text=(
            "Tôi muốn đặt sáu vé ghế số sáu, tuyến Huế đi Mỹ Tho, "
            "khởi hành lúc bảy giờ tối."
        ),
        expected_english_tokens=(),
        sample_rate_hz=16_000,
    ),
    FixtureSource(
        fixture_id="dense-code-switch",
        filename="dense-code-switch.wav",
        label="Code-switch Việt–Anh dày",
        description="Câu tổng hợp chuyển mã liên tục trong ngữ cảnh đặt vé.",
        category="dense-vn-en-code-switch",
        text=(
            "Cho tôi check availability, book hai vé VIP sleeper từ Sài Gòn đi "
            "Đà Lạt, pickup tại Bến xe Miền Đông, drop-off ở trung tâm."
        ),
        expected_english_tokens=(
            "check",
            "availability",
            "book",
            "vip",
            "sleeper",
            "pickup",
            "drop-off",
        ),
        sample_rate_hz=16_000,
    ),
    FixtureSource(
        fixture_id="noisy-telephone-8khz",
        filename="noisy-telephone-8khz.wav",
        label="Điện thoại 8 kHz có nhiễu",
        description="Câu tổng hợp qua băng thoại 300–3400 Hz và nhiễu hồng có seed cố định.",
        category="noisy-telephone-8khz",
        text=(
            "A lô, tôi cần một vé từ Hà Nội đi Vinh vào tám giờ tối mai, "
            "đón ở Bến xe Nước Ngầm."
        ),
        expected_english_tokens=(),
        sample_rate_hz=8_000,
        telephone=True,
    ),
)


def _credentials_path() -> Path:
    load_dotenv(ROOT / ".env")
    configured = os.getenv("GOOGLE_TTS_CREDENTIALS_FILE", "").strip()
    if not configured:
        raise RuntimeError("GOOGLE_TTS_CREDENTIALS_FILE is required")
    path = Path(configured)
    if not path.is_absolute():
        path = ROOT / path
    if not path.is_file():
        raise RuntimeError("configured Google TTS credential file does not exist")
    return path


def _run_ffmpeg(input_path: Path, output_path: Path, fixture: FixtureSource) -> None:
    if fixture.telephone:
        filter_graph = (
            "[0:a]aresample=8000,highpass=f=300,lowpass=f=3400,volume=0.82[speech];"
            "anoisesrc=color=pink:amplitude=0.035:sample_rate=8000:duration=60:"
            "seed=20260718[noise];"
            "[speech][noise]amix=inputs=2:duration=first:weights=1 0.45:"
            "normalize=0,alimiter=limit=0.95[out]"
        )
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(input_path),
            "-filter_complex",
            filter_graph,
            "-map",
            "[out]",
            "-ac",
            "1",
            "-ar",
            "8000",
            "-c:a",
            "pcm_s16le",
            str(output_path),
        ]
    else:
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(input_path),
            "-ac",
            "1",
            "-ar",
            str(fixture.sample_rate_hz),
            "-c:a",
            "pcm_s16le",
            str(output_path),
        ]
    subprocess.run(command, check=True)


def _wav_metadata(path: Path) -> tuple[int, int, int]:
    with wave.open(str(path), "rb") as wav:
        return wav.getframerate(), wav.getnchannels(), wav.getsampwidth() * 8


def main() -> None:
    credentials_path = _credentials_path()
    client = texttospeech.TextToSpeechClient.from_service_account_file(
        str(credentials_path)
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_entries: list[dict[str, object]] = []

    with tempfile.TemporaryDirectory(prefix="alove-evidence-") as temp_dir:
        temporary = Path(temp_dir)
        for fixture in FIXTURES:
            response = client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=fixture.text),
                voice=texttospeech.VoiceSelectionParams(
                    language_code="vi-VN",
                    name=VOICE_NAME,
                ),
                audio_config=texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.OGG_OPUS,
                ),
            )
            encoded_path = temporary / f"{fixture.fixture_id}.ogg"
            encoded_path.write_bytes(response.audio_content)
            output_path = OUTPUT_DIR / fixture.filename
            _run_ffmpeg(encoded_path, output_path, fixture)

            rate, channels, bits = _wav_metadata(output_path)
            if (rate, channels, bits) != (fixture.sample_rate_hz, 1, 16):
                raise RuntimeError(f"unexpected WAV format for {fixture.fixture_id}")
            digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
            processing = [
                f"ffmpeg PCM16 mono resample to {fixture.sample_rate_hz} Hz",
            ]
            if fixture.telephone:
                processing.append(
                    "300–3400 Hz telephone band plus seeded pink noise (seed 20260718)"
                )
            manifest_entries.append(
                {
                    "id": fixture.fixture_id,
                    "label": fixture.label,
                    "description": fixture.description,
                    "category": fixture.category,
                    "audioPath": f"/evidence/fixtures/{fixture.filename}",
                    "groundTruth": fixture.text,
                    "expectedEnglishTokens": list(fixture.expected_english_tokens),
                    "synthetic": True,
                    "noPii": True,
                    "sampleRateHz": rate,
                    "channels": channels,
                    "bitsPerSample": bits,
                    "sha256": digest,
                    "provenance": {
                        "generator": "Google Cloud Text-to-Speech",
                        "voice": VOICE_NAME,
                        "processing": processing,
                    },
                }
            )

    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "schemaVersion": "1.0.0",
                "provenance": "synthetic-no-pii",
                "fixtures": manifest_entries,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(manifest_entries)} synthetic fixtures and manifest.")


if __name__ == "__main__":
    main()
