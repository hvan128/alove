import asyncio
import json
import os
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import httpx
import valsea_api

from valsea_api import (
    MAX_ANNOTATION_ITEMS,
    MAX_ANNOTATION_TEXT_CHARS,
    MAX_DISPLAY_CHARS,
    MAX_HTTP_RESPONSE_BYTES,
    MAX_JSON_ITEM_NODES,
    MAX_JSON_NESTING,
    MAX_JSON_RESPONSE_NODES,
    AnnotationValue,
    ValseaAPIClient,
    ValseaAnnotationResponse,
    ValseaAnnotationResponseError,
)


class _ChunkedStream(httpx.AsyncByteStream):
    def __init__(self, *chunks: bytes) -> None:
        self._chunks = chunks

    async def __aiter__(self):
        for chunk in self._chunks:
            yield chunk


class ValseaAnnotationResponseTest(unittest.TestCase):
    def test_verbose_response_is_validated_and_typed(self) -> None:
        response = ValseaAnnotationResponse.from_json(
            {
                "text": "Cho tôi hai vé đi Đà Lạt.",
                "raw_text": "Cho toi hai ve di Da Lat.",
                "annotated_text": "Cho tôi [hai vé](quantity) đi [Đà Lạt](location).",
                "accent_corrections": [{"from": "toi", "to": "tôi"}],
                "semantic_tags": [
                    {"tag": "quantity", "phrase": "hai vé", "meaning": "2 tickets"},
                    {"tag": "location", "phrase": "Đà Lạt", "meaning": "destination"},
                ],
                "annotations": [
                    {"start": 9, "end": 15, "tag": "quantity", "phrase": "hai vé"},
                    {"start": 19, "end": 25, "tag": "location", "phrase": "Đà Lạt"},
                ],
            }
        )

        self.assertEqual(response.text, "Cho tôi hai vé đi Đà Lạt.")
        self.assertEqual(
            [tag.display for tag in response.semantic_tags], ["quantity", "location"]
        )
        self.assertEqual(
            [item.display for item in response.annotations], ["hai vé", "Đà Lạt"]
        )
        self.assertEqual(response.accent_corrections[0].value, {"from": "toi", "to": "tôi"})

    def test_live_empty_shape_and_optional_arrays_are_supported(self) -> None:
        response = ValseaAnnotationResponse.from_json(
            {
                "text": "Tôi muốn đặt vé.",
                "raw_text": "Tôi muốn đặt vé.",
                "annotated_text": "Tôi muốn đặt vé.",
                "annotations": [],
            }
        )

        self.assertEqual(response.accent_corrections, ())
        self.assertEqual(response.semantic_tags, ())
        self.assertEqual(response.annotations, ())

    def test_unknown_finite_json_items_are_preserved_as_bounded_display_values(self) -> None:
        response = ValseaAnnotationResponse.from_json(
            {
                "text": "đặt vé",
                "accent_corrections": [7, {"new_shape": ["a", 2]}],
                "semantic_tags": ["direct-tag", {"category": "location", "score": 0.9}],
                "annotations": [
                    "direct annotation",
                    {"surface": "Vinh", "offset": {"from": 0, "to": 4}},
                ],
            }
        )

        self.assertEqual(
            [item.display for item in response.semantic_tags],
            ["direct-tag", '{"category":"location","score":0.9}'],
        )
        self.assertEqual(
            [item.display for item in response.annotations],
            ["direct annotation", '{"offset":{"from":0,"to":4},"surface":"Vinh"}'],
        )
        self.assertEqual(response.accent_corrections[0].value, 7)

    def test_top_level_text_fields_enforce_character_limit(self) -> None:
        boundary = "x" * MAX_ANNOTATION_TEXT_CHARS
        response = ValseaAnnotationResponse.from_json(
            {
                "text": boundary,
                "raw_text": boundary,
                "annotated_text": boundary,
            }
        )
        self.assertEqual(response.text, boundary)

        for field in ("text", "raw_text", "annotated_text"):
            with self.subTest(field=field):
                payload = {"text": "ok", field: f"{boundary}x"}
                with self.assertRaises(ValseaAnnotationResponseError):
                    ValseaAnnotationResponse.from_json(payload)

    def test_provider_arrays_enforce_item_limit(self) -> None:
        fields = ("accent_corrections", "semantic_tags", "annotations")
        boundary_payload = {
            "text": "ok",
            **{field: ["value"] * MAX_ANNOTATION_ITEMS for field in fields},
        }
        response = ValseaAnnotationResponse.from_json(boundary_payload)
        self.assertEqual(len(response.accent_corrections), MAX_ANNOTATION_ITEMS)
        self.assertEqual(len(response.semantic_tags), MAX_ANNOTATION_ITEMS)
        self.assertEqual(len(response.annotations), MAX_ANNOTATION_ITEMS)

        for field in fields:
            with self.subTest(field=field):
                with self.assertRaises(ValseaAnnotationResponseError):
                    ValseaAnnotationResponse.from_json(
                        {"text": "ok", field: ["value"] * (MAX_ANNOTATION_ITEMS + 1)}
                    )

    def test_display_values_are_normalized_to_event_safe_length(self) -> None:
        item = AnnotationValue.from_json(
            "x" * (MAX_DISPLAY_CHARS + 1),
            path="semantic_tags[0]",
            preferred_keys=("tag",),
        )

        self.assertEqual(len(item.display), MAX_DISPLAY_CHARS)
        self.assertTrue(item.display.endswith("…"))
        self.assertEqual(item.value, "x" * (MAX_DISPLAY_CHARS + 1))

    def test_excessive_json_depth_and_node_budgets_are_rejected_iteratively(self) -> None:
        at_depth_limit: object = "leaf"
        for _ in range(MAX_JSON_NESTING - 1):
            at_depth_limit = [at_depth_limit]
        ValseaAnnotationResponse.from_json(
            {"text": "ok", "extra": at_depth_limit}
        )

        item_at_node_limit = [0] * (MAX_JSON_ITEM_NODES - 1)
        AnnotationValue.from_json(
            item_at_node_limit,
            path="annotations[0]",
            preferred_keys=("phrase",),
        )

        response_at_node_limit = {
            "text": "ok",
            "extra": [0] * (MAX_JSON_RESPONSE_NODES - 3),
        }
        ValseaAnnotationResponse.from_json(response_at_node_limit)

        too_deep: object = at_depth_limit
        for _ in range(1_000):
            too_deep = [too_deep]

        with self.assertRaises(ValseaAnnotationResponseError):
            ValseaAnnotationResponse.from_json({"text": "ok", "extra": too_deep})

        with self.assertRaises(ValseaAnnotationResponseError):
            AnnotationValue.from_json(
                [0] * MAX_JSON_ITEM_NODES,
                path="annotations[0]",
                preferred_keys=("phrase",),
            )

        with self.assertRaises(ValseaAnnotationResponseError):
            ValseaAnnotationResponse.from_json(
                {"text": "ok", "extra": [0] * MAX_JSON_RESPONSE_NODES}
            )

    def test_malformed_provider_fields_fail_validation(self) -> None:
        invalid_payloads = [
            [],
            {"text": "ok", "semantic_tags": "location"},
            {"text": "ok", "semantic_tags": [float("nan")]},
            {"text": "ok", "annotations": [object()]},
        ]

        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ValseaAnnotationResponseError):
                    ValseaAnnotationResponse.from_json(payload)


