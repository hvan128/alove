import unittest
from types import SimpleNamespace

from latency_metrics import TurnLatencyAggregator

TEST_EPOCH = 1_784_376_000.0


def metric(kind: str, speech_id: str, **values: object) -> SimpleNamespace:
    values.setdefault("timestamp", TEST_EPOCH)
    return SimpleNamespace(type=kind, speech_id=speech_id, cancelled=False, **values)


def new_aggregator(**kwargs: object) -> TurnLatencyAggregator:
    return TurnLatencyAggregator(wall_clock=lambda: TEST_EPOCH, **kwargs)


class TurnLatencyAggregatorTest(unittest.TestCase):
    def test_emits_once_after_all_stages_arrive_in_any_order(self) -> None:
        aggregator = new_aggregator()

        self.assertIsNone(aggregator.observe(metric("tts_metrics", "speech-1", ttfb=0.18)))
        self.assertIsNone(aggregator.observe(metric("eou_metrics", "speech-1", end_of_utterance_delay=0.52, transcription_delay=0.31)))
        result = aggregator.observe(metric("llm_metrics", "speech-1", ttft=0.74))

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.speech_id, "speech-1")
        self.assertEqual(result.slowest_stage_seconds, 0.74)
        self.assertEqual(result.transcription_seconds, 0.31)
        self.assertEqual(result.to_event_payload(), {
            "type": "latency.turn",
            "latency": {
                "speechId": "speech-1",
                "measuredAt": "2026-07-18T12:00:00Z",
                "slowestStageSeconds": 0.74,
                "endOfUtteranceSeconds": 0.52,
                "transcriptionSeconds": 0.31,
                "llmTtftSeconds": 0.74,
                "ttsTtfbSeconds": 0.18,
            },
        })
        self.assertIsNone(aggregator.observe(metric("tts_metrics", "speech-1", ttfb=0.2)))

    def test_keeps_first_sample_and_ignores_cancelled_or_invalid_metrics(self) -> None:
        aggregator = new_aggregator()

        self.assertIsNone(aggregator.observe(metric("llm_metrics", "speech-2", ttft=-1)))
        self.assertIsNone(aggregator.observe(metric("llm_metrics", "", ttft=0.3)))
        self.assertIsNone(aggregator.observe(SimpleNamespace(
            type="tts_metrics", speech_id="speech-2", cancelled=True, ttfb=0.2
        )))
        aggregator.observe(metric("llm_metrics", "speech-2", ttft=0.4))
        aggregator.observe(metric("llm_metrics", "speech-2", ttft=9.9))
        aggregator.observe(metric("eou_metrics", "speech-2", end_of_utterance_delay=0.2, transcription_delay=0.1))
        result = aggregator.observe(metric("tts_metrics", "speech-2", ttfb=0.3))

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.llm_ttft_seconds, 0.4)

    def test_links_session_say_tts_back_to_the_owning_tool_turn(self) -> None:
        aggregator = new_aggregator()
        aggregator.observe(metric(
            "eou_metrics",
            "speech-parent",
            end_of_utterance_delay=0.5,
            transcription_delay=0.3,
        ))
        aggregator.observe(metric("llm_metrics", "speech-parent", ttft=0.7))

        aggregator.link_speech(
            child_speech_id="speech-say-child",
            parent_speech_id="speech-parent",
        )
        result = aggregator.observe(metric("tts_metrics", "speech-say-child", ttfb=0.2))

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.speech_id, "speech-parent")
        self.assertEqual(result.tts_ttfb_seconds, 0.2)

    def test_drops_an_older_turn_that_completes_after_a_newer_turn(self) -> None:
        aggregator = new_aggregator()
        aggregator.observe(metric(
            "eou_metrics",
            "speech-old",
            timestamp=1_784_376_000.0,
            end_of_utterance_delay=0.5,
            transcription_delay=0.3,
        ))
        aggregator.observe(metric("llm_metrics", "speech-old", ttft=0.7))
        aggregator.observe(metric(
            "eou_metrics",
            "speech-new",
            timestamp=1_784_376_010.0,
            end_of_utterance_delay=0.4,
            transcription_delay=0.2,
        ))
        aggregator.observe(metric("llm_metrics", "speech-new", ttft=0.6))

        newest = aggregator.observe(metric("tts_metrics", "speech-new", ttfb=0.2))
        late_old = aggregator.observe(metric("tts_metrics", "speech-old", ttfb=0.2))

        self.assertIsNotNone(newest)
        self.assertIsNone(late_old)

    def test_accepts_zero_sentinels_but_rejects_impossible_transcription_order(self) -> None:
        aggregator = new_aggregator()
        aggregator.observe(metric(
            "eou_metrics",
            "speech-zero",
            end_of_utterance_delay=0.0,
            transcription_delay=0.0,
        ))
        aggregator.observe(metric("llm_metrics", "speech-zero", ttft=0.4))
        result = aggregator.observe(metric("tts_metrics", "speech-zero", ttfb=0.2))
        self.assertIsNotNone(result)

        impossible = new_aggregator()
        impossible.observe(metric(
            "eou_metrics",
            "speech-invalid",
            end_of_utterance_delay=0.2,
            transcription_delay=0.3,
        ))
        impossible.observe(metric("llm_metrics", "speech-invalid", ttft=0.4))
        self.assertIsNone(impossible.observe(metric("tts_metrics", "speech-invalid", ttfb=0.2)))

    def test_rejects_timestamp_poison_without_suppressing_the_next_valid_turn(self) -> None:
        aggregator = new_aggregator()
        aggregator.observe(metric(
            "eou_metrics",
            "speech-poison",
            timestamp=253_402_300_800.0,
            end_of_utterance_delay=0.5,
            transcription_delay=0.3,
        ))
        aggregator.observe(metric("llm_metrics", "speech-poison", ttft=0.7))
        self.assertIsNone(aggregator.observe(metric("tts_metrics", "speech-poison", ttfb=0.2)))

        aggregator.observe(metric(
            "eou_metrics",
            "speech-valid",
            end_of_utterance_delay=0.4,
            transcription_delay=0.2,
        ))
        aggregator.observe(metric("llm_metrics", "speech-valid", ttft=0.6))
        result = aggregator.observe(metric("tts_metrics", "speech-valid", ttfb=0.2))

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.speech_id, "speech-valid")
        self.assertEqual(result.to_event_payload()["latency"]["measuredAt"], "2026-07-18T12:00:00Z")

    def test_expires_incomplete_records_and_bounds_pending_plus_completed(self) -> None:
        now = 0.0
        aggregator = new_aggregator(
            max_records=2,
            ttl_seconds=5,
            clock=lambda: now,
        )
        aggregator.observe(metric("llm_metrics", "old", ttft=0.4))
        now = 1.0
        aggregator.observe(metric("llm_metrics", "middle", ttft=0.5))
        now = 2.0
        aggregator.observe(metric("llm_metrics", "new", ttft=0.6))
        self.assertEqual(aggregator.tracked_count, 2)

        now = 8.0
        aggregator.observe(metric("llm_metrics", "fresh", ttft=0.7))
        self.assertEqual(aggregator.tracked_count, 1)


if __name__ == "__main__":
    unittest.main()
