# Capabilities and Evidence

## Tóm tắt

Tài liệu này là nguồn chuẩn để trả lời: **VéĐi làm được gì hôm nay, bằng chứng ở đâu và cần gì để nâng cấp trạng thái?**

Kết luận ngắn:

- Local/public profile đã chứng minh UI hai phía, final-only field filling, evidence, suggestion, Human/Auto boundary, confirmation demo và fallback.
- LiveKit, VALSEA và Neon có code/schema/tests nhưng chưa có credentialed runtime proof trên release public.
- Queue/assignment, enterprise dashboard, operator catalog và conflict-safe seat inventory thuộc roadmap.
- Payment, external seat guarantee, PSTN/SIP, Zalo raw-call audio, delivery messaging và autonomous confirmation ngoài phạm vi đến khi phê duyệt riêng.

## Cách đọc trạng thái

| Trạng thái | Tiêu chuẩn |
|---|---|
| **Verified** | Behavior hiện hành có test hoặc deployment evidence trong đúng profile được nêu |
| **Code-ready** | Implementation, fixture hoặc schema tồn tại nhưng thiếu credentialed runtime proof hoặc operational gate |
| **Roadmap** | Đã được thiết kế/spec nhưng chưa có implementation đủ contract |
| **Out of scope** | Chủ động loại khỏi phạm vi hiện tại; không được suy ra từ adapter/UI |

`Verified` không đồng nghĩa production. Phạm vi evidence luôn gồm runtime profile, source SHA/deployment ID, dữ liệu test và ngày quan sát.

## Feature matrix

