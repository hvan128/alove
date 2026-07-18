---
title: Phase 06 production rollout evidence
status: verified-with-open-manual-evidence
recorded_at: 2026-07-18T20:02:52Z
---

# Phase 06 production rollout evidence

## Summary

Alove main `841e269` was rolled out to the canonical production services. Vercel
deployment `dpl_B2KnVagS7EMdcyJccEw47sn4179W` reached `READY` and is aliased to
<https://vedi-one.vercel.app/>. The checks below recorded no credential, phone
number or customer PII.

## Production surfaces

- `/`, `/ban-to-chuc`, `/console`, `/dashboard`, `/evidence`, `/design-system` and
  `/verify?code=TEST` returned HTTP 200.
- `/api/health` reported `ready` for database, LiveKit, agent webhook and booking
  verification.
- This supersedes the deployment state, but not the observation, in
  `phase-06-public-surface-check.md`: its earlier `/verify` 404 remains historical
  evidence for the pre-rollout deployment.

## Voice runtime smoke

- LiveKit agent `CA_3Fd2uag5j83b`, version `cfNKsxA8poZQ`, was `Running` in
  `ap-south`.
- Browser session `2026-07-18T19:47:23Z–19:49:57Z`: the agent joined and a
  Vietnamese greeting rendered.
- Runtime route: `engine=cascade`, `stt=valsea`, `llm=direct`,
  `tts=google-chirp3:Kore`.
- Observed agent metrics: TTFT 2372 ms, TTFB 176 ms; no provider error was
  observed.
- The browser used a fake microphone. This run does not prove customer STT,
  semantic annotation or full-turn latency UI.

## Controlled booking smoke

A synthetic production transaction completed search (HTTP 200), hold, confirm,
correct-phone verification (HTTP 200 with a PII-minimal snapshot), wrong-phone
verification (HTTP 404), cancel and post-cancel verification (HTTP 404). Webhook
state was explicitly `disabled`, because no external receiver is configured.

A separate hold-before-confirm cancel released one seat. Final database checks:

- 8 migrations; 18 bookings.
- 0 required bookings with a null verification snapshot.
- 17 legacy exempt bookings with no archived confirmed snapshot.
- Snapshot trigger and integrity constraint installed.
- 0 `release-*` holds and 0 webhook outbox rows.

## Release gates

| Gate | Result |
|---|---|
| Python pytest | PASS — 55 tests + 24 subtests |
| README unittest command | PASS — 55 tests |
| Vitest | PASS — 36 files, 203 tests |
| Typecheck, lint, Drizzle check | PASS |
| Production build | PASS — 19 pages |
| Playwright Chromium | PASS — 12/12 |
| `git diff --check` | PASS |

## Recommendations

Keep the current release in service while collecting the five manual/real-world
artifacts below. Do not relabel fake-microphone or synthetic evidence as customer
speech, accent, PSTN or external-delivery proof.

## Unresolved evidence

- No physical phone-camera QR scan was recorded.
- No external webhook receiver/delivery was configured.
- No PSTN call was made.
- No consented regional-accent fixture exists.
- The production smoke contained no customer speech, so it does not prove
  production STT/semantic annotation or full-turn latency UI.
