from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path
from unittest import mock


BENCHMARK_DIR = Path(__file__).resolve().parents[1]
if str(BENCHMARK_DIR) not in sys.path:
    sys.path.insert(0, str(BENCHMARK_DIR))

try:
    import validate_dataset as validator
except ModuleNotFoundError:
    validator = None


ALL_COVERAGE_TAGS = [
    "first_time_customer",
    "booking_confirmation",
    "family",
    "multiple_passengers",
    "seat_selection",
    "vehicle_choice",
    "change_options",
    "vip",
    "sold_out_recovery",
    "payment",
    "payment_failure_recovery",
    "reconfirmation",
    "pickup_change",
    "trip_alternative",
    "identity_correction",
    "phone_correction",
    "identity_check",
    "vague_request",
    "date_clarification",
    "storytelling",
    "context_memory",
    "changed_mind",
    "unrelated_question",
    "answer_and_redirect",
    "northern",
    "regional_language",
    "nghe_an",
    "ha_tinh",
    "southern",
    "central",
    "code_switch",
    "upgrade",
    "multilingual_bonus",
    "telephone",
    "clipping",
    "repair",
    "background_noise",
    "bus_station",
    "overlap",
    "field_recording",
    "packet_loss",
]


def scenario_type_for(case_number: int) -> str:
    if case_number <= 10:
        return "core_booking"
    if case_number <= 15:
        return "hotline_behavior"
    if case_number <= 20:
        return "regional_speech"
    if case_number <= 24:
        return "code_switching"
    if case_number <= 27:
        return "difficult_audio"
    return "extreme"


