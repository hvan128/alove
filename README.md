# OrderVoice

Vietnamese voice-to-order copilot for sales operators. Three input paths—browser microphone, direct telephone media and Zalo-originated audio/video replay—converge on a common audio/transcript contract. The product produces an evidence-backed order draft, then deliberately stops for human review before creating an idempotent ERPNext draft.

## What is implemented

- VALSEA-first realtime ASR adapter for PCM16/16 kHz/mono final/partial events.
- Browser `AudioWorklet` path: mic → linear 16 kHz resample → PCM16 20 ms frames → optional WebSocket gateway.
- Twilio Media Streams adapter: base64 mu-law/8 kHz → PCM16/16 kHz with caller/agent tracks.
- Truthful Zalo flow: operator-selected audio/video replay, not a claim of undocumented live Zalo audio access.
- Evidence-backed Vietnamese/code-switching demo order; partial text never mutates the draft.
- Deterministic catalog resolver/rules; ambiguity blocks approval.
- Explicit human approval and idempotent ERP draft export boundary.
- Human-clicked, labelled device-voice demo; VALSEA/OpenAI TTS server adapters are available when configured.
- Apple-like operational UI, shared tokens/primitives and `/design-system` catalogue.
- Neon/Drizzle schema and a lazy Neon repository; no-key mode is visibly labelled local demo state.

## Architecture

```text
apps/web       Next.js 16 UI, public Vercel demo, browser capture
apps/api       Fastify media/WebSocket gateway, Twilio hooks, orchestration
packages/*     contracts, pure audio/order core, provider adapters
db             Neon/Drizzle schema and migration
```

The Vercel deployment hosts the web demo. A durable Node host is required for the Fastify media gateway in a real live-call deployment; set `NEXT_PUBLIC_GATEWAY_URL` only after that host is HTTPS/WSS reachable.

## Local quick start

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

Open `http://localhost:3000/console`, select a source and click **Chạy demo đơn hàng**. The flow creates a final transcript, draft, evidence, human approval state, idempotent export reference and a human-clicked audible reply.

## Environment

Copy `.env.example` to a local ignored environment file and add values only through your secret manager/environment. Never place keys in source or `NEXT_PUBLIC_*` variables.

| Variable | Purpose |
|---|---|
| `VALSEA_API_KEY` | Required server-side for a real VALSEA ASR/TTS session |
| `OPENAI_API_KEY` | Explicit development fallback only; not VALSEA challenge compliance |
| `DATABASE_URL` | Neon Postgres connection string |
| `TWILIO_*` | Twilio call/webhook provisioning |
| `ERPNEXT_*` | ERPNext draft adapter credentials |
| `PUBLIC_GATEWAY_URL` | Gateway's public WSS base for Twilio/TwiML |
| `NEXT_PUBLIC_GATEWAY_URL` | Browser-safe gateway URL only—never a credential |

The API key pasted in the original task is intentionally not used or stored. Its owner should rotate it.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

`test:e2e` launches a local Next server and verifies console approval/export, design-system rendering and `/api/health`.

## Live VALSEA smoke after sandbox provisioning

Use a consented signed PCM16 little-endian, mono, 16 kHz recording. The command does not fall back to OpenAI.

```bash
VALSEA_API_KEY=... VALSEA_PCM16_PATH=/absolute/path/to/vi-order.pcm \
  pnpm --filter @ordervoice/api test:live:valsea
```

The result should contain a `final` transcript JSON object. Record the outcome/date in [`docs/integration-feasibility.md`](docs/integration-feasibility.md).

## Deployment

1. Deploy the Next.js web project to Vercel from the monorepo root; keep workspace packages available during install/build.
2. Provision Neon through Vercel Marketplace or an existing Neon project; set `DATABASE_URL` server-side.
3. Deploy `apps/api` to a Node host that supports durable WebSockets, then set `PUBLIC_GATEWAY_URL` and `NEXT_PUBLIC_GATEWAY_URL`.
4. Provision VALSEA and Twilio only in encrypted provider/Vercel environments.
5. Verify `/api/health`, `/console`, the labelled demo, and deployment logs.

The exact external-test constraints, connectivity checks and Vietnam telephony assessment are in [`docs/integration-feasibility.md`](docs/integration-feasibility.md).

## Further documentation

- [Product/architecture design](docs/superpowers/specs/2026-07-18-ordervoice-design.md)
- [Implementation plan](docs/superpowers/plans/2026-07-18-ordervoice-mvp.md)
- [API contracts](specs/api-contracts.md)
- [Design system](docs/design-system.md)
- [Demo script](docs/demo-script.md)
- [Pilot roadmap](docs/pilot-roadmap.md)
