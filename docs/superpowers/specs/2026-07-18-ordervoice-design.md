# OrderVoice MVP Design

**Status:** Approved by delegated product authority in the request dated 2026-07-18.

## Problem and outcome

Vietnamese sales operators receive orders through three inconsistent voice channels: a live browser call, an inbound phone call, and a Zalo audio/video attachment. OrderVoice turns those conversations into an evidence-backed draft sales order. It deliberately stops before irreversible business action: a human reviews every draft, optionally speaks an approved reply, and explicitly exports an idempotent ERP draft.

The demonstrable outcome is a Vietnamese, code-switching order conversation whose final transcript produces a structured draft with customer, quantities, SKU resolution, confidence, evidence and exceptions. The operator can correct it, approve it, hear the reply, and export a draft exactly once.

## Options considered

### 1. Next.js-only application on Vercel

One Next.js deployment could render the UI and expose HTTP routes. It is the shortest path for a static scripted demo, but long-lived, bidirectional media WebSockets require provider-specific hosting behaviour and create a fragile production story. It also tangles media orchestration, domain rules and UI deploys.

### 2. Vercel web application plus a Fastify media gateway — selected

Next.js 16 on Vercel owns product UI, route-level HTTP APIs and the public demo shell. A small Node/Fastify service owns WebSocket media ingress, PSTN stream adaptation and upstream VALSEA sessions. Shared contracts and pure domain packages prevent transport code from deciding customer, SKU, price or export state. This supports the requested public UI while keeping realtime audio portable to a process host that supports durable WebSockets.

### 3. Managed voice-agent vendor as the primary runtime

This could reduce integration work, but would conceal audio handling, make VALSEA usage hard to prove and often lacks reliable Vietnam telephony. It is rejected for the challenge MVP. Vendor adapters remain replaceable.

## Architecture

```text
Browser microphone ─┐
Twilio Media Stream ├─> Fastify media gateway ─> VALSEA realtime ASR
Zalo replay file ───┘          │                         │ final segments only
                               │                         v
                               └────────────> domain reducer / resolver / rules
                                                        │ evidence-backed patch
Next.js web <──────────────────────────────────────────┤
  Apple-like operator console                           │
  human approval / correction / speak                   v
                                              Neon Postgres via Drizzle
                                                        │ explicit only
                                                        v
                                                   ERPNext draft adapter
```

The browser captures 16 kHz mono PCM16 frames through an `AudioWorklet` and sends binary frames to the gateway. Twilio's 8 kHz mu-law payload is decoded, resampled and assigned a caller or agent track before it reaches the same normalized frame contract. Zalo has no assumed raw live-call API: an operator-selected local audio/video file is replayed in time through the same browser capture path.

`NormalizedAudioFrame` is the cross-channel boundary:

```ts
type NormalizedAudioFrame = {
  sessionId: string
  source: 'browser' | 'telephony' | 'replay'
  trackId: string
  speaker: 'caller' | 'agent' | 'unknown'
  sequence: number
  capturedAtMs: number
  sampleRate: 16000
  channels: 1
  encoding: 'pcm_s16le'
  pcm: Int16Array
  endOfUtterance?: boolean
}
```

Only `transcript.final` events can update persisted transcript segments or generate order patches. Partial ASR output remains explicitly ephemeral UI. The LLM may propose a validated `OrderPatch`; deterministic resolver/rules code selects catalog candidates and rejects any price, stock, customer or ERP mutation not grounded in evidence. A human must approve an order before a draft export; agent speech cannot constitute approval.

## Product routes

| Route | Purpose |
|---|---|
| `/` | concise product and demo entry surface |
| `/console` | live three-column operator workspace |
| `/console?mode=browser` | browser microphone call flow |
| `/console?mode=zalo-replay` | synchronized Zalo audio/video replay flow |
| `/console?mode=phone` | Twilio/phone readiness and webhook handoff flow |
| `/design-system` | public design-token and shared-component catalogue |
| `/api/health` | deploy smoke check |

