import pytest

from booking_policy import (
    AgentMode,
    BookingVoicePolicy,
    caller_identity_for_session,
    normalize_session_code,
    session_code_from_dispatch,
)


def test_resolves_session_and_explicit_caller_identity() -> None:
    assert normalize_session_code(" demo-42 ") == "DEMO42"
    assert session_code_from_dispatch(
        room_name="vedi-wrong1",
        dispatch_metadata='{"sessionCode":"DEMO42"}',
    ) == "DEMO42"
    assert session_code_from_dispatch(
        room_name="vedi-demo42",
        dispatch_metadata=None,
    ) == "DEMO42"
    assert caller_identity_for_session("DEMO42") == "caller-DEMO42"

    with pytest.raises(ValueError, match="session"):
        normalize_session_code("<script>")


def test_human_mode_transcribes_but_suppresses_spontaneous_reply() -> None:
    policy = BookingVoicePolicy()

    decision = policy.on_caller_final("Tôi muốn đặt hai vé.")

    assert policy.mode is AgentMode.HUMAN
    assert decision.publish_transcript is True
    assert decision.generate_reply is False
    assert decision.speak_text is None


def test_auto_mode_allows_one_reply_for_a_final_caller_turn() -> None:
    policy = BookingVoicePolicy()
    policy.apply_room_command({
        "type": "staff.preferences",
        "mode": "auto",
        "transcriptLanguage": "original",
    })

    decision = policy.on_caller_final("Tôi muốn đặt hai vé.")

    assert policy.mode is AgentMode.AUTO
    assert decision.generate_reply is True
    assert decision.publish_transcript is True


def test_staff_approved_speech_is_allowed_in_both_modes() -> None:
    policy = BookingVoicePolicy()

    decision = policy.apply_room_command({
        "type": "staff.speak",
        "text": "Anh cho em xin số điện thoại người đi ạ.",
    })

    assert decision.speak_text == "Anh cho em xin số điện thoại người đi ạ."
    assert decision.generate_reply is False


def test_invalid_or_empty_commands_never_trigger_speech() -> None:
    policy = BookingVoicePolicy()

    assert policy.apply_room_command({"type": "staff.speak", "text": "   "}).speak_text is None
    assert policy.apply_room_command({"type": "unknown"}).speak_text is None
    assert policy.apply_room_command({
        "type": "staff.preferences",
        "mode": "robot",
    }).speak_text is None
    assert policy.mode is AgentMode.HUMAN


def test_end_turn_and_end_call_are_explicit_controls() -> None:
    policy = BookingVoicePolicy()

    assert policy.apply_room_command({"type": "staff.end_turn"}).commit_turn is True
    assert policy.apply_room_command({"type": "staff.end_call"}).end_call is True
