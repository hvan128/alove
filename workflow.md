# Quy trình phát triển phần mềm với AI (Team + Agent)

> **Audience:** Team + AI agent làm việc trong một Git repo.  
> **Mục đích:** Quy trình và nguyên tắc vận hành — **không** mô tả stack hay cấu trúc riêng của từng dự án.  
> **Luật kỹ thuật từng repo:** đọc `AGENTS.md` (hoặc tài liệu tương đương) sau file này.

---

## 0. Đọc trước khi code (agents & developers)

| Thứ tự | Nạp context |
|--------|-------------|
| 1 | File này — quy trình & nguyên tắc |
| 2 | `AGENTS.md` — luật repo (stack, convention, Git…) |
| 3 | `specs/` — what/why/business rules |
| 4 | `adrs/` — how/tech/convention |
| 5 | Task hiện tại — Goal, AC, DoD, owner (`tasks/` hoặc sprint board) |
| 6 | Contracts liên quan — API/event/schema |
| 7 | Chỉ sau đó — đọc/sửa code trong phạm vi task & ownership |

**MUST:** Không code trước khi spec/task có Goal + AC. Không claim done / merge khi chưa DoD (§10). AI sai → sửa **context** trước khi đổi model.

**NEVER:** Push hoặc merge vào `main`, hoặc deploy, nếu chưa có yêu cầu rõ ràng từ người dùng. Không code khi thiếu context.

**ALWAYS:** Sau khi hoàn tất task và local verification pass, đồng bộ branch task với `dev`, resolve khác biệt hợp lý, chạy lại verification, rồi **hỏi người dùng có muốn merge vào `dev` không**. Không tự merge vào `dev`. Chỉ merge `dev` vào `main` và deploy khi người dùng yêu cầu rõ ràng.

---

## 0.1 Git freshness gate — bắt buộc trước khi đọc source

Mục đích: tránh đọc code từ feature branch cũ rồi kết luận sai rằng route, component hoặc hành vi chưa tồn tại.

**Hard gate:** trước khi tìm file, đọc source, đề xuất implementation hoặc kết luận code thiếu, phải chạy:

```bash
git status -sb
git diff --stat
git worktree list
git fetch origin --prune
git branch --show-current
git log --oneline --decorate -n 20 --all
```

Sau đó:

1. Nếu worktree bẩn bởi thay đổi không thuộc agent hiện tại, **dừng và báo**. Không checkout, pull, merge hoặc đọc source branch đó để suy luận task.
2. Xác minh `origin/dev` và mọi branch dependency của task. Nếu branch cần thiết chưa được merge vào `dev`, báo rõ source branch; không giả định checkout hiện tại là code mới nhất.
3. Tạo worktree riêng từ `origin/dev` mới nhất, rồi tạo `feature/TASK-NNN-slug` từ đó. Chỉ worktree này được đọc/sửa source cho task.
4. Trước khi nói route/file/hành vi "không tồn tại", xác minh trên `origin/dev` hoặc source branch dependency đã xác định.
5. Báo rõ branch và commit nguồn đang dùng trước khi implementation bắt đầu.

Không có bước nào ở trên → context Git chưa hợp lệ → không được bắt đầu task.

---

## 1. Công thức cốt lõi

```
Context đúng → AI hiểu đúng → Code đúng → Sản phẩm đúng
```

AI **khuếch đại** cách team làm việc — không thay team. Khi AI sai, ưu tiên sửa **context** (spec, ADR, contract, task, `AGENTS.md`) trước khi đổi model.

**Kết quả:** Workflow rõ + context đầy đủ + review chặt → chất lượng + tiến độ ổn định + scale với AI.

---

## 2. Ba trụ + bốn chữ

| Trụ | Thiếu thì |
|-----|-----------|
| Context đầy đủ trong Git | AI đoán, lệch spec |
| Ranh giới rõ (domain + contract) | Không parallel được |
| Quality gate (test + PR + DoD) | “Chạy local” nhưng không ship |

| Chữ | Nghĩa |
|-----|-------|
| **CHIA RÕ** | Domain/module → context nhỏ, ownership rõ |
| **CONTRACT RÕ** | API/event — không phụ thuộc ngầm |
| **TEST RÕ** | Test/AC = đích đến cho AI |
| **DONE RÕ** | Done = đủ chuẩn merge |

