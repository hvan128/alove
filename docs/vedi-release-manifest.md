# VéĐi staff-first release manifest

**Web artifact source:** `feature/TASK-003-staff-live-call-console@0297836`  
**Verified:** 2026-07-18, Asia/Ho_Chi_Minh  
**Production:** [https://ordervoice-vn.vercel.app](https://ordervoice-vn.vercel.app)

## Phạm vi đã giao

- `/staff`: transcript partial/final, chọn Nguyên bản/Tiếng Việt/English, gợi ý trả lời, Human/Auto, phiếu đặt xe có evidence/review/lock và confirm gate.
- `/call`: UI một cột cho điện thoại, explicit start/mic/end, text/câu mẫu/browser STT fallback và LiveKit media/data khi cấu hình.
- Event protocol dùng chung, deterministic incremental extraction và correction precedence; chỉ final của caller được phép cập nhật booking facts.
- LiveKit token 20 phút, room-scoped, caller-only named agent dispatch và readiness flag an toàn.
- Python worker dùng VALSEA realtime STT bắt buộc, OpenAI downstream LLM có guard, VALSEA TTS và English final-translation với `store=false`.
- Neon/Drizzle lưu final transcript, booking snapshot/evidence và audit; không lưu partial hoặc raw audio.
- `/console` redirect `/staff`; landing và `/design-system` đã phản ánh staff-first information architecture.

## Acceptance mapping

| Khả năng | Source chính | Evidence |
|---|---|---|
| Staff cockpit | `components/staff/*`, `app/staff/page.tsx` | 6 component flows + Chromium E2E + production browser |
| Mobile caller | `components/call/caller-workspace.tsx`, `app/call/page.tsx` | 6 component flows + 390px production smoke |
| Realtime transport | `hooks/use-call-session.ts`, `lib/call/*`, `live-call-room.tsx` | reconnect/end-call/data tests |
| Tự điền có evidence | `packages/core/src/live-booking.ts` | 18 core tests + E2E values |
| Human/Auto boundary | core reducer + Python `booking_policy.py` | unit, E2E và worker policy tests |
| VALSEA voice worker | `agent/agent.py`, `agent/valsea_stt.py` | protocol fixtures, 13 Python tests, import/compile |
| English translation | `agent/transcript_translation.py` | success/failure/privacy tests |
| Token security | `lib/livekit/server.ts` | 7 server tests, explicit readiness dispatch |
| Persistence | `db/schema.ts`, migration `0002_staff_live_call.sql` | DB schema/repository tests |
| No-key fallback | `lib/call/demo-channel.ts` | two-tab E2E + production booking confirmation |
| Third-party honesty | `docs/integration-test-status.md` | `/api/config` exposes actual readiness |

## Quality evidence

```text
pnpm lint                                   PASS
pnpm -r --if-present typecheck              PASS, 6 workspaces
pnpm test                                   PASS, 93 tests
pnpm test:e2e                               PASS, 4 Chromium flows
agent pytest                                PASS, 13 tests
agent ruff / compile / import               PASS
pnpm build                                  PASS, Next.js 16.2.10
pnpm audit --prod --audit-level moderate    PASS, no known vulnerabilities
git diff --check                            PASS
credential-pattern scan                     PASS
```

## Production evidence

| Mục | Evidence |
|---|---|
| Vercel project | `sireals-projects/ordervoice-vn` |
| Deployment | `dpl_9ZZXQxgRgHaJrkXPYg7RYPH2W6Ce` |
| Unique URL | `https://ordervoice-grq60lmfs-sireals-projects.vercel.app` |
| Public alias | `https://ordervoice-vn.vercel.app` |
| Target/state | `production` / `Ready` |
| Build region | `iad1` |
| Health | `/api/health` trả `{"status":"ok"}` |
| Runtime config | local fallback true; LiveKit/VALSEA/agent/Neon false |
| Browser smoke | 390px, two-tab call → staff, đủ fields, mã `VD-240718-3010` |
| Visual/runtime | không overlay, page error, overflow hoặc Vercel error log |

## Credential boundary

Web đang public và demo hoàn chỉnh trong hai tab cùng browser. Gọi thật giữa laptop và điện thoại chưa được claim vì chưa có LiveKit project/worker. VALSEA RTT/TTS và Neon cũng chưa live-smoke vì chưa có key/connection string.

Để bật đường multi-device, cần:

- Web/Vercel: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME`, `VOICE_AGENT_ENABLED=true`, `VALSEA_ENABLED=true`; thêm `DATABASE_URL` nếu dùng Neon.
- Worker: ba biến LiveKit giống web, `LIVEKIT_AGENT_NAME`, `VALSEA_API_KEY`, một `OPENAI_API_KEY` mới đã rotate; `OPENAI_MODEL` và `VALSEA_TTS_VOICE` là tùy chọn.

Key OpenAI từng xuất hiện trong hội thoại không được lưu, chạy hoặc deploy. Chủ key phải revoke/rotate và không tái sử dụng key đó.

Commit tài liệu sau deploy nằm ngoài Vercel project root `apps/web`; web artifact vẫn khớp source `0297836`.