class DatasetFactory:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.scenarios = root / "scenarios"
        self.outputs = root / "expected_outputs"
        self.fixtures = root / "fixtures"
        self.scenarios.mkdir(parents=True)
        self.outputs.mkdir(parents=True)
        self.fixtures.mkdir(parents=True)
        self._write_fixtures()

    def _write_fixtures(self) -> None:
        catalog = {
            "schema_version": "1.0",
            "synthetic": True,
            "timezone": "Asia/Ho_Chi_Minh",
            "trips": [
                {
                    "trip_id": "HN-NA-20260720-2000-VIP21",
                    "origin": "Hà Nội",
                    "destination": "Nghệ An",
                    "travel_date": "2026-07-20",
                    "departure_time": "20:00",
                    "arrival_time": "01:00",
                    "vehicle_type": "Limousine 21 Phòng VIP",
                    "unit_fare_vnd": 530000,
                    "pickup_points": ["Bến xe Mỹ Đình"],
                    "dropoff_points": ["Bến xe Vinh"],
                    "available_seats": ["A01", "A02", "A03", "A04", "A05"],
                }
            ],
        }
        policies = {
            "schema_version": "1.0",
            "synthetic": True,
            "timezone": "Asia/Ho_Chi_Minh",
            "policies": {
                "child_passenger": "Trẻ em phải có người lớn đi cùng.",
                "luggage": "Hành lý tuân theo giới hạn giả lập.",
                "accessibility": "Hỗ trợ tiếp cận theo yêu cầu.",
                "pet": "Thú cưng theo chính sách giả lập.",
                "pickup": "Có mặt trước giờ đón.",
                "payment": "Thanh toán QR hoặc tiền mặt khi lên xe.",
                "change": "Cho phép đổi trước giờ chạy.",
                "cancellation": "Huỷ theo chính sách giả lập.",
            },
        }
        self._write_json(self.fixtures / "catalog.json", catalog)
        self._write_json(self.fixtures / "policies.json", policies)

    @staticmethod
    def _write_json(path: Path, value: object) -> None:
        path.write_text(
            json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    def build_dataset(self, count: int = 30) -> None:
        for case_number in range(1, count + 1):
            self.write_case(case_number)

    def write_case(
        self,
        case_number: int,
        *,
        turn_count: int = 15,
        omit_component: str | None = None,
        malformed_action_turn: int | None = None,
    ) -> None:
        case_id = f"CASE_{case_number:03d}"
        phone = f"09{case_number:08d}"
        customer_name = f"Khách Tổng Hợp {case_number:03d}"
        passenger_details = [
            {"name": customer_name, "type": "ADULT", "seat": "A01"}
        ]
        actions, patches = self._turn_contracts(
            case_id, customer_name, phone, turn_count
        )
        final_state = self._replay(patches)
        workflow = {
            "customer": {"name": customer_name, "phone": phone},
            "passengers": {"count": 1, "details": passenger_details},
            "trip": {
                "trip_id": "HN-NA-20260720-2000-VIP21",
                "origin": "Hà Nội",
                "destination": "Nghệ An",
                "travel_date": "2026-07-20",
                "departure_time": "20:00",
                "arrival_time": "01:00",
            },
            "vehicle": {
                "type": "Limousine 21 Phòng VIP",
                "seat_preference": "ghế tầng dưới",
                "assigned_seats": ["A01"],
            },
            "pickup_dropoff": {
                "pickup_location": "Bến xe Mỹ Đình",
                "dropoff_location": "Bến xe Vinh",
            },
            "payment": {
                "method": "QR",
                "status": "PAID",
                "unit_fare_vnd": 530000,
                "total_fare_vnd": 530000,
            },
            "booking": {
                "booking_id": f"VA-{case_id}",
                "booking_status": "CONFIRMED",
            },
            "outcome": {"completed_goal": True, "confirmation_turn": 14},
        }
        metadata = {
            "scenario_type": scenario_type_for(case_number),
            "customer_region": "Việt Nam",
            "audio_conditions": [
                "quiet_mobile",
                "telephone_8khz",
                "background_noise",
                "bus_station",
                "field_recording",
            ],
            "languages": ["vi", "en", "th"],
            "difficulty": "hard",
            "call_datetime": "2026-07-18T09:00:00+07:00",
            "timezone": "Asia/Ho_Chi_Minh",
            "coverage_tags": list(ALL_COVERAGE_TAGS),
        }
        output = {
            "schema_version": "1.0",
            "case_id": case_id,
            "title": f"Cuộc gọi tổng hợp {case_number:03d}",
            "metadata": metadata,
            "turn_expectations": [
                {"turn": index, "action": actions[index - 1], "state_update": patches[index - 1]}
                for index in range(1, turn_count + 1)
            ],
            "final_state": final_state,
            "final_workflow_output": workflow,
        }
        markdown = self._render_markdown(
            case_id,
            output,
            actions,
            patches,
            omit_component=omit_component,
            malformed_action_turn=malformed_action_turn,
        )
        (self.scenarios / f"{case_id}.md").write_text(markdown, encoding="utf-8")
        self._write_json(self.outputs / f"{case_id}.json", output)

    @staticmethod
    def _initial_state() -> dict[str, object]:
        nullable = [
            "origin",
            "destination",
            "travel_date",
            "departure_time",
            "trip_id",
            "passenger_count",
            "vehicle_type",
            "seat_preference",
            "pickup_location",
            "dropoff_location",
            "customer_name",
            "customer_phone",
            "payment_method",
            "booking_id",
        ]
        state = {key: None for key in nullable}
        state.update(
            {
                "assigned_seats": [],
                "passenger_details": [],
                "payment_status": "NOT_STARTED",
                "booking_status": "COLLECTING",
                "explicit_confirmation": False,
            }
        )
        return state

    @classmethod
    def _replay(cls, patches: list[dict[str, object]]) -> dict[str, object]:
        initial = cls._initial_state()
        state = deepcopy(initial)
        for patch in patches:
            state.update(deepcopy(patch["set"]))
            for field in patch["clear"]:
                state[field] = deepcopy(initial[field])
        return state

    @staticmethod
    def _base_action(action: str = "ASK_MISSING_INFORMATION") -> dict[str, object]:
        return {
            "intent": "BOOK_TICKET",
            "action": action,
            "missing_fields": [],
            "arguments": {},
            "expected_result": {},
        }

    def _turn_contracts(
        self, case_id: str, customer_name: str, phone: str, turn_count: int
    ) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
        actions = [self._base_action() for _ in range(turn_count)]
        patches: list[dict[str, object]] = [
            {"set": {}, "clear": []} for _ in range(turn_count)
        ]
        if turn_count >= 1:
            actions[0] = self._base_action("GREET_AND_DISCOVER")
            patches[0]["set"] = {"origin": "Hà Nội", "destination": "Nghệ An"}
        if turn_count >= 2:
            patches[1]["set"] = {"travel_date": "2026-07-20"}
        if turn_count >= 3:
            patches[2]["set"] = {"passenger_count": 1}
        if turn_count >= 4:
            actions[3] = {
                "intent": "BOOK_TICKET",
                "action": "SEARCH_TRIPS",
                "missing_fields": [],
                "arguments": {
                    "origin": "Hà Nội",
                    "destination": "Nghệ An",
                    "travel_date": "2026-07-20",
                    "passenger_count": 1,
                },
                "expected_result": {"trip_ids": ["HN-NA-20260720-2000-VIP21"]},
            }
            patches[3]["set"] = {
                "trip_id": "HN-NA-20260720-2000-VIP21",
                "departure_time": "20:00",
                "vehicle_type": "Limousine 21 Phòng VIP",
            }
        if turn_count >= 5:
            patches[4]["set"] = {"pickup_location": "Bến xe Mỹ Đình"}
        if turn_count >= 6:
            patches[5]["set"] = {"dropoff_location": "Bến xe Vinh"}
        if turn_count >= 7:
            actions[6] = self._base_action("CAPTURE_PASSENGER_DETAILS")
            patches[6]["set"] = {
                "customer_name": customer_name,
                "customer_phone": phone,
                "passenger_details": [
                    {"name": customer_name, "type": "ADULT", "seat": "A01"}
                ],
            }
        if turn_count >= 8:
            actions[7] = {
                "intent": "BOOK_TICKET",
                "action": "VERIFY_PAYMENT",
                "missing_fields": [],
                "arguments": {
                    "payment_method": "QR",
                    "payment_reference": "SYNTHETIC-CUSTOMER-REF-001",
                },
                "expected_result": {
                    "payment_status": "PAID",
                    "provider_reference": "SYNTHETIC-PROVIDER-REF-001",
                },
            }
            patches[7]["set"] = {"payment_method": "QR", "payment_status": "PAID"}
        if turn_count >= 9:
            patches[8]["set"] = {"seat_preference": "ghế tầng dưới"}
        if turn_count >= 12:
            actions[11] = {
                "intent": "BOOK_TICKET",
                "action": "HOLD_SEATS",
                "missing_fields": [],
                "arguments": {
                    "trip_id": "HN-NA-20260720-2000-VIP21",
                    "passenger_count": 1,
                    "seat_preference": "ghế tầng dưới",
                },
                "expected_result": {
                    "assigned_seats": ["A01"],
                    "unit_fare_vnd": 530000,
                    "total_fare_vnd": 530000,
                },
            }
            patches[11]["set"] = {"assigned_seats": ["A01"]}
        if turn_count >= 14:
            actions[13] = self._base_action("CONFIRM_DETAILS")
            patches[13]["set"] = {"explicit_confirmation": True}
        if turn_count >= 15:
            actions[14] = {
                "intent": "BOOK_TICKET",
                "action": "CONFIRM_BOOKING",
                "missing_fields": [],
                "arguments": {
                    "trip_id": "HN-NA-20260720-2000-VIP21",
                    "customer_name": customer_name,
                    "customer_phone": phone,
                },
                "expected_result": {
                    "booking_id": f"VA-{case_id}",
                    "booking_status": "CONFIRMED",
                },
            }
            patches[14]["set"] = {
                "booking_id": f"VA-{case_id}",
                "booking_status": "CONFIRMED",
            }
        return actions, patches

    @staticmethod
    def _json_fence(value: object) -> str:
        return "```json\n" + json.dumps(value, ensure_ascii=False, indent=2) + "\n```"

    def _render_markdown(
        self,
        case_id: str,
        output: dict[str, object],
        actions: list[dict[str, object]],
        patches: list[dict[str, object]],
        *,
        omit_component: str | None,
        malformed_action_turn: int | None,
    ) -> str:
        metadata = output["metadata"]
        sections = [
            f"# {case_id} — {output['title']}",
            "",
            "## 1. Scenario Metadata",
            "",
            f"Scenario type: {metadata['scenario_type']}",
            "Customer region: Việt Nam",
            "Audio conditions: telephone_8khz, background_noise, bus_station, field_recording",
            "Languages: vi, en, th",
            "Difficulty: hard",
            "Call datetime: 2026-07-18T09:00:00+07:00",
            "Timezone: Asia/Ho_Chi_Minh",
            "",
            "## 2. Customer Persona",
            "",
            "Người gọi thử nghiệm tổng hợp, dữ liệu hoàn toàn giả lập.",
            "",
            "## 3. Conversation",
            "",
        ]
        customer_text = (
            "Alo em, anh cần book ticket và check schedule chuyến xe; cho anh hỏi "
            "điểm đón, điểm trả, giữ chỗ, mã vé, trung chuyển, hành lý ở bến xe. "
            "Anh muốn giường nằm, phòng VIP, ghế tầng dưới; mô răng rứa ni vô chi. "
            "Please confirm pickup và upgrade VIP cabin giúp anh. สวัสดีครับ"
        )
        for index, (action, patch) in enumerate(zip(actions, patches), start=1):
            sections.extend([f"## Turn {index}", ""])
            if omit_component != f"customer:{index}":
                sections.extend(["### Customer", "", f"{customer_text} Lượt {index}.", ""])
            if omit_component != f"response:{index}":
                sections.extend(
                    [
                        "### Expected Agent Response",
                        "",
                        f"Em đã ghi nhận thông tin ở lượt {index} và sẽ xác nhận trước khi đặt.",
                        "",
                    ]
                )
            if omit_component != f"action:{index}":
                sections.extend(["### Expected Agent Action", ""])
                if malformed_action_turn == index:
                    sections.extend(["```json", "{ not valid json", "```", ""])
                else:
                    sections.extend([self._json_fence(action), ""])
            if omit_component != f"state:{index}":
                sections.extend(
                    ["### Expected Internal State Update", "", self._json_fence(patch), ""]
                )
        workflow = output["final_workflow_output"]
        sections.extend(
            [
                "## 4. Internal State Tracking",
                "",
                self._json_fence(output["final_state"]),
                "",
                "## 5. Final Workflow Output",
                "",
                self._json_fence(workflow),
                "",
                "## 6. Final Ticket",
                "",
                f"Mã đặt vé: {workflow['booking']['booking_id']}",
                f"Khách hàng: {workflow['customer']['name']}",
                f"Điện thoại: {workflow['customer']['phone']}",
                f"Tuyến: {workflow['trip']['origin']} → {workflow['trip']['destination']}",
                f"Khởi hành: {workflow['trip']['travel_date']} {workflow['trip']['departure_time']}",
                f"Loại xe: {workflow['vehicle']['type']}",
                f"Ghế: {', '.join(workflow['vehicle']['assigned_seats'])}",
                f"Điểm đón: {workflow['pickup_dropoff']['pickup_location']}",
                f"Điểm trả: {workflow['pickup_dropoff']['dropoff_location']}",
                f"Hành khách: {workflow['passengers']['count']}",
                (
                    "Thanh toán: "
                    f"{validator.TICKET_PAYMENT_METHOD_LABELS[workflow['payment']['method']]} | "
                    f"{validator.TICKET_PAYMENT_STATUS_LABELS[workflow['payment']['status']]}"
                ),
                (
                    "Trạng thái: "
                    f"{validator.TICKET_BOOKING_STATUS_LABELS[workflow['booking']['booking_status']]}"
                ),
                "",
                "## 7. Evaluation Criteria",
                "",
                "Đúng dữ liệu, hỏi rõ thông tin và chỉ đặt sau xác nhận tường minh.",
                "",
            ]
        )
        return "\n".join(sections)


class DatasetTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.factory = DatasetFactory(self.root)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def validate(self):
        self.assertIsNotNone(validator, "validate_dataset.py must exist")
        return validator.validate_dataset(self.root)

    def assert_has_code(self, report, code: str) -> None:
        self.assertIn(code, {issue.code for issue in report.issues})

    def load_output(self, case_number: int = 1) -> dict[str, object]:
        path = self.factory.outputs / f"CASE_{case_number:03d}.json"
        return json.loads(path.read_text(encoding="utf-8"))

    def save_output(self, output: dict[str, object], case_number: int = 1) -> None:
        self.factory._write_json(
            self.factory.outputs / f"CASE_{case_number:03d}.json", output
        )

    def rerender_case(
        self, output: dict[str, object], case_number: int = 1
    ) -> None:
        actions = [item["action"] for item in output["turn_expectations"]]
        patches = [item["state_update"] for item in output["turn_expectations"]]
        markdown = self.factory._render_markdown(
            f"CASE_{case_number:03d}",
            output,
            actions,
            patches,
            omit_component=None,
            malformed_action_turn=None,
        )
        (self.factory.scenarios / f"CASE_{case_number:03d}.md").write_text(
            markdown, encoding="utf-8"
        )
        self.save_output(output, case_number)


class ValidatorHarnessTests(DatasetTestCase):

    def test_valid_thirty_case_dataset_has_no_errors(self) -> None:
        self.factory.build_dataset()
        report = self.validate()
        self.assertTrue(report.ok, [issue.message for issue in report.issues])
        self.assertEqual((), report.errors)

    def test_missing_case_pair_has_stable_issue_code(self) -> None:
        self.factory.build_dataset()
        (self.factory.scenarios / "CASE_030.md").unlink()
        report = self.validate()
        self.assert_has_code(report, "dataset.case_ids")
        self.assert_has_code(report, "file.missing")

    def test_case_with_fewer_than_fifteen_turns_is_rejected(self) -> None:
        self.factory.build_dataset()
        self.factory.write_case(1, turn_count=14)
        self.assert_has_code(self.validate(), "turn.count")

    def test_missing_response_is_rejected(self) -> None:
        self.factory.build_dataset()
        self.factory.write_case(1, omit_component="response:3")
        self.assert_has_code(self.validate(), "turn.response")

    def test_missing_action_is_rejected(self) -> None:
        self.factory.build_dataset()
        self.factory.write_case(1, omit_component="action:3")
        self.assert_has_code(self.validate(), "turn.action")

    def test_missing_state_patch_is_rejected(self) -> None:
        self.factory.build_dataset()
        self.factory.write_case(1, omit_component="state:3")
        self.assert_has_code(self.validate(), "turn.state_update")

    def test_malformed_action_json_is_rejected(self) -> None:
        self.factory.build_dataset()
        self.factory.write_case(1, malformed_action_turn=3)
        self.assert_has_code(self.validate(), "json.invalid")


class ParserAndReportTests(DatasetTestCase):
    def test_report_is_sorted_and_exposes_errors_warnings_and_ok(self) -> None:
        self.assertIsNotNone(validator, "validate_dataset.py must exist")
        report = validator.ValidationReport(
            (
                validator.Issue("z.md", 2, "z", "warning", "later"),
                validator.Issue("a.md", 1, "a", "error", "first"),
            )
        )
        self.assertEqual(1, len(report.errors))
        self.assertEqual(1, len(report.warnings))
        self.assertFalse(report.ok)

    def test_bom_and_crlf_are_accepted_and_normalized(self) -> None:
        self.factory.build_dataset()
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8")
        path.write_bytes(b"\xef\xbb\xbf" + text.replace("\n", "\r\n").encode("utf-8"))
        report = self.validate()
        self.assertTrue(report.ok, report.issues)

    def test_heading_inside_fence_does_not_create_a_duplicate_section(self) -> None:
        self.factory.build_dataset()
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8")
        text = text.replace(
            "Alo em, anh cần book ticket",
            "```text\n## 4. Internal State Tracking\n```\nAlo em, anh cần book ticket",
            1,
        )
        path.write_text(text, encoding="utf-8")
        report = self.validate()
        self.assertNotIn("markdown.section_duplicate", {issue.code for issue in report.issues})

    def test_duplicate_numbered_section_is_rejected(self) -> None:
        self.factory.build_dataset()
        path = self.factory.scenarios / "CASE_001.md"
        path.write_text(
            path.read_text(encoding="utf-8") + "\n## 1. Scenario Metadata\n",
            encoding="utf-8",
        )
        self.assert_has_code(self.validate(), "markdown.section_duplicate")

    def test_noncontiguous_turn_numbers_are_rejected(self) -> None:
        self.factory.build_dataset()
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8").replace("## Turn 2\n", "## Turn 20\n", 1)
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "turn.noncontiguous")

    def test_duplicate_json_key_is_rejected(self) -> None:
        self.factory.build_dataset()
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8").replace(
            '  "intent": "BOOK_TICKET",',
            '  "intent": "BOOK_TICKET",\n  "intent": "BOOK_TICKET",',
            1,
        )
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "json.duplicate_key")

    def test_multiline_dialogue_is_preserved(self) -> None:
        self.factory.build_dataset()
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8").replace(
            "Em đã ghi nhận thông tin ở lượt 1 và sẽ xác nhận trước khi đặt.",
            "Em đã ghi nhận thông tin ở lượt 1.\nEm sẽ xác nhận trước khi đặt.",
            1,
        )
        path.write_text(text, encoding="utf-8")
        self.assertIsNotNone(validator, "validate_dataset.py must exist")
        parsed, issues = validator.parse_case(path)
        self.assertFalse(issues, issues)
        self.assertIn("\n", parsed.turns[0].response)

    def test_customer_dialogue_rejects_markdown_emphasis(self) -> None:
        self.factory.build_dataset()
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8").replace(
            "Alo em, anh cần",
            "**Alo em, anh cần**",
            1,
        )
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "turn.customer_markup")