---

## 3. Context base (7 phần)

1. **Specs** — what/why/business rules  
2. **ADRs** — how/tech/convention  
3. **Contracts** — giao tiếp giữa phần  
4. **Tasks / plans** — Goal, AC, DoD, owner  
5. **`AGENTS.md`** — luật repo cho AI  
6. **Tests / AC** — hành vi mong đợi  
7. **Git + PR + DoD** — khi được merge  

**Một repo = một nguồn sự thật** — Git lưu cả ý tưởng, quyết định, kế hoạch, không chỉ code.

| Thành phần | Khi cập nhật |
|------------|--------------|
| Specs | Scope / nghiệp vụ đổi |
| ADRs | Stack, pattern, convention đổi |
| Contracts | API, schema, event đổi |
| Tasks & plans | Owner, AC, DoD, trạng thái |
| `AGENTS.md` | Rule bắt buộc mới |

---

## 4. Tám nguyên tắc

1. **Spec-driven** — không code trước khi what/why/how rõ  
2. **ADR là nền** — mọi quyết định kỹ thuật ghi lại; đổi = ADR mới  
3. **Task đủ lớn** — team quản feature; AI chia subtask  
4. **Contract-first** — parallel an toàn  
5. **AI đọc context trước code** — cả team duy trì context  
6. **Git có kỷ luật** — branch + PR, không push thẳng main  
7. **Review & CI** — merge chỉ khi DoD  
8. **Retro liên tục** — context sống, cải tiến bền vững  

---

## 5. Năm ADR nền (cho parallel + AI)

| ADR | Câu chốt |
|-----|----------|
| Test strategy | Test = behavioral contract |
| Domain split | Good domain split = good context split |
| API contract first | Scale by contract, not implicit understanding |
| Structure & convention | Without convention, AI multiplies chaos |
| Definition of Done | Done = meet merge standards, not “runs locally” |

> ADR tốt = Context đủ – Ranh giới rõ – Contract rõ – Test rõ → team + AI làm song song bền vững.

---

## 6. Quy trình macro (sprint)

```
Brainstorm → Specs → Architecture (ADR) → Planning → Parallel execution → Review & merge → Next sprint (retro) → lặp
```

| Bước | Nội dung chính |
|------|----------------|
| **Brainstorm** | Ý tưởng, nhu cầu, mục tiêu đo lường; brainstorm với AI |
| **Specs** | Domains, features, user roles, API contracts, business rules |
| **Architecture** | ADRs, tech stack, kiến trúc, rules, folder structure |
| **Planning** | Backlog, sprint, user stories, **task lớn**, ưu tiên |
| **Parallel execution** | Nhiều dev + AI; commit thường xuyên |
| **Review & merge** | PR, verify, resolve conflict; merge khi DoD |
| **Next sprint** | Retro, cải tiến spec/ADR/quy trình; sprint tiếp theo |

**Nền tảng xuyên suốt:** Git repo shared · Roles rõ · Tools (Git, CI, test, agents, MCP) · Rules (`AGENTS.md`, DoD).

**Thông điệp:** Mọi hoạt động dựa trên **Specs + ADRs + Contracts + Rules**. AI mạnh khi context rõ.

---

## 7. Quy trình micro (mỗi task lớn)

```
Pick task → AI+dev code → Local test → Commit & push → PR & review → Merge
```

| Bước | Chi tiết |
|------|----------|
| 1 **Pick task** | Chọn từ sprint; đọc Goal, AC, DoD, Owner; đọc specs, ADRs, contracts, rules; tạo branch |
| 2 **AI + dev code** | AI: context → plan → subtask → code/test/docs. Dev: giám sát, quyết định. Agent không thay người quyết scope/kiến trúc/merge |
| 3 **Local test** | Unit, integration, lint, build — **chỉ push sau khi pass** |
| 4 **Commit & push** | Commit convention; task → In Review |
| 5 **PR & review** | Linked task, tests, docs, contracts; human và/hoặc AI review |
| 6 **Merge** | Approve → CI → hỏi người dùng → merge vào `dev` → task Done |

**Bắt buộc sau task:**

