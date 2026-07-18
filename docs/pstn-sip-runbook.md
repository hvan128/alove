# Runbook: nối số điện thoại vào Alove qua LiveKit SIP

**Cập nhật:** 2026-07-18
**Trạng thái:** chưa có cuộc gọi thật nào — runbook này là các bước cần chạy tay khi có tài khoản trunk. Không đánh dấu "live" cho tới khi hoàn thành bước 7.

Luồng đích: khách gọi số DID → trunk provider chuyển SIP về LiveKit → dispatch rule tạo room `booking-<id>` và dispatch agent `alove` → agent chào, gọi booking API trong `apps/web` → dashboard `/dashboard` xem transcript và booking lưu trong Neon.

## 0. Điều kiện có sẵn

- LiveKit Cloud project (đã có) + `lk` CLI đã đăng nhập: `lk cloud auth`.
- Agent worker deploy và đăng ký tên `alove` (xem `agent/README.md`). Worker local dev tự đổi tên thành `alove-dev` nên KHÔNG nhận cuộc gọi prod.
- Web app deploy với `AGENT_WEBHOOK_SECRET`, `DATABASE_URL` (Neon), `DASHBOARD_ACCESS_KEY`.

## 1. Lấy SIP URI của LiveKit project

LiveKit Cloud dashboard → Settings → Project → mục **SIP URI**, dạng:

```text
sip:<project-id>.sip.livekit.cloud
```

Ghi lại giá trị này — trunk provider sẽ trỏ origination về đây.

## 2. Tạo tài khoản trunk + mua số

### Telnyx (khuyến nghị pilot)

1. Đăng ký telnyx.com, hoàn thành xác minh danh tính (KYC), nạp ~$10.
2. **Numbers → Buy Numbers** — mua một DID voice-capable (US ~$1/tháng).
3. **Voice → SIP Trunking → Create SIP Connection**, loại **FQDN**:
   - FQDN: `<project-id>.sip.livekit.cloud`, port 5060, transport TCP (hoặc TLS 5061).
   - Outbound calls không cần cho inbound pilot.
4. Gán số vừa mua vào SIP Connection đó (Numbers → gán connection).

### Twilio (thay thế)

1. Tài khoản Twilio đã KYC + credit.
2. **Elastic SIP Trunking → Trunks → Create**: Origination URI = `sip:<project-id>.sip.livekit.cloud`.
3. Gán số vào trunk (Phone Numbers → chọn số → Voice Configuration → SIP Trunk).

> Lưu ý: Telnyx/Twilio không bán số VN nội địa — pilot dùng số US/quốc tế, người gọi
> từ VN chịu cước quốc tế. Đường lên số VN: SIP trunk thương mại VN (FPT, CMC,
> iTel, VoIP24h…) trỏ origination về cùng SIP URI này; xác nhận entitlement +
> giá trước với nhà cung cấp trunk.

## 3. Tạo inbound trunk trên LiveKit

Sửa số thật vào `scripts/sip/inbound-trunk.example.json` (copy sang file không commit):

```bash
cp scripts/sip/inbound-trunk.example.json /tmp/alove-inbound-trunk.json
# sửa "numbers" thành số DID thật (định dạng E.164, ví dụ +15105550123)
lk sip inbound create /tmp/alove-inbound-trunk.json
```

## 4. Tạo dispatch rule

```bash
lk sip dispatch create scripts/sip/dispatch-rule.example.json
```

Rule này: mỗi cuộc gọi vào → room riêng `booking-<random>` → dispatch agent `alove`.
`conversationId` chính là phần sau `booking-` (agent và web đều đã parse theo prefix này).

## 5. Kiểm tra cấu hình

```bash
lk sip inbound list
lk sip dispatch list
```

## 6. Gọi thử

1. Đảm bảo agent worker prod đang chạy (`lk agent list` hoặc log của host).
2. Gọi vào số DID từ điện thoại thật.
3. Kỳ vọng: agent chào bằng tiếng Việt trong ~2–3 giây.
4. Mở `/dashboard` (đăng nhập bằng `DASHBOARD_ACCESS_KEY`): cuộc gọi hiện badge
   "Đang diễn ra", kênh "Điện thoại · +84…", transcript live chạy.
5. Đặt vé đến khi có mã vé → agent đọc mã, cúp máy; dashboard hiện booking `confirmed`.

## 7. Ghi nhận kết quả

Sau cuộc gọi thật đầu tiên, ghi lại ngày, provider, region số, latency chào và mỗi
lượt, chất lượng ASR tiếng Việt trên audio điện thoại 8 kHz cùng lỗi gặp. Chỉ sau
đó mới đổi trạng thái tài liệu này sang "live".

## Sự cố thường gặp

| Triệu chứng | Kiểm tra |
|---|---|
| Gọi vào đổ chuông rồi ngắt | Origination URI đúng SIP URI chưa; transport TCP/TLS khớp port |
| Kết nối nhưng im lặng | Agent worker có đang chạy và đăng ký đúng tên `alove` không (`lk agent list`) |
| Agent nói nhưng không có transcript trên dashboard | STT provider key trong `agent/.env`; xem log worker |
| Không thấy cuộc gọi trong dashboard | `DATABASE_URL` + `AGENT_WEBHOOK_SECRET` trên web app; log `[call-store]` |
| Số người gọi trống | Trunk có gửi số A-number không (một số provider ẩn caller ID) |