class SchemaReplayCatalogAndTicketTests(DatasetTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.factory.write_case(1)

    def validate(self):
        self.assertIsNotNone(validator, "validate_dataset.py must exist")
        return validator.validate_dataset(self.root, case_range=(1, 1))

    def test_unknown_expected_output_key_is_rejected(self) -> None:
        output = self.load_output()
        output["unexpected"] = True
        self.save_output(output)
        self.assert_has_code(self.validate(), "schema.unknown_key")

    def test_missing_required_booking_field_is_rejected(self) -> None:
        output = self.load_output()
        del output["final_workflow_output"]["booking"]["booking_id"]
        self.save_output(output)
        self.assert_has_code(self.validate(), "schema.required_key")

    def test_bad_phone_is_rejected(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["customer"]["phone"] = "123"
        self.save_output(output)
        self.assert_has_code(self.validate(), "schema.format")

    def test_bad_date_and_time_are_rejected(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["trip"]["travel_date"] = "20/07/2026"
        output["final_workflow_output"]["trip"]["departure_time"] = "25:70"
        self.save_output(output)
        self.assert_has_code(self.validate(), "schema.format")

    def test_bad_enum_is_rejected(self) -> None:
        output = self.load_output()
        output["metadata"]["difficulty"] = "impossible"
        output["final_workflow_output"]["payment"]["method"] = "CARD"
        self.save_output(output)
        self.assert_has_code(self.validate(), "schema.enum")

    def test_passenger_and_seat_counts_must_match(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["passengers"]["count"] = 2
        self.save_output(output)
        report = self.validate()
        self.assert_has_code(report, "workflow.passenger_count")
        self.assert_has_code(report, "workflow.seat_count")

    def test_passenger_seats_must_equal_assigned_seats(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["passengers"]["details"][0]["seat"] = "A02"
        self.save_output(output)
        self.assert_has_code(self.validate(), "workflow.passenger_seat")

    def test_fare_arithmetic_is_exact(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["payment"]["total_fare_vnd"] = 1
        self.save_output(output)
        self.assert_has_code(self.validate(), "workflow.fare")

    def test_tool_action_payload_is_exact(self) -> None:
        output = self.load_output()
        del output["turn_expectations"][3]["action"]["arguments"]["origin"]
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "action.payload")

    def test_state_patch_rejects_unknown_and_conflicting_fields(self) -> None:
        output = self.load_output()
        patch = output["turn_expectations"][0]["state_update"]
        patch["set"]["mystery"] = "x"
        patch["clear"].append("origin")
        self.rerender_case(output)
        report = self.validate()
        self.assert_has_code(report, "state.field_unknown")
        self.assert_has_code(report, "state.patch_conflict")

    def test_correction_after_confirmation_must_clear_confirmation(self) -> None:
        output = self.load_output()
        patch = output["turn_expectations"][14]["state_update"]
        patch["set"]["pickup_location"] = "Điểm đón khác"
        output["final_state"] = self.factory._replay(
            [item["state_update"] for item in output["turn_expectations"]]
        )
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "state.stale_confirmation")

    def test_booking_requires_explicit_confirmation_on_an_earlier_turn(self) -> None:
        output = self.load_output()
        output["turn_expectations"][13]["state_update"] = {"set": {}, "clear": []}
        output["final_state"] = self.factory._replay(
            [item["state_update"] for item in output["turn_expectations"]]
        )
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "state.booking_before_confirmation")

    def test_confirmation_turn_is_computed_from_final_false_to_true_transition(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["outcome"]["confirmation_turn"] = 13
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "state.confirmation_turn")

    def test_markdown_and_json_turn_expectations_must_match(self) -> None:
        output = self.load_output()
        output["turn_expectations"][0]["action"]["missing_fields"] = ["travel_date"]
        self.save_output(output)
        self.assert_has_code(self.validate(), "cross_file.turn_expectation")

    def test_markdown_section_four_must_match_external_final_state(self) -> None:
        output = self.load_output()
        output["final_state"]["origin"] = "Sai"
        self.save_output(output)
        self.assert_has_code(self.validate(), "cross_file.final_state")

    def test_markdown_section_five_must_match_external_workflow(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["customer"]["name"] = "Sai"
        self.save_output(output)
        self.assert_has_code(self.validate(), "cross_file.workflow")

    def test_selected_trip_must_exist_in_catalog(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["trip"]["trip_id"] = "NOT-A-TRIP"
        self.save_output(output)
        self.assert_has_code(self.validate(), "catalog.trip")

    def test_catalog_route_and_price_must_match(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["trip"]["origin"] = "Đà Nẵng"
        output["final_workflow_output"]["payment"]["unit_fare_vnd"] = 1
        self.save_output(output)
        self.assert_has_code(self.validate(), "catalog.mismatch")

    def test_ticket_requires_all_labels(self) -> None:
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"^Điện thoại:.*\n", "", text, count=1, flags=re.MULTILINE)
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "ticket.field_missing")

    def test_ticket_fields_must_equal_workflow_values(self) -> None:
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8").replace(
            "Tuyến: Hà Nội → Nghệ An", "Tuyến: Hà Nội → Đà Nẵng", 1
        )
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "ticket.field_mismatch")

    def test_confirm_booking_arguments_must_match_pre_action_state(self) -> None:
        output = self.load_output()
        output["turn_expectations"][14]["action"]["arguments"][
            "customer_phone"
        ] = "0999999999"
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "action.binding")

    def test_confirm_booking_result_must_match_final_workflow(self) -> None:
        output = self.load_output()
        output["turn_expectations"][14]["action"]["expected_result"][
            "booking_id"
        ] = "VA-CASE_999"
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "action.binding")

    def test_ticket_payment_rejects_substring_lookalikes(self) -> None:
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8").replace(
            "Thanh toán: QR | Đã thanh toán",
            "Thanh toán: NOTQR | Chưa hề thanh toán",
            1,
        )
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "ticket.field_mismatch")

    def test_ticket_accepts_only_customer_facing_status_labels(self) -> None:
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8")
        self.assertIn("Thanh toán: QR | Đã thanh toán", text)
        self.assertIn("Trạng thái: Đã xác nhận", text)
        self.assertNotIn("Thanh toán: QR | PAID", text)
        self.assertNotIn("Trạng thái: CONFIRMED", text)
        report = self.validate()
        self.assertTrue(report.ok, report.issues)

    def test_ticket_payment_rejects_contradictory_extra_token(self) -> None:
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8").replace(
            "Thanh toán: QR | Đã thanh toán",
            "Thanh toán: QR | Đã thanh toán | Chờ thanh toán",
            1,
        )
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "ticket.field_mismatch")

    def test_paid_state_requires_verified_payment_action(self) -> None:
        output = self.load_output()
        payment_turn = output["turn_expectations"][7]
        payment_turn["action"] = {
            "intent": "BOOK_TICKET",
            "action": "CAPTURE_PAYMENT_PREFERENCE",
            "missing_fields": [],
            "arguments": {},
            "expected_result": {},
        }
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "payment.evidence")

    def test_verify_payment_payload_requires_provider_evidence(self) -> None:
        output = self.load_output()
        del output["turn_expectations"][7]["action"]["expected_result"][
            "provider_reference"
        ]
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "action.payload")

    def test_verify_payment_method_must_match_paid_state(self) -> None:
        output = self.load_output()
        output["turn_expectations"][7]["action"]["arguments"][
            "payment_method"
        ] = "BANK_TRANSFER"
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "payment.evidence")

    def test_missing_fields_rejects_unhashable_non_string_without_crashing(self) -> None:
        output = self.load_output()
        output["turn_expectations"][0]["action"]["missing_fields"] = [
            ["travel_date"]
        ]
        self.rerender_case(output)
        try:
            report = self.validate()
        except TypeError as exc:
            self.fail(f"validator crashed on malformed missing_fields: {exc}")
        self.assert_has_code(report, "action.payload")

    def test_state_clear_rejects_unhashable_non_string_without_crashing(self) -> None:
        output = self.load_output()
        output["turn_expectations"][0]["state_update"]["clear"] = [["origin"]]
        self.rerender_case(output)
        try:
            report = self.validate()
        except TypeError as exc:
            self.fail(f"validator crashed on malformed state clear: {exc}")
        self.assert_has_code(report, "schema.type")

    def test_workflow_assigned_seats_rejects_object_without_crashing(self) -> None:
        output = self.load_output()
        output["final_workflow_output"]["vehicle"]["assigned_seats"] = [{}]
        self.save_output(output)
        try:
            report = self.validate()
        except TypeError as exc:
            self.fail(f"validator crashed on malformed workflow seats: {exc}")
        self.assert_has_code(report, "schema.type")

    def test_hold_seats_result_rejects_object_without_crashing(self) -> None:
        output = self.load_output()
        output["turn_expectations"][11]["action"]["expected_result"][
            "assigned_seats"
        ] = [{}]
        self.rerender_case(output)
        try:
            report = self.validate()
        except TypeError as exc:
            self.fail(f"validator crashed on malformed HOLD_SEATS seats: {exc}")
        self.assert_has_code(report, "action.payload")

    def test_exactly_one_confirm_booking_action_is_required(self) -> None:
        output = self.load_output()
        output["turn_expectations"][14]["action"] = {
            "intent": "END_CONVERSATION",
            "action": "END_CALL",
            "missing_fields": [],
            "arguments": {},
            "expected_result": {},
        }
        self.rerender_case(output)
        self.assert_has_code(report := self.validate(), "action.confirm_booking_cardinality")
        self.assertFalse(report.ok)

    def test_duplicate_confirm_booking_actions_are_rejected(self) -> None:
        self.factory.write_case(1, turn_count=16)
        output = self.load_output()
        output["turn_expectations"][15]["action"] = deepcopy(
            output["turn_expectations"][14]["action"]
        )
        self.rerender_case(output)
        self.assert_has_code(self.validate(), "action.confirm_booking_cardinality")

    def test_workflow_trip_id_rejects_unhashable_values_without_crashing(self) -> None:
        for malformed in ({}, []):
            with self.subTest(malformed=malformed):
                self.factory.write_case(1)
                output = self.load_output()
                output["final_workflow_output"]["trip"]["trip_id"] = malformed
                self.save_output(output)
                try:
                    report = self.validate()
                except TypeError as exc:
                    self.fail(f"validator crashed on malformed workflow trip_id: {exc}")
                self.assert_has_code(report, "schema.type")
                self.assertNotIn(
                    "validator.internal_error", {issue.code for issue in report.issues}
                )

    def test_booking_id_rejects_unhashable_values_without_crashing(self) -> None:
        for malformed in ({}, []):
            with self.subTest(malformed=malformed):
                self.factory.write_case(1)
                output = self.load_output()
                output["final_workflow_output"]["booking"][
                    "booking_id"
                ] = malformed
                self.save_output(output)
                try:
                    report = self.validate()
                except TypeError as exc:
                    self.fail(f"validator crashed on malformed booking_id: {exc}")
                self.assertTrue(
                    {"schema.type", "schema.format"}
                    & {issue.code for issue in report.issues}
                )
                self.assertNotIn(
                    "validator.internal_error", {issue.code for issue in report.issues}
                )

    def test_search_trip_ids_rejects_object_and_list_without_crashing(self) -> None:
        for malformed in ({}, []):
            with self.subTest(malformed=malformed):
                self.factory.write_case(1)
                output = self.load_output()
                output["turn_expectations"][3]["action"]["expected_result"][
                    "trip_ids"
                ] = [malformed]
                self.rerender_case(output)
                report = self.validate()
                self.assert_has_code(report, "action.payload")
                self.assert_has_code(report, "catalog.mismatch")
                self.assertNotIn(
                    "validator.internal_error", {issue.code for issue in report.issues}
                )