1. Kiểm tra `dev` có commit mới hơn branch task không.
2. Nếu có, cập nhật `dev` từ remote rồi merge `dev` vào branch task.
3. Tự resolve conflict dựa trên spec, ADR, contract và thay đổi mới nhất trên `dev`; giữ lại hành vi đúng của cả hai phía khi không xung đột nghiệp vụ.
4. Chạy lại test, lint, typecheck, build sau resolve.
5. Báo rõ: branch task, SHA, kết quả verification, diff scope; sau đó hỏi người dùng có muốn merge vào `dev` không.
6. Chỉ merge branch task vào `dev` sau khi người dùng xác nhận rõ.
7. Xác nhận `dev` chứa task commit và working tree không còn conflict.

```bash
git fetch origin
git checkout <task-branch>
git merge dev
# resolve conflict nếu có, rồi chạy local verification
git checkout dev
git merge <task-branch>
```

Nếu conflict không thể resolve an toàn từ context hiện có, dừng merge và yêu cầu quyết định; không chọn ngẫu nhiên.

**Git (ví dụ):**

```bash
git checkout dev && git pull
git checkout -b feature/TASK-002-slug
# ... code + test local ...
git commit -m "TASK-002: mô tả ngắn"
git push origin feature/TASK-002-slug
# Mở PR feature/* → dev; chỉ merge sau khi người dùng xác nhận
```

**Best practices:** Pull latest trước task mới · Commit nhỏ, message rõ · PR bắt buộc · Chỉ merge khi DoD · Tag release khi ship.

```
main          ─────────────●──────────  (stable; chỉ merge khi người dùng yêu cầu)
                            ↑
dev           ───●────●────●──────────  (integration)
                  \  /
feature/*          ●
hotfix/*                 ●─────
```

## 7.1 Merge main + deploy: Release Completeness Gate

### Vấn đề cần chặn

Một yêu cầu sản phẩm có thể nằm ở nhiều commit hoặc nhiều branch: ví dụ một branch đổi UI chính, branch khác đổi Share UI, test hoặc prompt. Nếu agent chọn branch “mới nhất” theo tên, ngày commit, hoặc chỉ thấy một phần code rồi merge, `main` vẫn thiếu một phần Acceptance Criteria. Vercel vẫn deploy thành công, nhưng deploy sai phạm vi yêu cầu.

**Nguyên nhân gốc:** agent không đối chiếu Acceptance Criteria với toàn bộ commit/branch liên quan trước merge; coi “build xanh” hoặc “nhánh có code mới” là bằng chứng task đã đủ. Đây không phải lỗi Vercel hay Git tự đồng bộ.

### Quy tắc cứng

Khi người dùng nói **“merge main”**, **“deploy”**, **“cập nhật code mới nhất”** hoặc câu tương đương, agent phải coi đây là release request cho **toàn bộ scope đã được người dùng giao trong hội thoại/task hiện tại**. Release source bắt buộc là `dev`, không phải một feature branch. Không được tự chọn một branch duy nhất vì nó mới hơn hoặc có tên gần đúng.

1. `git fetch origin --prune` trước mọi kết luận.
2. Lập **release manifest**: từng AC/yêu cầu → file/component → commit/branch/PR thực hiện nó.
3. Tìm commit trên **toàn bộ refs local + remote**, không chỉ branch đang checkout:

   ```bash
   git log --all --oneline --decorate
   git log --all -S'<tín hiệu code hoặc UI>' -- <file-liên-quan>
   git branch -a --contains <commit>
   ```

4. Với từng commit trong manifest, xác minh nó đã nằm trong release target:

   ```bash
   git merge-base --is-ancestor <commit> origin/main
   ```

   Exit code `0` = đã có. Khác `0` = thiếu; phải merge/cherry-pick đúng branch/commit, hoặc báo blocker. Không được deploy rồi mới phát hiện thiếu.
5. Cập nhật `origin/dev` trước. Chỉ merge `dev`/PR đã approve vào `main`; không merge feature branch thẳng vào `main`. Nếu repo chưa có `dev`, dừng và hỏi người dùng có muốn tạo `dev` không; không tự dùng `main` làm fallback.
6. Nếu hai branch cùng sửa một requirement hoặc một file, resolve theo AC: giữ hành vi của cả hai nếu không mâu thuẫn. Không lấy “ours/theirs” theo cảm tính.
7. Chỉ merge `main` và deploy khi manifest không còn commit thiếu, working tree sạch, và tất cả gate pass.

