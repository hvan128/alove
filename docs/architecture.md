# Kiến trúc VéĐi staff-first

## Quyết định

VéĐi tách UI web ngắn hạn khỏi media worker dài hạn:

```text
Điện thoại /call                         Desktop /staff
       |                                      |
       +--------- LiveKit audio + data -------+
                          |
                  named agent dispatch
                          |
              Python LiveKit worker
             /          |           \
     VALSEA RTT      guarded LLM    VALSEA TTS
       STT              Auto only      speech
                          |
                  vedi.events protocol
                          |
           deterministic booking reducer
                          |
               Neon final state + audit
```

Next.js chạy `/staff`, `/call`, `/api/livekit/token`, `/api/config` và `/api/sessions/[sessionCode]`. LiveKit worker là process riêng vì cuộc gọi cần WebSocket và vòng đời dài hơn Vercel Function.

## Hai data plane

1. Audio plane: LiveKit truyền mic người gọi đến worker và audio TTS về phòng.
2. Event plane: topic `vedi.events` truyền status, transcript, booking snapshot, gợi ý và lệnh nhân viên.

Mọi event có `version`, `eventId`, `sessionCode`, `occurredAt` và discriminated `type`. Reducer idempotent theo `eventId`.

## Luồng nhận dạng và đặt vé

```text
caller audio
  -> mono PCM16 16 kHz
  -> VALSEA session.created / session.start / session.ready
  -> transcript.partial (chỉ hiển thị)
  -> transcript.final (append + extraction)
  -> field value + exact quote + confidence + source
  -> staff review/edit lock
  -> explicit staff confirmation
```

Partial không bao giờ điền phiếu hoặc được lưu database. Chỉ final có vai trò `caller` được phép thay đổi booking. Tin nhắn staff/agent không trở thành dữ kiện khách hàng.

## Human và Auto

- Human là mặc định. Worker vẫn STT và gợi ý, nhưng `on_user_turn_completed` ném `StopResponse` sau khi lưu context nên không có spontaneous speech.
- `staff.speak` được nhân viên duyệt và có thể phát bằng VALSEA TTS ở cả hai mode.
- Auto cho phép LLM sinh một phản hồi sau final turn. Prompt cấm bịa giá, chuyến, ghế hoặc xác nhận thành công.
- Confirmation gate và catalog nằm trong TypeScript core xác định; LLM không có quyền xác nhận booking.

## Participant và quyền

- Room: `vedi-<session-lowercase>`.
- Caller identity: `caller-<SESSION>`; chỉ caller token dispatch named agent.
- Staff identity: `staff-<SESSION>-<random>`; không dispatch agent lần hai.
- Token TTL 20 phút, scope đúng một room, secret chỉ ở server.
- Worker chỉ link audio input với identity caller đã biết và chỉ nhận `staff.*` từ identity staff cùng session.

## Persistence

Neon lưu:

- event đã validate với unique `(call_id, event_id)`;
- final transcript nguyên bản, translations tách riêng và timestamps;
- booking snapshot theo revision, field evidence, staff locks và review items;
- audit cho snapshot và confirmation.

Không lưu partial hoặc raw audio. Khi thiếu `DATABASE_URL`, UI vẫn chạy và API báo `durable: false` với memory repository.

Khi nhân viên chọn English, worker chỉ gửi final transcript tới OpenAI để dịch, đặt `store: false` và timeout 2,5 giây. Câu gốc vẫn là nguồn evidence; lỗi dịch không chặn VALSEA STT hoặc tự điền booking.

## Trust boundary của demo

Mã phiên hiện là mã ghép room, không phải cơ chế xác thực. Bản public chỉ dùng dữ liệu mẫu. Trước pilot có hành khách thật phải thêm staff auth, caller invite có chữ ký/hết hạn, authorization cho session API và rate limit cho token endpoint; không bật LiveKit production chỉ bằng một mã phiên dễ đoán.

## Fallback trung thực

Khi thiếu LiveKit, BroadcastChannel/localStorage đồng bộ hai tab cùng browser. Browser Speech Recognition và device Speech Synthesis được ghi nhãn rõ là fallback, không phải VALSEA. UI chỉ hiển thị `VALSEA đang nghe` sau event `session.ready` từ worker.