class DistributionTests(DatasetTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.factory.build_dataset()

    def test_orphan_case_file_is_rejected(self) -> None:
        shutil.copyfile(
            self.factory.scenarios / "CASE_030.md",
            self.factory.scenarios / "CASE_031.md",
        )
        report = self.validate()
        self.assert_has_code(report, "dataset.case_ids")
        self.assert_has_code(report, "dataset.orphan_file")

    def test_duplicate_booking_ids_are_rejected(self) -> None:
        output = self.load_output(2)
        output["final_workflow_output"]["booking"]["booking_id"] = "VA-CASE_001"
        output["final_state"]["booking_id"] = "VA-CASE_001"
        output["turn_expectations"][14]["action"]["expected_result"][
            "booking_id"
        ] = "VA-CASE_001"
        output["turn_expectations"][14]["state_update"]["set"][
            "booking_id"
        ] = "VA-CASE_001"
        self.rerender_case(output, 2)
        self.assert_has_code(self.validate(), "dataset.duplicate_booking_id")

    def test_scenario_type_must_match_case_range(self) -> None:
        output = self.load_output(16)
        output["metadata"]["scenario_type"] = "core_booking"
        self.save_output(output, 16)
        self.assert_has_code(self.validate(), "distribution.scenario_type")

    def test_required_per_case_coverage_tag_is_enforced(self) -> None:
        output = self.load_output(1)
        output["metadata"]["coverage_tags"].remove("first_time_customer")
        self.save_output(output)
        self.assert_has_code(self.validate(), "distribution.coverage_tag")

    def test_regional_vocabulary_must_occur_in_customer_text(self) -> None:
        token_re = re.compile(r"\b(?:mô|răng|rứa|ni|vô|chi)\b", re.IGNORECASE)
        for case_number in range(1, 31):
            path = self.factory.scenarios / f"CASE_{case_number:03d}.md"
            path.write_text(
                token_re.sub("từ vùng miền", path.read_text(encoding="utf-8")),
                encoding="utf-8",
            )
        self.assert_has_code(self.validate(), "distribution.regional_lexicon")

    def test_code_switch_terms_must_occur_in_customer_text(self) -> None:
        terms = re.compile(
            r"\b(?:book|ticket|schedule|pickup|confirm|upgrade|VIP cabin)\b",
            re.IGNORECASE,
        )
        for case_number in range(1, 31):
            path = self.factory.scenarios / f"CASE_{case_number:03d}.md"
            path.write_text(
                terms.sub("thuật ngữ", path.read_text(encoding="utf-8")),
                encoding="utf-8",
            )
        self.assert_has_code(self.validate(), "distribution.code_switch_lexicon")

    def test_difficult_audio_conditions_are_covered_in_metadata(self) -> None:
        for case_number in range(1, 31):
            output = self.load_output(case_number)
            output["metadata"]["audio_conditions"] = ["quiet_mobile"]
            self.save_output(output, case_number)
        self.assert_has_code(self.validate(), "distribution.audio_condition")

    def test_case_thirty_contains_thai_customer_text_and_language(self) -> None:
        path = self.factory.scenarios / "CASE_030.md"
        text = re.sub(r"[\u0E00-\u0E7F]+", "", path.read_text(encoding="utf-8"))
        path.write_text(text, encoding="utf-8")
        output = self.load_output(30)
        output["metadata"]["languages"].remove("th")
        self.save_output(output, 30)
        self.assert_has_code(self.validate(), "distribution.multilingual")

    def test_dataset_requires_multiple_verified_paid_outcomes(self) -> None:
        for case_number in range(1, 29):
            output = self.load_output(case_number)
            payment_turn = output["turn_expectations"][7]
            payment_turn["action"] = {
                "intent": "BOOK_TICKET",
                "action": "CAPTURE_PAYMENT_PREFERENCE",
                "missing_fields": [],
                "arguments": {},
                "expected_result": {},
            }
            payment_turn["state_update"]["set"] = {
                "payment_method": "QR",
                "payment_status": "PENDING",
            }
            output["final_state"]["payment_status"] = "PENDING"
            output["final_workflow_output"]["payment"]["status"] = "PENDING"
            self.rerender_case(output, case_number)
        self.assert_has_code(self.validate(), "distribution.payment_status")

    def test_each_case_has_at_least_two_transport_domain_terms(self) -> None:
        path = self.factory.scenarios / "CASE_001.md"
        text = path.read_text(encoding="utf-8")
        for term in (
            "vé",
            "chuyến",
            "giường nằm",
            "phòng VIP",
            "ghế tầng dưới",
            "điểm đón",
            "điểm trả",
            "giữ chỗ",
            "mã vé",
            "trung chuyển",
            "hành lý",
            "bến xe",
        ):
            text = re.sub(re.escape(term), "thông tin", text, flags=re.IGNORECASE)
        path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "distribution.domain_terms_case")

    def test_dataset_union_covers_all_transport_jargon(self) -> None:
        for case_number in range(1, 31):
            path = self.factory.scenarios / f"CASE_{case_number:03d}.md"
            text = re.sub(
                re.escape("trung chuyển"),
                "dịch vụ",
                path.read_text(encoding="utf-8"),
                flags=re.IGNORECASE,
            )
            path.write_text(text, encoding="utf-8")
        self.assert_has_code(self.validate(), "distribution.domain_terms_union")

    def test_common_mojibake_is_rejected(self) -> None:
        path = self.factory.scenarios / "CASE_001.md"
        path.write_text(
            path.read_text(encoding="utf-8").replace("Alo", "Ã lỗi", 1),
            encoding="utf-8",
        )
        self.assert_has_code(self.validate(), "encoding.mojibake")

    def test_range_mode_skips_global_count_and_union_checks(self) -> None:
        for case_number in range(2, 31):
            (self.factory.scenarios / f"CASE_{case_number:03d}.md").unlink()
            (self.factory.outputs / f"CASE_{case_number:03d}.json").unlink()
        report = validator.validate_dataset(self.root, case_range=(1, 1))
        self.assertTrue(report.ok, report.issues)

    def test_range_mode_keeps_per_case_scenario_type_check(self) -> None:
        output = self.load_output(1)
        output["metadata"]["scenario_type"] = "extreme"
        self.save_output(output)
        report = validator.validate_dataset(self.root, case_range=(1, 1))
        self.assert_has_code(report, "distribution.scenario_type")


