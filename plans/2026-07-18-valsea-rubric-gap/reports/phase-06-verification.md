# Phase 06 working-tree verification

- Recorded at: `2026-07-18T18:53:28Z`
- Scope: current uncommitted working tree; this is not deployment evidence.

| Gate | Result |
|---|---|
| `agent/.venv/bin/python -m pytest agent/tests -q` | PASS — 55 tests, 24 subtests |
| README command `uv run python -m unittest discover -s tests` | PASS — 55 tests |
| `pnpm test -- --run` | PASS — 33 files, 150 tests |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm --filter @alove/web exec drizzle-kit check` | PASS |
| `pnpm build` | PASS — 18 static/dynamic routes generated |
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
