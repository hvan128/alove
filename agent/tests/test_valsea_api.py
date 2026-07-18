import json
import os
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx

from valsea_api import (
    ValseaAPIClient,
    ValseaAnnotationResponse,
    ValseaAnnotationResponseError,
)


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


if __name__ == "__main__":
    unittest.main()
