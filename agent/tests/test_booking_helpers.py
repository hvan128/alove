import unittest

from booking_helpers import (
    build_booking_snapshot,
    build_confirmation_request,
    build_realtime_event,
)


class BookingHelpersTest(unittest.TestCase):
    def test_snapshot_matches_call_contract_and_does_not_invent_arrival(self) -> None:
        snapshot = build_booking_snapshot(
            "call-1",
            {
                "tripId": "trip-1",
                "seatsHeld": 2,
                "seatCodes": ["A1", "A2"],
                "seatNoun": "phòng",
                "priceVnd": 530_000,
                "totalVnd": 1_060_000,
                "offer": {
                    "tripId": "trip-1",
                    "originCity": "Hà Nội",
                    "destinationCity": "Vinh",
                    "departureLabel": "20:00 20-07",
                    "vehicleType": "Limousine 21 Phòng VIP",
                    "priceVnd": 530_000,
                    "pickupPoint": "Bến xe Nước Ngầm",
                    "dropoffPoint": "Bến xe Vinh",
                    "seatNoun": "phòng",
                },
            },
            status="trip_proposed",
        )

        self.assertEqual(snapshot["travelDateLabel"], "20-07")
        self.assertEqual(snapshot["selectedTrip"]["departureTime"], "20:00")
        self.assertIsNone(snapshot["selectedTrip"]["arrivalTime"])
        self.assertEqual(snapshot["selectedTrip"]["seatNoun"], "phòng")
        self.assertEqual(
            set(snapshot),
            {
                "id",
                "conversationId",
                "status",
                "origin",
                "destination",
                "travelDateLabel",
                "passengerCount",
                "selectedTrip",
                "seats",
                "passengerName",
                "phone",
                "totalFareVnd",
                "bookingCode",
            },
        )
        self.assertEqual(
            set(snapshot["selectedTrip"]),
            {
                "id",
                "origin",
                "destination",
                "departureTime",
                "arrivalTime",
                "vehicleType",
                "priceVnd",
                "pickupPoint",
                "dropoffPoint",
                "seatNoun",
            },
        )
        self.assertNotIn("timeWindow", snapshot)
        self.assertNotIn("evidenceMessageIds", snapshot)
        self.assertNotIn("availableSeats", snapshot["selectedTrip"])

    def test_snapshot_uses_real_iso_arrival_in_vietnam_time(self) -> None:
        snapshot = build_booking_snapshot(
            "call-2",
            {
                "tripId": "trip-2",
                "priceVnd": 300_000,
                "offer": {
                    "tripId": "trip-2",
                    "originCity": "Hà Nội",
                    "destinationCity": "Vinh",
                    "departureLabel": "20:00 20-07",
                    "arrivesAt": "2026-07-20T18:30:00Z",
                    "vehicleType": "Giường nằm",
                    "priceVnd": 300_000,
                    "pickupPoint": "Hà Nội",
                    "dropoffPoint": "Vinh",
                    "seatNoun": "giường",
                },
            },
        )

        self.assertEqual(snapshot["selectedTrip"]["arrivalTime"], "01:30")

    def test_confirmation_request_uses_latest_final_transcript_verbatim(self) -> None:
        payload = build_confirmation_request(
            conversation_id="call-3",
            trip_id="trip-3",
            passenger_name="Mai Anh",
            phone="0901234567",
            latest_final_user_transcript="  Đúng rồi, chốt vé giúp tôi.  ",
        )

        self.assertEqual(payload["confirmationText"], "Đúng rồi, chốt vé giúp tôi.")

    def test_confirmation_request_requires_a_final_transcript(self) -> None:
        payload = build_confirmation_request(
            conversation_id="call-4",
            trip_id="trip-4",
            passenger_name="Mai Anh",
            phone="0901234567",
            latest_final_user_transcript="   ",
        )

        self.assertIsNone(payload)

    def test_realtime_event_has_stable_identity_and_ordering_envelope(self) -> None:
        event = build_realtime_event(
            call_id="call-5",
            event_id="event-5",
            sequence=3,
            payload={"type": "agent.state", "state": "listening", "sequence": 999},
        )

        self.assertEqual(event["callId"], "call-5")
        self.assertEqual(event["eventId"], "event-5")
        self.assertEqual(event["sequence"], 3)


if __name__ == "__main__":
    unittest.main()
