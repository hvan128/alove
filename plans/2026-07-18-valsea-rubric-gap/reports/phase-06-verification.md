# Phase 06 release verification

- Working-tree gate recorded at: `2026-07-18T18:53:28Z`
- Final production evidence recorded at: `2026-07-18T20:02:52Z`
- Release: main `841e269`; production details in
  `phase-06-production-rollout.md`.

| Gate | Result |
|---|---|
| `agent/.venv/bin/python -m pytest agent/tests -q` | PASS — 55 tests, 24 subtests |
| README command `uv run python -m unittest discover -s tests` | PASS — 55 tests |
| `pnpm test -- --run` | PASS — 36 files, 203 tests |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm --filter @alove/web exec drizzle-kit check` | PASS |
| `pnpm build` | PASS — 19 static/dynamic pages generated |
| `pnpm exec playwright test` | PASS — 12 Chromium E2E tests |
| `git diff --check` | PASS |

Focused automated coverage includes provider selection and VALSEA realtime tests
(`agent/tests/test_provider_config.py`, `agent/tests/test_valsea_stt.py`), advisory
annotation (`agent/tests/test_valsea_api.py`), turn latency
(`agent/tests/test_latency_metrics.py`), QR/JSON output
(`apps/web/src/components/bus-call/ticket-result.test.tsx`), verification API/E2E,
webhook/outbox, migration contract and realtime browser reducers.

The rubric HTML was also opened in headless Chromium at a 390×844 viewport: seven
tables and 36 rows rendered, the page had no uncaught error or body-level horizontal
overflow, and each table remained inside its horizontal scroll container.

The final production rollout additionally verified all canonical public pages,
four health dependencies, a LiveKit agent join/greeting and controlled
search/hold/confirm/verify/cancel behavior. It deliberately does not close the
physical QR scan, external webhook receiver, PSTN, regional-accent or
customer-speech evidence gaps.