## Operator workspace

The console uses a responsive three-column layout: conversation and source controls; draft order and evidence; ERP context and approved reply. Below tablet width the active panel becomes a segmented view, retaining a persistent call status and approval bar. The UI is Vietnamese-first and preserves accents verbatim.

The visual language is a functional, Apple-like adaptation rather than a copy of Apple marketing: cold white/parchment surfaces, near-black media well, a single action blue for interactive controls, system/Geist typography, hairline separators, calm 12–18px cards and 44px minimum touch targets. Status colours are semantic exceptions to the blue accent. No decorative gradients and no card shadows are used.

## Voice and AI policy

- **VALSEA ASR is the final challenge path.** The realtime adapter sends PCM16/16 kHz/mono to `wss://api.valsea.ai/v1/realtime` and persists only final output.
- **OpenAI is an opt-in development fallback only.** It is never presented as satisfying the VALSEA requirement. Credentials are server-side environment variables only.
- **TTS is human-clicked.** When VALSEA TTS or OpenAI TTS is configured, the gateway produces audio after the operator chooses “Nói phản hồi”. In the no-key public demo, Web Speech API supplies an explicitly labelled device-voice preview so the demo still speaks without pretending to be production TTS.
- **All generated speech is labelled AI-generated** and the operator can stop it.
- **No secret belongs in source, logs, browser bundles or commits.** The supplied key is treated as compromised and must be rotated by its owner.

## Data and integrations

Neon Postgres, accessed with Drizzle and a lazy client, is the source of truth for conversations, final transcript segments, evidence, order drafts, approval state, replies and idempotent exports. Seed data supplies five Vietnamese customers and a compact product catalogue that includes Vietnamese/English aliases and SKU-like codes.

Twilio is the first PSTN adapter because Media Streams documents the raw audio transport required for the normalized audio boundary. Stringee is documented as the Vietnam-oriented commercial alternative, pending confirmation of raw media access and account provisioning. Zalo is implemented as file replay because a public raw live-audio integration cannot be assumed. `docs/integration-feasibility.md` records exactly what was tested and what needs credentials or commercial enablement.

## Failure handling

- Missing credentials select the labelled local demo provider; production configuration refuses to claim a live provider.
- WebSocket, ASR and transport failures become operator-visible source states and do not fabricate final transcript text.
- Ambiguous SKU/customer, invalid quantities, missing unit and low-confidence extraction are exceptions requiring human correction.
- Export failure is retryable with the same idempotency key; duplicate export returns the original external draft reference.
- Browser microphone denial offers Zalo replay/demo mode without changing transcript provenance.

## Acceptance criteria

1. The web app presents browser, phone and Zalo replay modes in one console and starts a labelled deterministic demo without credentials.
2. A final Vietnamese/code-switching transcript creates an evidence-backed order draft; partial transcript text does not mutate it.
3. The draft shows a resolvable SKU, quantity, unit, customer, confidence and exceptions; an ambiguous alias is held for review.
4. User correction and explicit approval are required before ERP export; repeat export is idempotent.
5. “Nói phản hồi” is gated by a human click and produces audible speech in the demo.
6. The VALSEA realtime adapter, Twilio media adapter, OpenAI fallback adapter and Zalo replay boundary are implemented behind contracts; third-party test limitations are documented honestly.
7. Design tokens and shared components are visible at `/design-system`, and the console remains usable on mobile.
8. Unit, integration, browser smoke and production build checks cover the above behaviour.

## Non-goals for this MVP

- Automatic ERP submission, payment capture or inventory reservation.
- Treating a translated transcript as the catalog/order source.
- A claim that PSTN or Zalo live calls were tested without provisioned accounts/permissions.
- Authentication, multi-tenant role management or recording retention policy beyond the demo’s explicit local data model.
