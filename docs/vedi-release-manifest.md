# VéĐi release manifest

**Release candidate source:** `feature/TASK-002-bus-ticket-agent@66c0b51`  
**Verified:** 2026-07-18, Asia/Ho_Chi_Minh  
**Production:** Pending integration and Vercel deploy

## Scope commits

| Commit | Nội dung |
|---|---|
| `7316168` | Bus call, trip, message và booking contracts |
| `b49c69c` | Deterministic booking agent và confirmation rules |
| `489a619` | Two-sided customer/care workspace |
| `4bb2874` | Optional browser STT và device TTS controls |
| `c858290` | VéĐi landing, design system, architecture và LiveKit docs |
| `69bfa12` | Neon booking/audit schema và migration |
| `66c0b51` | Auto/Human E2E, 44px targets và hydration-safe speech detection |

## Acceptance mapping

| Tiêu chí | Source | Evidence |
|---|---|---|
| Hai phía khách và chăm sóc | `components/bus-call/{customer-call-card,care-desk-card}.tsx` | Console component test + Chromium surface E2E |
| Human không auto reply | `bus-call-workspace.tsx` mode boundary | Unit test và Human Chromium flow có `message-agent = 0` |
| Agent tự trả lời và nói | booking core + `device-speech.ts` | Unit speech spy + Auto Chromium flow |
| Booking hai ghế hoàn chỉnh | `packages/core/src/bus-booking.ts` | Core tests + E2E mã `VD-240718-xxxx`, ghế `A05, A06` |
| Confirm gate/idempotency | `canConfirmBooking`, `confirmBooking` | Core duplicate-confirm test + disabled UI state |
| Browser voice fallback | `use-speech-recognition.ts` | Unsupported/final utterance tests + hydration regression |
| Apple-like shared design | CSS tokens, shared UI, `/design-system` | Design E2E, desktop/mobile/dark browser checks |
| Neon boundary | `db/schema.ts`, migration `0001` | DB schema test + typecheck |
| Project-4/LiveKit review | `docs/livekit-bus-pilot.md` | Credential and worker prerequisites documented |
| Third-party truthfulness | `docs/integration-feasibility.md` | No unsupported VALSEA/LiveKit/PSTN/Zalo live claim |

## Local quality evidence

```text
pnpm lint                              PASS
pnpm -r --if-present typecheck         PASS, 6 workspaces
pnpm test                              PASS, 43 tests
pnpm test:e2e                          PASS, 4 Chromium flows
pnpm build                             PASS, Next static routes + API type build
git diff --check                       PASS
tracked credential-pattern scan        PASS, no filename match
```

## Browser evidence

- Desktop `/console`: meaningful content, no framework error overlay, no page errors.
- Native Web Speech capability: no React hydration recoverable error after regression fix.
- Auto flow: confirmed `VD-240718-3677`, two seats `A05, A06`.
- Human flow: staff reply visible, zero Agent messages, manual confirmation succeeds.
- Mobile 390 × 844: customer/care sections stack; no horizontal overflow.
- Dark preference: `color-scheme: dark`, semantic canvas/surface tokens resolve correctly.

## External caveats

- LiveKit is a documented pilot seam, not active in the zero-key public demo. A LiveKit project, token secrets and long-running Agent worker are absent.
- VALSEA remains the required pilot provider but no sandbox key is present, so fixture protocol tests are the highest verified level.
- Twilio/Stringee real-call tests need account/number/media credentials. Zalo remains consented replay until media entitlement is confirmed.
- Neon tables and migration are ready; live persistence is not claimed without `DATABASE_URL`.
- The credential exposed in chat was never stored or deployed and should be revoked/rotated by its owner.

## Production evidence

To be filled only after local `dev` integration, Vercel Ready state and production browser smoke.