class CliTests(DatasetTestCase):
    script = BENCHMARK_DIR / "validate_dataset.py"

    def run_cli(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(self.script), str(self.root), *arguments],
            text=True,
            encoding="utf-8",
            capture_output=True,
            check=False,
        )

    def test_human_success_output_and_exit_zero(self) -> None:
        self.factory.build_dataset()
        result = self.run_cli()
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Cases: 30", result.stdout)

    def test_json_mode_emits_only_parseable_json(self) -> None:
        self.factory.build_dataset()
        result = self.run_cli("--json")
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(30, payload["case_count"])

    def test_validation_errors_exit_one(self) -> None:
        self.factory.build_dataset()
        (self.factory.scenarios / "CASE_001.md").unlink()
        result = self.run_cli()
        self.assertEqual(1, result.returncode)
        self.assertIn("file.missing", result.stdout)

    def test_strict_warnings_changes_warning_only_exit_to_one(self) -> None:
        self.factory.build_dataset()
        output = self.load_output()
        output["metadata"]["customer_region"] = " Việt Nam "
        self.save_output(output)
        normal = self.run_cli()
        strict = self.run_cli("--strict-warnings")
        self.assertEqual(0, normal.returncode, normal.stdout + normal.stderr)
        self.assertEqual(1, strict.returncode, strict.stdout + strict.stderr)
        self.assertIn("metadata.whitespace", strict.stdout)

    def test_fixtures_only_does_not_require_cases(self) -> None:
        result = self.run_cli("--fixtures-only")
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Fixtures: valid", result.stdout)

    def test_invalid_case_range_exits_two(self) -> None:
        result = self.run_cli("--case-range", "20-10")
        self.assertEqual(2, result.returncode)
        self.assertIn("case range", result.stderr)

    def test_fixtures_only_and_case_range_are_mutually_exclusive(self) -> None:
        result = self.run_cli("--fixtures-only", "--case-range", "1-1")
        self.assertEqual(2, result.returncode)

    def test_range_cli_validates_only_requested_pairs(self) -> None:
        self.factory.write_case(1)
        result = self.run_cli("--case-range", "001-001")
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Cases: 1", result.stdout)

    def test_json_issue_order_is_stable(self) -> None:
        self.factory.build_dataset()
        (self.factory.scenarios / "CASE_001.md").unlink()
        (self.factory.outputs / "CASE_002.json").unlink()
        result = self.run_cli("--json")
        self.assertEqual(1, result.returncode)
        issues = json.loads(result.stdout)["issues"]
        keys = [
            (item["path"], item["line"], item["code"], item["message"])
            for item in issues
        ]
        self.assertEqual(sorted(keys), keys)


