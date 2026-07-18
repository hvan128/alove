# Phase 01 — SIP ingress: số điện thoại vào LiveKit room

## Context

- Agent worker: `agent/agent.py` (dispatch theo `LIVEKIT_AGENT_NAME=vedi`, room `booking-<id>`).
- LiveKit Cloud project đã có. Chưa có tài khoản telco.
- LiveKit SIP: inbound trunk nhận cuộc gọi từ trunk provider, dispatch rule tạo room
  riêng cho từng cuộc gọi và dispatch agent.

## Yêu cầu

1. Cuộc gọi vào số DID → LiveKit tạo room `booking-<suffix>` → agent `vedi` join, chào khách.
2. Agent hoạt động không cần data-channel (người gọi điện thoại không có nút
   "Tôi nói xong") — cascade VAD/turn-rules đã đáp ứng, chỉ cần xác nhận không có
   code path bắt buộc data-channel.
3. Lấy số người gọi từ SIP participant attributes (`sip.phoneNumber`) để phase-02 lưu.

## Files

- Tạo: `scripts/sip/inbound-trunk.example.json` — template `lk sip inbound-trunk create`.
- Tạo: `scripts/sip/dispatch-rule.example.json` — individual room prefix `booking-`,
  `room_config.agents = [{ agent_name: "vedi" }]`.
- Tạo: `docs/pstn-sip-runbook.md` — runbook từng bước: tài khoản telco → mua số →
  origination về LiveKit SIP URI → tạo trunk/dispatch rule bằng `lk` CLI → gọi thử.
- Sửa: `agent/agent.py` — đọc `sip.phoneNumber` từ participant attributes khi có,
  truyền vào `BusBookingAgent` (giữ làm metadata, phase-02 gửi kèm `/api/call/events`);
  dùng `noise_cancellation.BVCTelephony()` cho participant SIP nếu plugin hỗ trợ,
  fallback BVC hiện tại.
- Sửa: `agent/.env.example` — ghi chú SIP không cần env mới phía agent.

## Bước

1. Viết 2 template JSON + runbook (kèm lệnh `lk sip ... create` cụ thể).
2. Sửa agent đọc attributes SIP + chọn noise cancellation.
3. `python -m py_compile agent/*.py`.

## Verify

- py_compile xanh. Review tay: không code path nào yêu cầu data-channel để agent nói.
- Cuộc gọi thật: chờ trunk (ghi rõ trong runbook, không claim đã test live).

## Rủi ro / rollback

- Sai shape JSON trunk/dispatch → chỉ ảnh hưởng script/doc, không ảnh hưởng runtime.
- Thay đổi agent.py nhỏ, revert độc lập được.