| ID / capability | Giá trị khách hàng | Status | Current behavior | Source chính | Test/evidence | Missing proof/work | Phase |
|---|---|---|---|---|---|---|---|
| **F-01 Incoming-call notification and staff acceptance** | Nhân viên nhận đúng phiên, tránh tranh chấp ownership | **Roadmap** | `/staff` biết caller presence nhưng chưa có queue, ringing state hoặc atomic accept | `apps/web/src/components/staff/call-toolbar.tsx` | `apps/web/src/components/staff/staff-workspace.test.tsx` chỉ chứng minh single-session cockpit | Queue, notification, accept/timeout, exclusive assignment và audit | P2 |
| **F-02 Staff-first reply authority** | Con người kiểm soát lúc Agent được nói | **Verified** — local scope | Human mặc định; toggle Auto có thể thu hồi, nhưng chưa gắn staff identity/owner | `apps/web/src/lib/call/session-state.ts`; `agent/booking_policy.py` | `session-state.test.ts`; `agent/test_booking_policy.py` | Staff auth, accepted owner, delegation scope/reason và audit | P1 |
| **F-03 VALSEA-first Vietnamese voice pipeline** | Dùng provider bắt buộc cho voice pilot | **Code-ready** | Worker yêu cầu `VALSEA_API_KEY`, parse partial/final và dùng VALSEA TTS; public release không bật | `agent/valsea_stt.py`; `agent/agent.py` | `agent/test_valsea_stt.py`; [integration status](integration-test-status.md) | Sandbox key, real audio, latency, TTS, reconnect và failure smoke | P1 |
| **F-04 Difficult Vietnamese audio** | Hoạt động với giọng vùng miền/noise/code-switch thực tế | **Code-ready** | Unicode/original transcript và audio normalization có; chưa có benchmark | `agent/valsea_stt.py`; `apps/web/src/components/livekit/live-call-room.tsx` | Protocol fixtures; chưa có credentialed sample result | Bộ mẫu consented/synthetic, WER/critical-field accuracy theo condition | P1 |
| **F-05 Staff live transcript** | Nhân viên nhìn partial/final theo speaker | **Verified** — local scope | Partial chỉ hiển thị; final ổn định có source/confidence và mới cập nhật facts | `apps/web/src/components/staff/live-transcript.tsx`; `session-state.ts` | `staff-workspace.test.tsx`; `session-state.test.ts` | VALSEA-backed observation và latency distribution | P1 |
| **F-06 Evidence-backed automatic field filling** | Giảm nhập tay, vẫn truy vết được | **Verified** — local scope | Final caller message điền route/date/time/passenger/contact/pickup/dropoff; giữ quote/source/revision | `packages/core/src/bus-booking.ts`; `booking-form.tsx` | `packages/core/test/bus-booking.test.ts`; component tests | Pilot benchmark, typed evidence storage và redaction | P1 |
| **F-07 Missing-field navigation** | Hỏi đúng phần thiếu, không lặp vô ích | **Verified** — deterministic scope | Core tính field thiếu/review và tạo suggestion theo nhóm | `packages/core/src/bus-booking.ts`; `assistant-rail.tsx` | `bus-booking.test.ts`; `staff-workspace.test.tsx` | Benchmark hội thoại tự nhiên và confidence escalation policy | P1 |
| **F-08 Reply suggestions and delegated auto-reply** | Nhân viên chọn hỗ trợ hoặc giao Agent | **Verified** — local Auto/Human | Suggestion hiển thị; local Auto tạo tối đa một reply/final, takeover giữ state; live worker chưa smoke | `staff-workspace.tsx`; `agent/agent.py` | `staff-workspace.test.tsx`; `agent/test_booking_policy.py` | Credentialed LLM/TTS smoke, owner authorization và delegation audit | P1 |
| **F-09 Catalog-bound trip proposal** | Không bịa chuyến, giá hoặc ghế | **Verified** — sample catalog | Core chỉ chọn từ `createBusDemoCatalog()` và deterministic seat list | `packages/core/src/bus-booking.ts` | `packages/core/test/bus-booking.test.ts` | Published catalog version, operator workflow và inventory source | P2 |
| **F-10 Field validation and explicit confirmation** | Chặn booking thiếu hoặc mơ hồ | **Verified** — local scope | Confirmation gate kiểm required fields, evidence và blocking review; Agent không có authority | `packages/core/src/bus-booking.ts`; `assistant-rail.tsx` | `bus-booking.test.ts`; `staff-workspace.test.tsx` | Identity/authorization và production catalog/inventory validation | P1 |
| **F-11 Idempotent booking issuance** | Retry không tạo booking kép | **Verified** — demo scope | Core sinh stable code và event repository dedupe duplicate event | `packages/core/src/bus-booking.ts`; `session-repository.ts` | `bus-booking.test.ts`; `session-repository.test.ts` | Durable transaction, scoped request/summary hash, conflict/retry test | P1 |
| **F-12 Enterprise operations dashboard** | Supervisor quản lý queue, owner, metrics và audit | **Roadmap** | Chỉ có single-session staff cockpit | `apps/web/src/components/staff/staff-workspace.tsx` | Current UI/component tests | Multi-session queue, roles, search, departures, metrics, alerts | P2 |
| **F-13 Bus-operator data management** | Nhà xe cập nhật tuyến/chuyến/xe/giá có version | **Roadmap** | Catalog tĩnh trong code; chưa có CRUD/draft/publish | `packages/core/src/bus-booking.ts` | Sample catalog unit tests | Normalized model, validation, immutable publish, CSV dry-run, role access | P2 |
| **F-14 Persistence and audit** | Khôi phục và audit final facts/authority | **Code-ready** | Memory repository hoạt động; Neon schema/migration/repository có, partial bị bỏ qua | `apps/web/src/lib/db/session-repository.ts`; `db/schema.ts` | `session-repository.test.ts`; `db/test/db.test.ts` | Credentialed migration/query, retention/deletion job, transaction evidence | P1 |
| **F-15 Multilingual and code-switch handling** | Giữ English terms trong hội thoại tiếng Việt | **Code-ready** | Original final được giữ; staff có original/vi/en view; English translation dùng `store:false` | `agent/transcript_translation.py`; `staff-workspace.tsx` | `agent/test_transcript_translation.py`; component test | Live intra-sentence benchmark, low-confidence identity policy | P1 |
| **F-16 Safe fallback and human escalation** | Tiếp tục phục vụ khi provider lỗi | **Verified** — local scope | Text/preset, browser fallback label, Human takeover và readiness API | `demo-channel.ts`; `caller-workspace.tsx`; `livekit/server.ts` | Caller/staff/session tests; public `/api/config` evidence | Credentialed failure drills, recovery metric, incident exercise | P1 |
| **F-17 Demo and delivery evidence** | Giám khảo/khách hàng kiểm chứng được release | **Verified** — public web/local profile | Public URL, manifest, architecture/deployment docs và truthful runtime config | `docs/vedi-release-manifest.md`; `docs/demo-playbook.md` | Deployment `dpl_9ZZXQxgRgHaJrkXPYg7RYPH2W6Ce`; historical smoke | Credentialed demo evidence, anonymous repo check, refreshed SHA per release | P0 |
| **F-18 Operator seat layout and pilot-safe inventory** | Nhân viên giữ ghế có expiry, tránh hai phiên lấy cùng ghế | **Roadmap** | Chỉ có static available seats, draft seat field và JSONB; không phải inventory/hold | `packages/core/src/bus-booking.ts`; `db/schema.ts` | Deterministic seat assignment tests | Vehicle template, per-trip seat row, atomic hold/expiry/release/consume, conflict tests | P2 |

## Challenge requirement mapping