class FixtureValidationTests(DatasetTestCase):
    def test_fixtures_only_rejects_bad_catalog_header(self) -> None:
        path = self.factory.fixtures / "catalog.json"
        catalog = json.loads(path.read_text(encoding="utf-8"))
        catalog["schema_version"] = "2.0"
        self.factory._write_json(path, catalog)
        report = validator.validate_dataset(self.root, fixtures_only=True)
        self.assert_has_code(report, "fixture.schema")

    def test_fixtures_only_rejects_duplicate_trip_ids(self) -> None:
        path = self.factory.fixtures / "catalog.json"
        catalog = json.loads(path.read_text(encoding="utf-8"))
        catalog["trips"].append(deepcopy(catalog["trips"][0]))
        self.factory._write_json(path, catalog)
        report = validator.validate_dataset(self.root, fixtures_only=True)
        self.assert_has_code(report, "fixture.schema")

    def test_fixtures_only_rejects_missing_policy_category(self) -> None:
        path = self.factory.fixtures / "policies.json"
        policies = json.loads(path.read_text(encoding="utf-8"))
        del policies["policies"]["luggage"]
        self.factory._write_json(path, policies)
        report = validator.validate_dataset(self.root, fixtures_only=True)
        self.assert_has_code(report, "fixture.schema")

    def test_malformed_catalog_lists_are_safe_in_fixture_and_case_validation(self) -> None:
        self.factory.write_case(1)
        path = self.factory.fixtures / "catalog.json"
        catalog = json.loads(path.read_text(encoding="utf-8"))
        trip = catalog["trips"][0]
        trip["available_seats"] = [{}]
        trip["pickup_points"] = [{}]
        trip["dropoff_points"] = [{}]
        self.factory._write_json(path, catalog)

        fixture_report = validator.validate_dataset(self.root, fixtures_only=True)
        self.assert_has_code(fixture_report, "fixture.schema")
        try:
            case_report = validator.validate_dataset(self.root, case_range=(1, 1))
        except TypeError as exc:
            self.fail(f"validator crashed after reporting malformed fixtures: {exc}")
        self.assert_has_code(case_report, "catalog.mismatch")

    def test_malformed_fixture_trip_id_never_becomes_a_hash_key(self) -> None:
        self.factory.write_case(1)
        path = self.factory.fixtures / "catalog.json"
        for malformed in ({}, []):
            with self.subTest(malformed=malformed):
                self.factory._write_fixtures()
                catalog = json.loads(path.read_text(encoding="utf-8"))
                catalog["trips"][0]["trip_id"] = malformed
                self.factory._write_json(path, catalog)
                fixture_report = validator.validate_dataset(
                    self.root, fixtures_only=True
                )
                self.assert_has_code(fixture_report, "fixture.schema")
                case_report = validator.validate_dataset(
                    self.root, case_range=(1, 1)
                )
                self.assert_has_code(case_report, "catalog.trip")
                self.assertNotIn(
                    "validator.internal_error",
                    {issue.code for issue in case_report.issues},
                )