### Verification bắt buộc

Trước push `main`:

- [ ] Từng AC có commit/file/test tương ứng trong release manifest.
- [ ] Mọi commit manifest là ancestor của local release `main`.
- [ ] Test, lint, typecheck, build pass trên **merge commit cuối cùng**.
- [ ] `git diff --check` pass.
- [ ] `git status --short` sạch; không có secret/config local bị commit.

Sau push `main`, trước khi báo deploy xong:

- [ ] `origin/main` đúng SHA release.
- [ ] Vercel deployment metadata dùng đúng SHA đó, target `production`, state `READY`.
- [ ] Production URL trả HTTP 200 / smoke test phù hợp.
- [ ] Build logs không có error.

### Hướng dẫn bắt buộc cho agent

1. Nhắc lại release scope và liệt kê branch/commit sẽ merge **trước khi** thao tác.
2. Nếu phát hiện branch/commit liên quan chưa có trong `dev`, nêu rõ tên và SHA; không đưa vào `main`. Hỏi người dùng xác nhận merge từng task branch vào `dev`, verify `dev`, rồi mới release `dev` khi người dùng yêu cầu.
3. Không nói “đã merge task” chỉ vì một branch được merge. Chỉ nói khi mọi AC trong manifest đã được kiểm tra trên SHA `main` cuối.
4. Không coi Vercel `READY` là xác nhận tính năng đủ; nó chỉ xác nhận build/deploy thành công.
5. Final report phải nêu: release SHA, các branch/commit đã gộp, verification pass, URL Production. Nếu thiếu bất kỳ AC nào, báo thiếu trước deploy; không tự bỏ qua.

---

## 8. Parallel execution

**Điều kiện parallel:** Domain split + contract + **file ownership không overlap**.

| Điều kiện | Nếu thiếu |
|-----------|-----------|
| Context đầy đủ trong repo | AI đoán, lệch spec |
| Task đủ lớn, AC/DoD rõ | Micro-manage hoặc AI loop vô hạn |
| Contract giữa domain | Không parallel |
| ADR + convention | Mỗi PR một style |
| Review + CI trước merge | Tech debt tích lũy |

**Ví dụ:** Dev A+AI → Auth · Dev B+AI → Course · Dev C+AI → Lesson — giao tiếp qua contract, không đụng cùng file.

---

## 9. Workspace (Git repo)

**Nguyên tắc:** Một repo — một nguồn sự thật. Team + AI cùng đọc, cùng hiểu, cùng cập nhật.

```
project/
├── specs/                 # product-vision, domains, user-roles, features, api-contracts
├── adrs/                  # quyết định kiến trúc
├── planning/              # backlog, sprints/
├── tasks/                 # task lớn: Goal, AC, DoD, owner
├── src/
├── docs/
├── AGENTS.md
└── README.md
```

| Thư mục | Vai trò |
|---------|---------|
| `specs/` | Spec nghiệp vụ |
| `adrs/` | Quyết định kỹ thuật |
| `planning/` | Backlog, sprint |
| `tasks/` | User story / task lớn |
| `src/` | Code |
| `docs/` | Runbook, how-to |
| `AGENTS.md` | Luật cho AI & team |

**Công cụ:** Git hosting · Task/sprint (Jira, Linear, Issues…) · Docs trong repo · MCP đồng bộ ticket/doc với Git.

---

## 10. Definition of Done (DoD)

Task chỉ **Done** khi:

- [ ] Code đúng spec
- [ ] Test pass (unit / integration / e2e theo ADR)
- [ ] Docs / contracts cập nhật (nếu có thay đổi)
- [ ] Tuân ADR & coding rules / `AGENTS.md`
- [ ] PR reviewed & merged
- [ ] Trạng thái task = Done

**Không merge nếu chưa đủ DoD.**

---

## 11. Vai trò team

| Role | Trách nhiệm |
|------|-------------|
| PM | Ưu tiên, sprint, scope |
| Architect | ADR, quyết định kỹ thuật, contract |
| Dev (+ AI) | Code, tích hợp |
| QA | Test, automation, gate |
| Ops | CI/CD, deploy, monitoring |

---

