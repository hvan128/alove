# OrderVoice MVP Release Manifest

**Release source:** `dev` at `d5dbeb9` (`fix: preserve final transcript identity typing`), after merge commit `a879352` (`merge: release OrderVoice MVP`).

**Scope commits:** `974588e` (`feat: complete OrderVoice MVP`), `dfb2a29` (release manifest), and `d5dbeb9` (release type-safety fix).

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

Performed on the release source before deployment:

```text
pnpm lint                              PASS
pnpm -r --if-present typecheck         PASS
pnpm test                              PASS — 28 tests across contracts/core/providers/api/web/db
pnpm test:e2e                          PASS — 4 Chromium flows
pnpm build                             PASS — Next production build + API type build
git diff --check                       PASS
credential-pattern scan                PASS — no key in tracked diff
```

The browser verification loaded `/console`, found meaningful content, no Next error overlay and no captured console errors. It also exercised the ambiguity correction form to an enabled approval state.

## Provider and deployment caveats

- VALSEA, Twilio and Neon require credentials that are not present in this environment; the exact live-test commands and observed anonymous connectivity checks are in `docs/integration-feasibility.md`.
- Zalo is a consented local audio/video replay path until a permitted raw-media entitlement exists.
- Vercel receives the public Next.js demo. The Fastify WebSocket gateway needs a durable Node WebSocket host before live VALSEA/Twilio traffic is represented as active.
- The OpenAI credential supplied in chat is not used, stored or committed; its owner must rotate it.