class InternalSafetyBoundaryTests(DatasetTestCase):
    def test_unexpected_case_exception_becomes_issue_and_next_case_continues(self) -> None:
        self.factory.write_case(1)
        self.factory.write_case(2)
        output = self.load_output(2)
        output["metadata"]["scenario_type"] = "extreme"
        self.save_output(output, 2)
        original = validator._validate_case_pair

        def fail_first_case(*args, **kwargs):
            case_id = args[3]
            if case_id == "CASE_001":
                raise RuntimeError("synthetic semantic failure")
            return original(*args, **kwargs)

        with mock.patch.object(
            validator, "_validate_case_pair", side_effect=fail_first_case
        ):
            try:
                report = validator.validate_dataset(self.root, case_range=(1, 2))
            except RuntimeError as exc:
                self.fail(f"unexpected semantic exception escaped boundary: {exc}")

        self.assert_has_code(report, "validator.internal_error")
        self.assert_has_code(report, "distribution.scenario_type")


class RepositoryFixtureTests(unittest.TestCase):
    REQUIRED_TRIP_IDS = {
        "HN-HT-20260720-1900-GN34",
        "HN-NA-20260719-2130-GN34",
        "HN-NA-20260720-2000-VIP21",
        "HN-NA-20260720-2130-GN34",
        "HN-NA-20260721-2000-VIP21",
        "HN-NA-20260721-2130-GN34",
        "HN-NA-20260722-2000-VIP21",
        "HN-NA-20260722-2130-GN34",
        "HN-NA-20260722-2215-GN38",
        "HT-HN-20260722-1900-GN34",
        "NA-HN-20260721-2030-VIP21",
        "NA-HN-20260721-2215-GN38",
        "NA-HN-20260722-2030-VIP21",
        "SG-DL-20260719-2200-GN34",
        "SG-DL-20260719-2330-LIMO",
        "SG-DL-20260720-2200-GN34",
        "SG-DL-20260720-2330-LIMO",
        "SG-DL-20260721-2200-GN34",
        "SG-DL-20260721-2330-LIMO",
        "SG-DL-20260722-2200-GN34",
        "SG-DL-20260722-2330-LIMO",
    }
    REQUIRED_POLICY_CATEGORIES = {
        "child_passenger",
        "luggage",
        "accessibility",
        "pet",
        "pickup",
        "payment",
        "change",
        "cancellation",
    }

    def test_repository_fixtures_cover_the_frozen_authoring_matrix(self) -> None:
        fixtures = BENCHMARK_DIR / "fixtures"
        catalog_path = fixtures / "catalog.json"
        policies_path = fixtures / "policies.json"
        self.assertTrue(catalog_path.is_file(), "repository catalog fixture must exist")
        self.assertTrue(policies_path.is_file(), "repository policy fixture must exist")

        report = validator.validate_dataset(BENCHMARK_DIR, fixtures_only=True)
        self.assertTrue(report.ok, report.issues)

        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        policies = json.loads(policies_path.read_text(encoding="utf-8"))
        for fixture in (catalog, policies):
            self.assertEqual("1.0", fixture["schema_version"])
            self.assertIs(True, fixture["synthetic"])
            self.assertEqual("2026-07-18", fixture["fixture_date"])
            self.assertEqual("Asia/Ho_Chi_Minh", fixture["timezone"])

        trips = catalog["trips"]
        trip_ids = {trip["trip_id"] for trip in trips}
        self.assertTrue(self.REQUIRED_TRIP_IDS.issubset(trip_ids))
        for trip in trips:
            for field in ("pickup_points", "dropoff_points", "available_seats"):
                values = trip[field]
                self.assertIsInstance(values, list)
                self.assertTrue(values)
                self.assertTrue(
                    all(isinstance(value, str) and value.strip() for value in values)
                )
                self.assertEqual(len(values), len(set(values)))
            self.assertGreaterEqual(len(trip["available_seats"]), 5)

        self.assertTrue(
            self.REQUIRED_POLICY_CATEGORIES.issubset(policies["policies"])
        )

    def test_repository_catalog_has_grounded_seat_metadata(self) -> None:
        catalog_path = BENCHMARK_DIR / "fixtures" / "catalog.json"
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        seat_metadata = catalog.get("seat_metadata")
        self.assertIsInstance(
            seat_metadata, dict, "catalog must define per-vehicle seat metadata"
        )

        vehicle_types = {trip["vehicle_type"] for trip in catalog["trips"]}
        self.assertEqual(vehicle_types, set(seat_metadata))
        for vehicle_type, seat_map in seat_metadata.items():
            self.assertIsInstance(seat_map, dict)
            self.assertTrue(seat_map)
            for seat_id, metadata in seat_map.items():
                self.assertIsInstance(seat_id, str)
                self.assertEqual(
                    {"deck", "zone", "adjacent_to"}, set(metadata), seat_id
                )
                self.assertIn(metadata["deck"], {"lower", "upper"})
                self.assertIn(metadata["zone"], {"front", "middle", "rear"})
                adjacent = metadata["adjacent_to"]
                self.assertIsInstance(adjacent, list)
                self.assertEqual(len(adjacent), len(set(adjacent)))
                self.assertNotIn(seat_id, adjacent)
                self.assertTrue(
                    all(
                        isinstance(neighbor, str) and neighbor in seat_map
                        for neighbor in adjacent
                    )
                )
            for seat_id, metadata in seat_map.items():
                for neighbor in metadata["adjacent_to"]:
                    self.assertIn(seat_id, seat_map[neighbor]["adjacent_to"])

        trips = {trip["trip_id"]: trip for trip in catalog["trips"]}
        for trip in trips.values():
            mapped = seat_metadata[trip["vehicle_type"]]
            self.assertTrue(set(trip["available_seats"]).issubset(mapped))

        def available_with(
            trip_id: str, *, deck: str | None = None, zone: str | None = None
        ) -> set[str]:
            trip = trips[trip_id]
            mapped = seat_metadata[trip["vehicle_type"]]
            return {
                seat_id
                for seat_id in trip["available_seats"]
                if (deck is None or mapped[seat_id]["deck"] == deck)
                and (zone is None or mapped[seat_id]["zone"] == zone)
            }

        case_002 = "HN-NA-20260720-2000-VIP21"
        self.assertGreaterEqual(len(available_with(case_002, deck="lower")), 4)

        case_005 = "HN-NA-20260720-2130-GN34"
        self.assertEqual(
            {"deck": "lower", "zone": "front"},
            {
                key: seat_metadata["Giường nằm 34 chỗ"]["B01"][key]
                for key in ("deck", "zone")
            },
        )
        self.assertNotIn("B01", trips[case_005]["available_seats"])
        self.assertTrue(available_with(case_005, deck="lower"))

        case_009_requested = "SG-DL-20260719-2200-GN34"
        requested_lower = available_with(case_009_requested, deck="lower")
        requested_map = seat_metadata[trips[case_009_requested]["vehicle_type"]]
        self.assertFalse(
            any(
                requested_lower.intersection(requested_map[seat_id]["adjacent_to"])
                for seat_id in requested_lower
            )
        )
        case_009_selected = "SG-DL-20260719-2330-LIMO"
        selected_lower = available_with(case_009_selected, deck="lower")
        selected_map = seat_metadata[trips[case_009_selected]["vehicle_type"]]
        self.assertTrue(
            any(
                selected_lower.intersection(selected_map[seat_id]["adjacent_to"])
                for seat_id in selected_lower
            )
        )

        for trip_id in (
            "SG-DL-20260721-2330-LIMO",
            "HN-NA-20260722-2000-VIP21",
            "HT-HN-20260722-1900-GN34",
        ):
            self.assertGreaterEqual(len(available_with(trip_id, deck="lower")), 4)
        limo_map = seat_metadata["Limousine 22 Phòng"]
        self.assertTrue(
            {"P01", "P02", "P03"}.issubset(
                trips["SG-DL-20260721-2330-LIMO"]["available_seats"]
            )
        )
        self.assertEqual(
            {"front"},
            {
                limo_map[seat_id]["zone"]
                for seat_id in ("P01", "P02", "P03")
            },
        )
        self.assertIn("P01", limo_map["P02"]["adjacent_to"])
        self.assertIn("P03", limo_map["P02"]["adjacent_to"])

    def test_repository_dialogue_does_not_expose_internal_state_jargon(self) -> None:
        forbidden = re.compile(
            r"\b(?:CASH_ON_BOARDING|BANK_TRANSFER|NOT_STARTED|PENDING|PAID|"
            r"SEARCH_TRIPS|HOLD_SEATS|CONFIRM_BOOKING|benchmark|catalog|"
            r"inventory|synthetic)\b|(?:sau recap|trạng thái cuối|khóa bản cuối|"
            r"luồng đặt vé|không tự ánh xạ|policy benchmark)",
            flags=re.IGNORECASE,
        )
        findings: list[str] = []

        for path in sorted((BENCHMARK_DIR / "scenarios").glob("CASE_*.md")):
            parsed, issues = validator.parse_case(path)
            self.assertIsNotNone(parsed, issues)
            assert parsed is not None
            for turn in parsed.turns:
                for role, text in (
                    ("customer", turn.customer),
                    ("agent", turn.response),
                ):
                    match = forbidden.search(text)
                    if match:
                        findings.append(
                            f"{parsed.case_id} turn {turn.number} {role}: {match.group(0)}"
                        )

        self.assertFalse(findings, "\n".join(findings))

    def test_repository_customer_turns_are_plain_spoken_text(self) -> None:
        findings: list[str] = []
        for path in sorted((BENCHMARK_DIR / "scenarios").glob("CASE_*.md")):
            parsed, issues = validator.parse_case(path)
            self.assertIsNotNone(parsed, issues)
            assert parsed is not None
            for turn in parsed.turns:
                if "**" in turn.customer:
                    findings.append(f"{parsed.case_id} turn {turn.number}")
        self.assertFalse(findings, "Markdown emphasis in: " + ", ".join(findings))

    def test_repository_has_multiple_evidence_backed_paid_bookings(self) -> None:
        paid_cases: list[str] = []
        for path in sorted(
            (BENCHMARK_DIR / "expected_outputs").glob("CASE_*.json")
        ):
            output = json.loads(path.read_text(encoding="utf-8"))
            if output["final_workflow_output"]["payment"]["status"] == "PAID":
                paid_cases.append(output["case_id"])
        self.assertGreaterEqual(len(paid_cases), 3, paid_cases)


if __name__ == "__main__":
    unittest.main()
