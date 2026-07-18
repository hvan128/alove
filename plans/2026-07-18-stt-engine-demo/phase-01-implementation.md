# Phase 01 — Sửa giao thức VALSEA + dựng `/engine`

## Context

- ADR: `adrs/0009-valsea-stt-google-chirp3-tts.md` (VALSEA là STT chính thức, adapter Node đang sai giao thức).
- Giao thức thật đã verify: `agent/valsea_stt.py` (Python, dùng cho LiveKit agent) — dùng làm nguồn sự thật để sửa `packages/providers/src/valsea.ts` (Node, dùng cho gateway `apps/api`).
- Pipeline tái dùng: `apps/web/src/hooks/use-zalo-replay.ts`, `apps/web/src/components/bus-call/booking-summary.tsx`, `packages/core/src/bus-booking.ts`, `packages/providers/src/openai.ts`.

## Bước 1 — Sửa `packages/providers/src/valsea.ts`

Đối chiếu từng điểm với `agent/valsea_stt.py`:

1. `session.start` phải kèm `language` (tên đầy đủ, vd `"vietnamese"`, không phải mã `"vi"`) và `model: "valsea-rtt"`. Thêm option `language` vào `ValseaSessionOptions` (mặc định `'vi'`), map sang tên đầy đủ như Python (`_LANGUAGE_NAMES`).
2. Không chuyển trạng thái `'live'` / xả hàng đợi frame ngay khi socket mở. Phải đợi message `{"type":"session.ready"}` từ server rồi mới xả `pendingFrames` và set `'live'` — cơ chế `pendingFrames`/`pendingCommit` đã có sẵn trong file, chỉ cần đổi điều kiện kích hoạt từ `socket.on('open')` sang khi nhận `session.ready`.
3. `endUtterance()` phải là no-op thật sự (không gửi `input_audio_buffer.commit` hay bất kỳ message nào) — VALSEA tự làm endpointing, mọi commit-style message đều bị `UNKNOWN_MESSAGE`. Xoá đoạn gửi message trong `endUtterance`, giữ lại type/signature để không phá caller hiện có (`apps/api/src/live-valsea.ts`, `apps/api/src/server.ts`).
4. `mapValseaTranscriptEvent`: giữ khả năng đọc cả hai dạng payload (nested `transcript: {...}` — test cũ/tài liệu cũ — và flat `{text, rawText, isFinal, timestampMs}` — payload thật). Đã có fallback một phần; bổ sung đọc `raw.isFinal` để xác định `kind` khi `type` không rõ ràng là `transcript.final`/`transcript.partial` (payload thật luôn có `type` đúng nên đây là phòng hờ, không bắt buộc phải đổi nếu test hiện tại đã pass).

File cần sửa: `packages/providers/src/valsea.ts`.
File cần đọc đối chiếu: `agent/valsea_stt.py`.

## Bước 2 — Test cho bản sửa

- `packages/providers/test/valsea.test.ts`: thêm test cho payload phẳng thật (`{type:'transcript.final', text, rawText, isFinal:true, timestampMs}`, không có `transcript`/`start_ms`/`confidence`) → vẫn map ra `text` đúng, `confidence: null`.
- Nếu có thể test được `createValseaSession` mà không cần domain thật (mock `ws`), thêm test xác nhận: (a) `session.start` gửi có `language`/`model`; (b) `sendFrame` gọi trước khi nhận `session.ready` không gửi ngay mà giữ trong hàng đợi; (c) `endUtterance()` không gửi message nào. Nếu mock WebSocket tốn công không tương xứng, bỏ qua và ghi rõ lý do trong báo cáo — ưu tiên test `mapValseaTranscriptEvent` (thuần, dễ test) và verify hành vi session bằng test thủ công qua `apps/api/src/live-valsea.ts` (`pnpm --filter @ordervoice/api test:live:valsea` với `VALSEA_API_KEY` + file PCM16 thật).

## Bước 3 — Baseline OpenAI (ASR "thường" để so sánh)

- `packages/providers/src/openai.ts`: thêm `transcribeWithOpenAiBaseline(audio: File): Promise<string>` dùng `getOpenAiClient().audio.transcriptions.create({ file: audio, model: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'whisper-1' })`, trả về `.text`. Không thêm ngôn ngữ ép buộc — để lộ đúng điểm yếu (baseline không được ưu ái tiếng Việt).
- `apps/web/src/app/api/engine/baseline/route.ts` (mới): `POST`, nhận `multipart/form-data` (field `audio`), gọi `transcribeWithOpenAiBaseline`, trả `{ text }`. Trả lỗi 503 rõ ràng nếu thiếu `OPENAI_API_KEY` (theo pattern `route.ts` hiện có, không throw mập mờ). Không cần auth — đây là API demo nội bộ, không ghi dữ liệu, không phải đường ghi booking.

## Bước 4 — Trang `/engine`

