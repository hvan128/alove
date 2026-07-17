# Historical OrderVoice MVP Release Manifest

> Bản phát hành này là lịch sử trước khi sản phẩm chuyển sang VéĐi. Manifest hiện hành sẽ nằm ở `vedi-release-manifest.md` sau khi TASK-002 được deploy.

**Release source:** `dev` at `da3be58` (`fix: rely on Vercel project root setting`), after merge commit `a879352` (`merge: release OrderVoice MVP`). The deployed application was built from this local source state.

**Scope commits:** `974588e` (`feat: complete OrderVoice MVP`), `dfb2a29` (initial release manifest), `d5dbeb9` (release type-safety fix), and `da3be58` (Vercel root-directory configuration correction).

**Release target:** `dev`. The local repository has no Git remote or `main` branch, so this release is integrated and deployed from verified local `dev`; no claim is made that a nonexistent `origin/main` received the code.

## Acceptance-criteria mapping

| Acceptance criterion | Implementation | Automated evidence |
|---|---|---|
| Browser, phone and Zalo replay are visible and truthful | `apps/web/src/components/console/source-switcher.tsx`, `conversation-panel.tsx`, `docs/integration-feasibility.md` | `apps/web/e2e/console.spec.ts` source/demo checks |
| Browser/replay normalize PCM16 16 kHz; Twilio μ-law conversion works | `apps/web/public/worklets/pcm16-capture.js`, `apps/web/src/hooks/{use-normalized-audio-capture,use-zalo-replay}.ts`, `apps/api/src/media.ts`, `packages/{core,providers}/src/{audio,twilio}.ts` | `apps/api/test/media.test.ts`, `packages/providers/test/twilio.test.ts`, Chromium replay E2E |
| VALSEA-first realtime protocol; OpenAI opt-in dev fallback | `packages/providers/src/{valsea,openai}.ts`, `apps/api/src/{server,live-valsea}.ts`, `.env.example` | provider fixture tests; credentialed VALSEA smoke command is documented |
| Partial text is ephemeral; final is evidence-backed and idempotent | `packages/contracts/src/index.ts`, `packages/core/src/order.ts`, `apps/api/src/{server,repository}.ts`, `db/schema.ts` | core final/partial tests; API duplicate-final test |
| Ambiguity blocks approval and an operator can correct it | `packages/core/src/order.ts`, `apps/api/src/{server,repository}.ts`, `apps/web/src/components/console/order-panel.tsx` | core correction test, API correction test, Chromium ambiguity/correction E2E |
| Human approval gates idempotent ERP export | `packages/core/src/order.ts`, `apps/api/src/repository.ts`, `apps/web/src/components/console/{order-panel,console-workspace}.tsx` | core/API idempotency tests; console E2E |
| Human-clicked agent speech is demonstrable | `apps/web/src/components/console/{reply-panel,console-workspace}.tsx`, `packages/providers/src/openai.ts` | console unit test validates explicit `speechSynthesis` call; E2E exposes control |
| Apple-like tokens/shared UI and design route | `apps/web/src/app/globals.css`, `apps/web/src/components/ui/*`, `apps/web/src/app/design-system/page.tsx` | UI tests; design-system E2E; browser visual check |
| Neon persistence boundary and schema | `db/{schema,index}.ts`, `db/migrations/0000_ordervoice.sql`, `apps/api/src/repository.ts` | DB/schema test; repository-mode test |
| Third-party feasibility and live-test limitations are explicit | `docs/integration-feasibility.md`, `README.md`, `docs/demo-script.md` | documented anonymous connectivity outcomes and credentialed follow-up commands |

## Required verification evidence

Re-run on the release source before closing the release:

```text
pnpm lint                              PASS
pnpm -r --if-present typecheck         PASS
pnpm test                              PASS — 28 tests across contracts/core/providers/api/web/db
pnpm test:e2e                          PASS — 4 Chromium flows
pnpm build                             PASS — Next production build + API type build
git diff --check                       PASS
credential-pattern scan                PASS — no key in tracked diff
```

The browser verification loaded `/console`, found meaningful content, no Next error overlay and no captured console errors. It exercised the ambiguity correction form to an enabled approval state, and the deployed production console's normal demo through approval and ERP-draft export.

## Production deployment verification

| Item | Evidence |
|---|---|
| Vercel project | `sireals-projects/ordervoice-vn` |
| Project routing | External Vercel project setting: root directory `apps/web`, framework `Next.js` |
| Target | Production |
| Deployment | `dpl_8DRQSeTwVbGX7Q3yXaaYRW4eRe57` — Ready |
| Public alias | `https://ordervoice-vn.vercel.app` |
| Health smoke | `vercel curl /api/health --deployment https://ordervoice-vn.vercel.app` returned `{"status":"ok"}` |
| UI smoke | Chromium opened `/console`; browser, Zalo replay, and phone source modes rendered; the Web demo completed approve/export |

The deployment used Vercel's prebuilt CLI upload from the verified local checkout. Because this repository has no Git remote, the Vercel deployment has no remote-commit metadata; `da3be58` above is the locally verified source revision for the deployed application.

## Provider and deployment caveats

- VALSEA, Twilio and Neon require credentials that are not present in this environment; the exact live-test commands and observed anonymous connectivity checks are in `docs/integration-feasibility.md`.
- Zalo is a consented local audio/video replay path until a permitted raw-media entitlement exists.
- Vercel receives the public Next.js demo. The Fastify WebSocket gateway needs a durable Node WebSocket host before live VALSEA/Twilio traffic is represented as active.
- The OpenAI credential supplied in chat is not used, stored or committed; its owner must rotate it.
