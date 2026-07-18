"""Pure payload helpers shared by the LiveKit agent and its unit tests."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping, Optional


_CLOCK_RE = re.compile(r"\b(\d{1,2}):(\d{2})\b")
_VIETNAM_TIMEZONE = timezone(timedelta(hours=7))


def clock_from_label(label: Optional[str]) -> str:
    """Return a contract-compatible HH:MM clock from a localized label."""
    found = _CLOCK_RE.search(label or "")
    if not found:
        return "00:00"
    return f"{int(found.group(1)):02d}:{found.group(2)}"


def date_from_departure_label(label: Optional[str]) -> Optional[str]:
    """Return the date portion of a localized departure label."""
    if not label:
        return None
    date_part = _CLOCK_RE.sub("", label).strip(" ,·-")
    return date_part or None


def _arrival_clock(offer: Mapping[str, Any]) -> Optional[str]:
    """Use a real arrival value when supplied; never fabricate an arrival time."""
    local_value = offer.get("arrivalTime") or offer.get("arrivalLabel")
    if isinstance(local_value, str):
        found = _CLOCK_RE.search(local_value)
        if found:
            return f"{int(found.group(1)):02d}:{found.group(2)}"

    iso_value = offer.get("arrivesAt") or offer.get("arrivalAt")
    if not isinstance(iso_value, str) or not iso_value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(iso_value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(_VIETNAM_TIMEZONE)
    return parsed.strftime("%H:%M")


def build_booking_snapshot(
    conversation_id: str,
    selected_trip: Optional[Mapping[str, Any]],
    **overrides: Any,
) -> dict[str, Any]:
    """Build the exact booking snapshot consumed by ``call-contract.ts``."""
    trip = dict(selected_trip or {})
    offer = dict(trip.get("offer") or {})
    trip_id = offer.get("tripId") or trip.get("tripId")

    selected = None
    if trip_id:
        selected = {
            "id": trip_id,
            "origin": offer.get("originCity") or "",
            "destination": offer.get("destinationCity") or "",
            "departureTime": clock_from_label(offer.get("departureLabel")),
            "arrivalTime": _arrival_clock(offer),
            "vehicleType": offer.get("vehicleType") or "",
            "priceVnd": trip.get("priceVnd") or offer.get("priceVnd") or 0,
            "pickupPoint": offer.get("pickupPoint") or "",
            "dropoffPoint": offer.get("dropoffPoint") or "",
            "seatNoun": trip.get("seatNoun") or offer.get("seatNoun") or "chỗ",
        }

    snapshot: dict[str, Any] = {
        "id": f"booking-{conversation_id}",
        "conversationId": conversation_id,
        "status": "collecting",
        "origin": offer.get("originCity"),
        "destination": offer.get("destinationCity"),
        "travelDateLabel": date_from_departure_label(offer.get("departureLabel")),
        "passengerCount": trip.get("seatsHeld"),
        "selectedTrip": selected,
        "seats": trip.get("seatCodes") or [],
        "passengerName": None,
        "phone": None,
        "totalFareVnd": trip.get("totalVnd"),
        "bookingCode": None,
    }
    snapshot.update(overrides)
    return snapshot


def build_realtime_event(
    *, call_id: str, event_id: str, sequence: int, payload: Mapping[str, Any]
) -> dict[str, Any]:
    """Attach the required ordering envelope to a browser data event."""
    if sequence < 1:
        raise ValueError("sequence must be positive")
    return {
        **payload,
        "callId": call_id,
        "eventId": event_id,
        "sequence": sequence,
    }


def build_confirmation_request(
    *,
    conversation_id: str,
    trip_id: str,
    passenger_name: str,
    phone: str,
    latest_final_user_transcript: Optional[str],
) -> Optional[dict[str, str]]:
    """Build a confirmation request only when the user's final words are known."""
    confirmation_text = (latest_final_user_transcript or "").strip()
    if not confirmation_text:
        return None
    return {
        "conversationId": conversation_id,
        "tripId": trip_id,
        "passengerName": passenger_name,
        "phone": phone,
        "confirmationText": confirmation_text,
    }