## 12. Khi AI sai

> **99%** do context chưa đủ hoặc lỗi thời — sửa context trước khi đổi model hay prompt.

1. Task có Goal + AC + DoD đúng không?  
2. Specs & ADRs còn đúng không?  
3. Contract khớp implementation không?  
4. `AGENTS.md` / rules có bị vi phạm không?  
5. Chỉ sau đó xem lại prompt/model.

---

## 13. Checklist nhanh

**Trước task mới:** Git freshness gate pass · Worktree sạch và riêng · `origin/dev`/dependency đã xác minh · Spec/task có Goal + AC · ADR liên quan · Contract nếu cross-domain · Ownership rõ · Đã đọc context base.

**Trước PR:** Test + build local pass · Docs/contracts cập nhật · PR checklist · Sync nhánh với remote · Resolve khác biệt với `dev` · Không secret trong diff.

**Sau mỗi task:** Task branch đã sync với `dev` · CI/gate pass · Báo branch/SHA/diff/verification và **hỏi người dùng có muốn merge vào `dev` không** · Không còn conflict hoặc commit bị bỏ sót. Không merge `dev`, `main` hoặc deploy nếu người dùng chưa yêu cầu.

**Cuối sprint:** Retro · Cập nhật spec, ADR, `AGENTS.md` · Backlog sprint sau.

---

## 14. Tóm tắt một trang

```
CÔNG THỨC:  Context đúng → AI hiểu đúng → Code đúng → Sản phẩm đúng

BA TRỤ:      Context Git · Ranh giới domain+contract · Quality gate

BỐN CHỮ:     CHIA RÕ · CONTRACT RÕ · TEST RÕ · DONE RÕ

CONTEXT (7): Specs · ADRs · Contracts · Tasks/plans · AGENTS.md · Tests · Git+PR+DoD

NGUYÊN TẮC:  Spec trước code · ADR nền · Task lớn · Contract-first
             · AI đọc context · Git kỷ luật · Review+CI · Retro

MACRO:       Brainstorm → Spec → ADR → Plan → Execute ∥ → Review → Sprint+ (retro)

MICRO:       Pick → Code (AI+human) → Test local → Push → PR → Merge

SONG SONG:   Domain split + contract + ownership không overlap

5 ADR NỀN:   Test · Domain split · Contract first · Convention · DoD

KHI AI SAI:  Sửa context trước — không đổi model đầu tiên
```

---

## 15. Quy tắc khi dùng nhiều Agent / CLI

- Mỗi Agent dùng **worktree + branch riêng**. Không sửa cùng thư mục với Agent khác.
- Trước khi sửa: chạy `git status`, `git diff`, `git log -1 --oneline`.
- Nếu thấy thay đổi không phải do mình tạo: **dừng**, báo người dùng, không ghi đè.
- Không chạy `git reset --hard`, `git checkout .`, `git restore .`, `git clean -fd` hoặc `git push --force` nếu chưa được người dùng cho phép.
- Commit checkpoint trước khi chuyển task hoặc giao code cho Agent khác.
- Không để hai Agent sửa cùng file cùng lúc.
- Trước merge: fetch remote, kiểm tra tất cả CLI terminal khác đang mở cùng các branch/worktree chúng đang dùng (`git worktree list`, `git branch -a`, `git status`), test và review diff. Không giả định chỉ branch hiện tại có thay đổi; branch đã hoàn thành phải được cập nhật lên commit mới nhất rồi lần lượt merge vào `dev`. Chỉ Agent tích hợp được merge vào `dev`.
- Không đọc, in, commit hoặc gửi API key. Secret phải nằm trong biến môi trường; API key đã lộ trong file này cần revoke/rotate ngay.
- Khi một Agent hoàn thành task: bắt buộc kiểm tra mọi branch/worktree của Agent khác trong các CLI terminal đang mở; fetch remote và cập nhật `dev` cùng các branch liên quan lên code mới nhất; merge các branch đã hoàn thành vào `dev`, resolve toàn bộ conflict trên code mới nhất, rồi chạy test/lint/build. Không merge branch còn đang làm dở; ghi nhận owner và tiếp tục cập nhật branch đó ở lần tích hợp sau. Không merge `main` hoặc deploy nếu người dùng chưa yêu cầu rõ ràng.
