# ADR 0009: VALSEA cho STT, Google Chirp3-HD cho TTS

**Status:** Accepted (2026-07-18)
**Supersedes:** ADR 0008 mục 2 (Speechmatics làm STT mặc định)

## Decision

1. **STT là VALSEA** (`AGENT_ENGINE=cascade`, `STT_PROVIDER=valsea`). Người dùng
   chốt ngày 2026-07-18, sau khi ADR 0008 vừa bỏ ràng buộc VALSEA vài giờ trước.
   Speechmatics và OpenAI realtime lùi về vai trò A/B, không phải mặc định.
2. **TTS là Google Cloud TTS Chirp3-HD** giọng `Kore`, locale `vi-VN` — cùng
   giọng project-4 đang dùng. Cartesia `sonic-3` lùi về fallback khi thiếu
   credentials Google.
3. Service account Google nạp vào worker bằng **file mount** (`-v ...:/secrets/gtts.json:ro`
   + `GOOGLE_TTS_CREDENTIALS_FILE`), không nhét JSON vào `--env-file`.

## Rationale

- **VALSEA chuyên Đông Nam Á.** Trang chủ họ định vị là "Voice Intelligence for
  Southeast Asia", huấn luyện riêng cho giọng khu vực gồm tiếng Việt, xử lý
  code-switching và audio nhiễu đời thực. Speechmatics/Cartesia coi tiếng Việt
  là ngôn ngữ phụ — chính comment trong code project-4 ghi nhận sonic không hỗ
  trợ word timestamps cho `vi`.
- **Kiểm chứng thật:** đọc một câu đặt vé tiếng Việt vào VALSEA cho ra
  "Tôi muốn đặt 2 vé từ Hà Nội đi Nghệ An tối mai, tên ..." — đúng cả tên riêng,
  địa danh, và tự chuyển "hai" thành "2".
- **Chủ quyền credential.** VALSEA và OpenAI dùng key của chủ dự án; Speechmatics,
  Cartesia, Gemini, LiveKit đang mượn key project-4. Chọn VALSEA giảm phụ thuộc
  vào tài khoản của dự án khác.
- Giọng Cartesia bị đánh giá là không đạt khi nghe thử; Chirp3-HD là giọng
  project-4 đã dùng và người dùng thấy được.

## Consequences

- `packages/providers/src/valsea.ts` **đang sai giao thức** (xem commit sửa
  `agent/valsea_stt.py`): nó gửi `input_audio_buffer.commit` mà server trả về
  `UNKNOWN_MESSAGE`, và không truyền `language`. Adapter Node này phải sửa trước
  khi được dùng lại ở đâu đó, nếu không sẽ im lặng không ra transcript.
- VALSEA **không có TTS**, nên tiếng nói ra luôn phụ thuộc provider khác.
- Chưa đo chất lượng VALSEA trên audio điện thoại 8 kHz; phải đo trong cuộc gọi
  PSTN thật đầu tiên và ghi vào `docs/integration-feasibility.md`.
- Service account Google hiện là của project-4 (`praxis-backup-460102-t9`). Cần
  tách sang GCP project riêng của VéĐi trước khi chạy thương mại.