class ValseaAPIClientTest(unittest.IsolatedAsyncioTestCase):
    async def test_annotate_sends_documented_request_and_parses_response(self) -> None:
        source = "  Cho tôi hai vé đi Vinh.  "

        def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(str(request.url), "https://example.test/v1/annotations")
            self.assertEqual(request.headers["Authorization"], "Bearer secret-key")
            self.assertEqual(
                json.loads(request.content),
                {
                    "model": "valsea-annotate",
                    "text": source,
                    "response_format": "verbose_json",
                    "language": "vietnamese",
                    "enable_correction": True,
                    "enable_tags": True,
                },
            )
            return httpx.Response(200, json={"text": "Cho tôi hai vé đi Vinh.", "annotations": []})

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = ValseaAPIClient(
                api_key="  secret-key  ",
                http_client=http_client,
                api_base_url="https://example.test/",
            )
            response = await client.annotate(source)

        self.assertEqual(response.text, "Cho tôi hai vé đi Vinh.")

    async def test_request_text_enforces_character_limit_before_http(self) -> None:
        request_count = 0

        def handler(_request: httpx.Request) -> httpx.Response:
            nonlocal request_count
            request_count += 1
            return httpx.Response(200, json={"text": "ok"})

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = ValseaAPIClient(api_key="key", http_client=http_client)
            await client.annotate("x" * MAX_ANNOTATION_TEXT_CHARS)
            with self.assertRaises(ValueError):
                await client.annotate("x" * (MAX_ANNOTATION_TEXT_CHARS + 1))

        self.assertEqual(request_count, 1)

    async def test_streamed_http_response_is_capped_before_json_parse(self) -> None:
        prefix = b'{"text":"ok","padding":"'
        suffix = b'"}'
        boundary_body = (
            prefix
            + (b"x" * (MAX_HTTP_RESPONSE_BYTES - len(prefix) - len(suffix)))
            + suffix
        )

        boundary_transport = httpx.MockTransport(
            lambda _request: httpx.Response(200, content=boundary_body)
        )
        async with httpx.AsyncClient(transport=boundary_transport) as http_client:
            client = ValseaAPIClient(api_key="key", http_client=http_client)
            response = await client.annotate("đặt vé")
        self.assertEqual(response.text, "ok")

        def handler(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                stream=_ChunkedStream(
                    b'{"text":"ok","extra":"',
                    b"x" * MAX_HTTP_RESPONSE_BYTES,
                    b'"}',
                ),
            )

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = ValseaAPIClient(api_key="key", http_client=http_client)
            with patch.object(valsea_api.json, "loads") as json_loads:
                with self.assertRaises(ValseaAnnotationResponseError):
                    await client.annotate("đặt vé")

        json_loads.assert_not_called()

    async def test_json_decoder_recursion_error_is_reported_as_schema_error(self) -> None:
        transport = httpx.MockTransport(
            lambda _request: httpx.Response(200, content=b'{"text":"ok"}')
        )
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = ValseaAPIClient(api_key="key", http_client=http_client)
            with patch.object(valsea_api.json, "loads", side_effect=RecursionError):
                with self.assertRaises(ValseaAnnotationResponseError):
                    await client.annotate("đặt vé")

    async def test_http_and_schema_failures_are_not_hidden_by_client(self) -> None:
        for provider_response, expected_error in [
            (httpx.Response(503, json={"error": "busy"}), httpx.HTTPStatusError),
            (httpx.Response(200, text="not json"), ValseaAnnotationResponseError),
            (
                httpx.Response(200, json={"text": "ok", "annotations": {"phrase": "Vinh"}}),
                ValseaAnnotationResponseError,
            ),
        ]:
            with self.subTest(status=provider_response.status_code, body=provider_response.text):
                transport = httpx.MockTransport(lambda _request: provider_response)
                async with httpx.AsyncClient(transport=transport) as http_client:
                    client = ValseaAPIClient(api_key="key", http_client=http_client)
                    with self.assertRaises(expected_error):
                        await client.annotate("đặt vé")