- `apps/web/src/app/engine/page.tsx`: server component, mirror `apps/web/src/app/console/page.tsx` — render `AppShell` + `EngineWorkspace`, seed `conversationId` mới (`engine-${crypto.randomUUID()}` hoặc timestamp tương tự cách `/console` seed).
- `apps/web/src/components/engine/engine-workspace.tsx` (mới, 'use client'):
  - Dùng `useZaloReplay` (đã sửa gateway) để: nhận file từ `<input type="file">` HOẶC từ bản ghi mic (bước dưới), phát lại → PCM16 → gateway → transcript partial/final.
  - Ghi âm mic: thêm hook nhỏ `useRecordedAudio` (mới, `apps/web/src/hooks/use-recorded-audio.ts`) bọc `MediaRecorder` — `start()/stop()` trả về một `File` (webm/opus) rồi gọi thẳng `replay.selectFile(file)` để tái dùng đúng một pipeline cho cả hai nguồn audio (đơn giản hơn, và đảm bảo bản ghi mic với bản upload đi qua cùng logic, cùng baseline).
  - Khi có transcript `final`: gọi `advanceBookingAgent(draft, message)` (tạo `CallMessage` giống pattern trong `apps/web/src/app/api/booking/advance/route.ts`) để cập nhật `BookingDraft`, hiển thị bằng `<BookingSummary booking={draft} />`.
  - Đo thời gian: mốc bắt đầu = lúc `replay.start()` được gọi; mốc kết thúc = lúc segment `final` đầu tiên tới. Hiển thị số giây.
  - Gọi song song `POST /api/engine/baseline` với cùng file audio ngay khi có file (không đợi VALSEA xong) để hiển thị so sánh cạnh nhau.
  - Callout "Gợi ý kịch bản" liệt kê câu mẫu mà `bus-booking.ts` hiểu đúng (tuyến Sài Gòn–Đà Lạt, cụm ngày giờ, số điện thoại 10 số, cụm xác nhận) — không che giấu giới hạn, ghi rõ đây là demo cho tuyến/kịch bản cụ thể.
  - Toàn bộ copy hiển thị dùng tên "Lõi nhận diện giọng nói VéĐi", không nhắc VALSEA.
- Component con nếu cần tách nhỏ (theo prop-drilling hiện tại của `bus-call`/`console`): `apps/web/src/components/engine/baseline-panel.tsx` (transcript đối chứng), có thể gộp phần audio-source-picker ngay trong `engine-workspace.tsx` nếu không quá dài (ưu tiên KISS, chỉ tách khi file vượt ~150-200 dòng).
- Thêm link tới `/engine` từ trang chủ (`apps/web/src/app/page.tsx`) hoặc từ `AppShell` nav nếu có chỗ hợp lý — kiểm tra `app-shell.tsx` trước khi thêm.

## Bước 5 — Test UI

- `apps/web/src/components/engine/engine-workspace.test.tsx`: theo đúng pattern `bus-call-workspace.test.tsx` — không thật sự chạy AudioContext/WebSocket, chỉ test: chọn file → hiện tên file/preview; có nút ghi âm; sau khi giả lập một transcript `final` (qua trigger hook giả) → `BookingSummary` hiển thị đúng trạng thái; gọi baseline route (mock `fetch`) → hiển thị transcript đối chứng.

## Bước 6 — Tài liệu

- Cập nhật `README.md`: thêm `/engine` vào phần "Đã triển khai"/hướng dẫn chạy local, ghi rõ (trong docs, không phải UI) rằng ASR là VALSEA và baseline so sánh là OpenAI Whisper.
- Cập nhật `adrs/0009-valsea-stt-google-chirp3-tts.md` phần "Consequences": đánh dấu mục "packages/providers/src/valsea.ts đang sai giao thức" là đã sửa, dẫn tới commit/PR này.
- Không tạo tài liệu roadmap pilot ở đây — đề bài yêu cầu file roadmap riêng (1-2 trang), sẽ làm ở việc kế tiếp nếu người dùng yêu cầu.

## Kiểm thử/Verify

- `pnpm --filter @ordervoice/providers test`
- `pnpm --filter @ordervoice/web test`
- `pnpm --filter @ordervoice/web typecheck` (hoặc `pnpm -r --if-present typecheck`)
- `pnpm lint`
- Chạy tay: `pnpm dev:api` + `pnpm dev:web`, set `NEXT_PUBLIC_GATEWAY_URL=http://localhost:3001` cho web, mở `/engine`, tải một file audio tiếng Việt thật, xác nhận transcript thật đổ về (không phải fallback trình duyệt) và phiếu vé hiện đúng khi nói đúng kịch bản gợi ý.

## Rủi ro / rollback

- Nếu sửa giao thức mà vẫn không nhận được `session.ready` thật từ VALSEA (vd sandbox key hết hạn/khác điểm cuối) — không che giấu bằng dữ liệu giả; báo lỗi rõ trên UI ("Chưa kết nối được lõi giọng nói — kiểm tra cấu hình gateway/API key") đúng theo `onStatus('error', ...)` đã có sẵn trong hook.
- Thay đổi ở `packages/providers/src/valsea.ts` ảnh hưởng cả `apps/api` (gateway) lẫn không ảnh hưởng `agent/valsea_stt.py` (Python, độc lập) — không đụng tới agent Python trong phase này.

## Đã verify thật (2026-07-18)

Chạy `pnpm --filter @ordervoice/api test:live:valsea` với `VALSEA_API_KEY` thật + một câu tiếng Việt tổng hợp bằng giọng `Linh` (`say -v Linh`, macOS) có code-switch ("Tôi muốn **book** 2 vé từ Sài Gòn đi Đà Lạt..."):
đúng dấu, đúng số, giữ nguyên từ "book". Phát hiện thêm: nếu audio cắt đột ngột (không có khoảng lặng cuối), VALSEA không kịp trả `transcript.final` trước khi `useZaloReplay` đóng session ngay khi phần tử `<audio>` phát xong (`media.onended`) — đã sửa `use-zalo-replay.ts` để chờ ~2.5s (`END_OF_PLAYBACK_GRACE_MS`) sau khi phát xong rồi mới đóng, và thêm gợi ý trong UI: để lại ~2 giây im lặng cuối câu.
