# LiveKit Agent Integration Design

## Mục tiêu

Tích hợp `feature/TASK-003-staff-live-call-console` với tài liệu và safety contracts mới nhất trên `dev`, tạo một nguồn code thống nhất có LiveKit/VALSEA Agent, rồi merge kết quả đã kiểm chứng vào local `main`.

Tạo thêm `docs/current-vs-target-architecture.md` để so sánh kiến trúc tạm hiện tại với nhóm main features của sản phẩm: cuộc gọi đến, nhân viên nhận cuộc gọi, trao quyền Agent, VALSEA ASR, live transcript, tự điền field, confirmation, dashboard và quản trị dữ liệu nhà xe.

## Phương án đã chọn

Giữ nguyên lịch sử 15 commit của TASK-003. Pull branch bằng fast-forward, merge `dev` vào feature branch, resolve conflict theo ownership, kiểm chứng toàn bộ, commit tài liệu trạng thái, rồi merge feature branch vào local `main`.

Không cherry-pick từng commit và không squash vì hai cách này làm giảm traceability của LiveKit/VALSEA implementation.

## Nguồn sự thật khi resolve conflict

| Khu vực | Nguồn ưu tiên | Quy tắc |
|---|---|---|
| LiveKit transport, `/call`, `/staff`, Agent worker, VALSEA adapter | TASK-003 | Giữ implementation và test đã có trên feature branch |
| Booking evidence, explicit confirmation, idempotency, security boundaries | `dev` | Giữ invariant chặt hơn; điều chỉnh feature code nếu contract không khớp |
| Product wording và current/target claims | `dev` làm baseline, đối chiếu code TASK-003 | Không claim credentialed provider success khi thiếu live evidence |
| Package manifests và lockfile | Hợp nhất dependency thực tế | Regenerate lockfile bằng pnpm nếu conflict không thể resolve nguyên văn |
| Demo/release docs | Evidence mới nhất có thể kiểm chứng | Tách local fallback, production web và credential-blocked worker |

## Kiến trúc sau tích hợp

```text
Incoming call / mobile caller
          |
          v
LiveKit room + short-lived server token
          |
          +--> Staff console: nhận cuộc gọi, live transcript, takeover
          |
          +--> Agent worker: VALSEA ASR -> booking proposals -> TTS
                                      |
                                      v
                          booking contracts/core
                           evidence + validation
                                      |
                                      v
                           persistence boundary
```

Staff-first authority vẫn là invariant: nhân viên sở hữu phiên sau khi nhận cuộc gọi; Agent chỉ tự trả lời khi session được trao quyền. Agent/staff messages không thay thế final passenger-message evidence. Agent không tự xác nhận booking.

## Tài liệu current versus target

`docs/current-vs-target-architecture.md` gồm:

1. Runtime đang có và luồng dữ liệu thực tế.
2. Ma trận main feature với trạng thái `Đã có`, `Một phần`, `Chưa có`.
3. Bằng chứng source/test/doc cho từng kết luận.
4. Phân biệt demo local, code seam, credentialed smoke và production-live capability.
5. Gap ưu tiên để đạt challenge requirements, đặc biệt VALSEA live evidence, audio tiếng Việt khó, dashboard doanh nghiệp và pilot roadmap.

Tài liệu không phục hồi `docs/main-features.md`; target features được nêu một lần trong ma trận để tránh duplicate source of truth.

## Failure handling

- Merge conflict chưa rõ ownership: đối chiếu tests, contracts và commit intent; không chọn toàn bộ một phía theo file.
- Dependency conflict: giữ dependency cần cho cả code paths, regenerate lockfile, chạy typecheck/build.
- Test baseline fail trước merge: dừng tích hợp và báo lỗi gốc.
- Test fail sau merge: phân loại conflict regression trước khi commit.
- Thiếu credentials: giữ local fallback, đánh dấu live smoke blocked; không fake provider success.
- Local `main` có thay đổi ngoài dự kiến: dừng trước checkout/merge và bảo toàn branch tích hợp.

## Verification

Trước commit tích hợp và sau merge vào `main`, chạy:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
python Agent tests theo toolchain khai báo trong agent/pyproject.toml
git diff --check
```

Thêm kiểm tra secret patterns, unresolved conflict markers, doc placeholders và đối chiếu từng dòng trong ma trận capability với source/test evidence.

## Merge outcome

- Feature branch chứa merge commit từ `dev`, conflict resolutions và tài liệu current-vs-target.
- Local `main` nhận feature branch chỉ sau full verification.
- Không push remote vì user chỉ yêu cầu merge vào `main`, chưa yêu cầu publish.