_IMPORT_ENV = {
    "AGENT_WEBHOOK_SECRET": "0123456789abcdef0123456789abcdef",
    "AGENT_ENGINE": "gemini-sts",
    "GEMINI_API_KEY": "gemini-key",
    "VALSEA_API_KEY": "valsea-key",
}

with patch.dict(os.environ, _IMPORT_ENV):
    import agent as worker


class SemanticAnnotationIntegrationTest(unittest.IsolatedAsyncioTestCase):
    async def test_success_publishes_advisory_event_without_changing_booking_state(self) -> None:
        response = ValseaAnnotationResponse.from_json(
            {
                "text": "Tôi muốn đặt hai vé đi Vinh.",
                "semantic_tags": [
                    {"tag": "quantity", "phrase": "hai vé", "meaning": "2 tickets"}
                ],
                "annotations": [
                    {"start": 13, "end": 19, "tag": "quantity", "phrase": "hai vé"}
                ],
            }
        )
        client = SimpleNamespace(annotate=AsyncMock(return_value=response))
        selected_trip = {"tripId": "trip-1"}
        fake_agent = SimpleNamespace(
            _publish=AsyncMock(),
            _selected_trip=selected_trip,
            _booked=False,
        )

        with patch.object(worker, "valsea_annotation_client", return_value=client):
            await worker.annotate_final_customer_transcript(
                fake_agent, "Tôi muốn dat hai vé đi Vinh."
            )

        payload = fake_agent._publish.await_args.args[0]
        self.assertEqual(
            {key: payload[key] for key in payload if key != "timestamp"},
            {
                "type": "semantic.annotation",
                "sourceTranscript": "Tôi muốn dat hai vé đi Vinh.",
                "correctedText": "Tôi muốn đặt hai vé đi Vinh.",
                "tags": ["quantity"],
                "annotations": ["hai vé"],
            },
        )
        timestamp = datetime.fromisoformat(payload["timestamp"])
        self.assertIsNotNone(timestamp.tzinfo)
        self.assertTrue(payload["timestamp"].endswith("Z"))
        self.assertEqual(fake_agent._selected_trip, selected_trip)
        self.assertFalse(fake_agent._booked)

    async def test_unchanged_text_omits_correction_and_empty_tags_stay_empty(self) -> None:
        source = "Tôi muốn đặt vé."
        response = ValseaAnnotationResponse.from_json({"text": source, "annotations": []})
        client = SimpleNamespace(annotate=AsyncMock(return_value=response))
        fake_agent = SimpleNamespace(_publish=AsyncMock())

        with patch.object(worker, "valsea_annotation_client", return_value=client):
            await worker.annotate_final_customer_transcript(fake_agent, source)

        payload = fake_agent._publish.await_args.args[0]
        self.assertNotIn("correctedText", payload)
        self.assertEqual(payload["tags"], [])
        self.assertEqual(payload["annotations"], [])

    async def test_annotation_or_publish_failure_cannot_escape(self) -> None:
        failures = [
            (
                SimpleNamespace(annotate=AsyncMock(side_effect=httpx.TimeoutException("slow"))),
                SimpleNamespace(_publish=AsyncMock()),
            ),
            (
                SimpleNamespace(
                    annotate=AsyncMock(
                        return_value=ValseaAnnotationResponse.from_json(
                            {"text": "Tôi muốn đặt vé.", "annotations": []}
                        )
                    )
                ),
                SimpleNamespace(_publish=AsyncMock(side_effect=RuntimeError("room closed"))),
            ),
        ]

        for client, fake_agent in failures:
            with self.subTest(error=client.annotate.side_effect):
                with patch.object(worker, "valsea_annotation_client", return_value=client):
                    await worker.annotate_final_customer_transcript(
                        fake_agent, "Tôi muốn đặt vé."
                    )