| Yêu cầu challenge | Kết luận | Evidence | Gate còn thiếu |
|---|---|---|---|
| Vietnamese voice qua VALSEA | **Code-ready** | Worker/adapters và protocol tests | Credentialed difficult-audio run |
| Messy audio/code-switch | **Code-ready** | Unicode/original preservation, translation fallback | Consented benchmark theo accent/noise |
| Staff dashboard | **Verified** single-session; **Roadmap** enterprise | `/staff` component/E2E evidence | Incoming queue, assignment, multi-session operations |
| Auto-fill | **Verified** local | Core unit + staff component tests | Pilot accuracy sample |
| Agent delegation | **Verified** local; live worker **Code-ready** | Human/Auto tests và worker policy | Authenticated owner + live LLM/TTS |
| Evidence và safety | **Verified** local | Exact quote/revision, confirmation gate, stable code | Durable transaction và retention controls |
| Demo/deployment deliverables | **Verified** public local profile | URL, manifest, health/config, playbook | Provider-live video/evidence nếu dùng claim đó |

## Runtime and provider evidence

| Component | Current status | Evidence hiện có | Không chứng minh |
|---|---|---|---|
| Local event channel | **Verified** | Two-instance hook/component tests và production browser smoke | Cross-device network call |
| LiveKit token/room/dispatch | **Code-ready** | Room-scoped TTL tests, caller-only dispatch, reconnect component test | Cloud room, worker availability hoặc latency |
| VALSEA RTT/TTS | **Code-ready** | Protocol/parser/config unit tests; mandatory key guard | Provider accepted audio, final transcript quality hoặc TTS output |
| OpenAI translation/Auto LLM | **Code-ready** | Guard, timeout/failure tests, `store:false` | Current valid credential hoặc production response quality |
| Neon | **Code-ready** | Schema/migration, memory/Drizzle repository and dedupe tests | Live migration, query, backup hoặc retention job |
| Vercel web | **Verified** — historical release baseline | Public URL, deployment ID, health/config và browser smoke in manifest | Voice worker hosting hoặc enabled provider path |
| Twilio/PSTN | **Out of scope** | Provider seam/fixture only | Production phone number/call |
| Zalo raw-call audio | **Out of scope** | Replay seam only | Raw live call entitlement |

## Quality evidence

| Gate | Command | Current evidence |
|---|---|---|
| TypeScript tests | `pnpm test` | Current docs branch 2026-07-18: 93 tests pass |
| Lint | `pnpm lint` | Current docs branch: pass |
| Typecheck | `pnpm -r --if-present typecheck` | Current docs branch: pass, 6 workspaces |
| Build | `pnpm build` | Current docs branch: web + API pass; Next.js worktree-root warning không chặn build |
| E2E | `pnpm test:e2e` | Current docs branch: 4 Chromium flows pass |
| Python | `uv run pytest`; `uv run ruff check .` | Không chạy trong current worktree vì `uv` không có; manifest lịch sử ghi 13 tests |
| Markdown scope | `git diff --check`; relative-link scan | Current docs branch: pass; toàn bộ relative links resolve |

Source SHA và deployment ID chỉ được cập nhật khi kiểm tra trực tiếp. Test count lịch sử không được dùng để claim current pass nếu command không chạy trong environment hiện tại.

## Known gaps

1. Public release thiếu credentialed LiveKit/VALSEA/Neon evidence.
2. Session code chưa thay thế staff authentication và signed caller invite.
3. Confirmation chưa có durable authorization + scoped idempotency transaction.
4. Consent, retention/deletion automation, correlation và incident exercise chưa đủ cho dữ liệu thật.
5. Queue/assignment, enterprise dashboard, catalog publish và seat holds chưa implement.
6. Payment, external inventory guarantee, PSTN/SIP và delivery channel vẫn **Out of scope**.

## Promotion rules

| Từ | Sang | Evidence tối thiểu |
|---|---|---|
| Roadmap | Code-ready | Source + contract + deterministic tests + failure behavior |
| Code-ready | Verified pilot | Credentialed environment, approved sample, timestamp/request ID, latency/output và negative/fallback result |
| Verified local | Verified pilot | Chạy đúng multi-device/provider/data profile, không dựa local fallback |
| Verified pilot | Production | Identity/authorization, privacy controls, SLO/monitoring, load/DR, rollback exercise và customer acceptance |

Một adapter, fixture, UI label hoặc environment variable không đủ nâng trạng thái.

## Evidence appendix links

- [Current vs target architecture](current-vs-target-architecture.md): phân tích sâu current implementation và gaps.
- [Integration test status](integration-test-status.md): credential/runtime status theo provider.
- [VéĐi release manifest](vedi-release-manifest.md): source, deployment và quality evidence lịch sử.
- [Architecture](architecture.md): component, runtime và trust boundaries.
- [LiveKit + VALSEA deployment](livekit-valsea-deployment.md): credentialed smoke procedure.
- [Main feature specification](../specs/features.md): target contract F-01–F-18.