class RealtimePublishIntegrationTest(unittest.IsolatedAsyncioTestCase):
    async def test_background_scheduler_retains_publish_task_until_completion(self) -> None:
        release = asyncio.Event()

        async def pending_publish() -> None:
            await release.wait()

        before = set(worker._background_tasks)
        worker.schedule_background(pending_publish())
        await asyncio.sleep(0)
        created = set(worker._background_tasks) - before
        self.assertEqual(len(created), 1)
        task = created.pop()
        self.assertFalse(task.done())

        release.set()
        await task
        await asyncio.sleep(0)
        self.assertNotIn(task, worker._background_tasks)

    async def test_direct_tool_result_links_child_tts_to_parent_turn(self) -> None:
        class _Handle:
            def __init__(self, speech_id: str) -> None:
                self.id = speech_id

            async def wait_for_playout(self) -> None:
                return None

            def __await__(self):
                return self.wait_for_playout().__await__()

        aggregator = worker.TurnLatencyAggregator(wall_clock=lambda: 1_784_376_000.0)
        parent = _Handle("speech-parent")
        child = _Handle("speech-say-child")
        context = SimpleNamespace(
            speech_handle=parent,
            session=SimpleNamespace(say=Mock(return_value=child)),
        )
        fake_agent = SimpleNamespace(_latency_aggregator=aggregator)

        with self.assertRaises(worker.StopResponse):
            await worker.BusBookingAgent._say_result(fake_agent, context, "Đã giữ ghế")

        aggregator.observe(SimpleNamespace(
            type="eou_metrics",
            speech_id=parent.id,
            timestamp=1_784_376_000.0,
            end_of_utterance_delay=0.5,
            transcription_delay=0.3,
        ))
        aggregator.observe(SimpleNamespace(
            type="llm_metrics",
            speech_id=parent.id,
            cancelled=False,
            ttft=0.7,
        ))
        result = aggregator.observe(SimpleNamespace(
            type="tts_metrics",
            speech_id=child.id,
            cancelled=False,
            ttfb=0.2,
        ))
        self.assertIsNotNone(result)
        self.assertEqual(result.speech_id, parent.id)

    async def test_latency_publish_failure_is_best_effort(self) -> None:
        publish_data = AsyncMock(side_effect=RuntimeError("room closed"))
        fake_agent = SimpleNamespace(
            _room=SimpleNamespace(
                local_participant=SimpleNamespace(publish_data=publish_data)
            ),
            _conversation_id="call-latency",
            _next_event_sequence=lambda: 10,
        )
        payload = {
            "type": "latency.turn",
            "latency": {
                "speechId": "speech-1",
                "measuredAt": "2026-07-18T12:00:00Z",
                "slowestStageSeconds": 0.7,
                "endOfUtteranceSeconds": 0.5,
                "transcriptionSeconds": 0.3,
                "llmTtftSeconds": 0.7,
                "ttsTtfbSeconds": 0.2,
            },
        }

        await worker.BusBookingAgent._publish(fake_agent, payload)

        publish_data.assert_awaited_once()

    async def test_booking_audit_is_scheduled_when_event_encoding_is_oversized(self) -> None:
        secret_marker = "SECRET-MUST-NOT-LOG"
        booking = {"private": secret_marker, "padding": "\x00" * 11_000}
        publish_data = AsyncMock()
        fake_agent = SimpleNamespace(
            _room=SimpleNamespace(
                local_participant=SimpleNamespace(publish_data=publish_data)
            ),
            _conversation_id="call-transport",
            _next_event_sequence=lambda: 9,
        )
        audit_task = object()
        post_event = Mock(return_value=audit_task)

        with (
            patch.object(worker, "post_call_event", post_event),
            patch.object(worker, "schedule_background") as schedule,
            self.assertLogs(worker.logger, level="DEBUG") as logs,
        ):
            await worker.BusBookingAgent._publish(
                fake_agent,
                {"type": "booking.update", "booking": booking},
            )

        publish_data.assert_not_awaited()
        post_event.assert_called_once_with(
            "call-transport",
            "booking.updated",
            event_id=post_event.call_args.kwargs["event_id"],
            sequence=9,
            booking=booking,
        )
        schedule.assert_called_once_with(audit_task)
        self.assertNotIn(secret_marker, "\n".join(logs.output))


if __name__ == "__main__":
    unittest.main()
