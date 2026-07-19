# Deployment

## Platform

The Next.js web app is deployed to Vercel from the repository root. The Vercel
project's Root Directory is `apps/web`, so the CLI must not be started from
inside that directory.

Production: <https://vedi-one.vercel.app/>

This is the only supported web deployment. Legacy demo deployments are not part
of the current system.

## Required services

- Neon database with all migrations from `apps/web/drizzle` applied.
- LiveKit Cloud project.
- LiveKit Agents Cloud worker registered as agent `alove`;
  `agent/livekit.production.toml` is the generated non-secret deployment
  identity (`agent/livekit.toml` is only a placeholder), and `lk agent
  versions/status/rollback --config livekit.production.toml` are the canonical
  rollout and recovery controls. Cascade mặc định
  `STT_PROVIDER=valsea`, cần `VALSEA_API_KEY`; `VALSEA_WS_URL`/`VALSEA_MODEL` chỉ
  là override. Provider không được hỗ trợ hoặc credential active bị thiếu phải
  làm worker fail startup, không âm thầm đổi engine.
- Vercel variables: `DATABASE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME`, `AGENT_WEBHOOK_SECRET` and
  `BOOKING_VERIFICATION_SECRET`, plus a separate `CRON_SECRET` of at least 32
  random bytes for the static recovery job; add `DASHBOARD_ACCESS_KEY` when the
  dashboard is enabled.
- Optional error tracking: set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to the
  same project DSN. Leaving both blank is a supported state — every capture
  becomes a no-op — but production without them has no way to see a failure that
  the product has already absorbed. Add `SENTRY_ORG`, `SENTRY_PROJECT` and
  `SENTRY_AUTH_TOKEN` as build-time variables to get readable stack traces;
  without the token the build still succeeds and traces stay minified.
- Optional booking webhook: set `BOOKING_WEBHOOK_URL`,
  `BOOKING_WEBHOOK_SECRET` and `BOOKING_WEBHOOK_ALLOWED_HOSTS` together. Leaving
  those three blank is the explicit disabled state (the independently
  provisioned `CRON_SECRET` does not enable delivery). If any delivery variable
  is set, all three and `CRON_SECRET` must be valid or confirmation reports
  `misconfigured` and sends nothing. Vercel sends `CRON_SECRET` as the bearer
  credential to the scheduled recovery endpoint.

There is no `NEXT_PUBLIC_LIVEKIT_URL` feature switch. Missing production
dependencies must fail readiness instead of enabling a browser demo.

Token and redispatch limiters are per Vercel instance, so production must also
enable a shared edge/WAF limit for those endpoints. Public booking verification
uses an atomic Neon bucket shared across instances, keyed by HMAC digests rather
than raw IP/code/phone; keep an edge/WAF limit as the first layer as well.

## Release order

1. Back up Neon and apply all migrations, including `0004_workflow_output.sql`,
   `0005_durable_workflow_output.sql`, `0006_legacy-verification-exemptions.sql`
   and `0007_verification-snapshot-integrity.sql`. Migration `0005` installs a
   compatibility trigger so the previous web version still captures an
   immutable snapshot when it confirms a booking. Migration `0006` marks only
   historical rows with no trustworthy archived confirmed snapshot as
   legacy-unverifiable; `0007` enforces a snapshot for every required/new row.
2. Check that no required booking lacks its immutable snapshot:

   ```sql
   SELECT id, code
   FROM bookings
   WHERE verification_snapshot_required
     AND verification_snapshot IS NULL;
   ```

   Do not promote while this returns rows. Restore those rows only from an
   archived confirmed `booking_snapshots.snapshot` (matching code, phone, seats
   and total fare); do not reconstruct old tickets from current trip/route data.
   Separately inventory `verification_snapshot_required = false`; those legacy
   tickets intentionally return the same not-found response as an unknown code
   until a trustworthy archived snapshot is restored.
3. Deploy the web/API release to a preview and verify `/api/health` readiness,
   `/evidence` and ticket JSON download. Confirm one test booking and inspect its
   webhook result: `disabled` when delivery variables are absent;
   `pending`/`delivered`/`failed` when enabled. A `misconfigured` result is a
   release blocker even though the authoritative booking remains successful.
4. Build and roll out the Python agent using the same event/booking contract.
   For the first rollout, run `lk agent create --config livekit.production.toml
   --project <project> --region ap-south --secrets-file
   /private/tmp/<owner-only-file> .` inside `agent`; later rollouts use
   `lk agent deploy --config livekit.production.toml --secrets-file
   /private/tmp/<owner-only-file> .`. The production secret file stays outside
   the Docker context and omits Cloud-injected LiveKit credentials. Record the
   deployed version from `lk agent versions --config livekit.production.toml .`
   before promoting the web release.
5. Promote the web release to production, then repeat the required-row check. The
   compatibility trigger covers confirmations made by the previous release
   during the preview window.
6. In a later contract migration, after the new release is fully promoted and
   all legacy exemptions have been restored from trustworthy archives, remove
   the exemption flag, set `verification_snapshot` to `NOT NULL`, and remove
   `bookings_fill_verification_snapshot_before_insert` plus its function. Until
   then the conditional database check in `0007` is the integrity boundary.
7. Run one web call through search, hold, confirm and ticket display; then check
   the call transcript and booking snapshot in `/dashboard`.
8. Scan the ticket QR on a phone, confirm `/verify?code=…` shows no booking data
   before phone entry, then verify once with the matching phone and once with a
   wrong phone. Record the deployment/time in the rubric checklist; never record
   the phone value.
9. In one staging/live call, record a successful `semantic.annotation` and a
   complete `latency.turn` rendered on `/console`. Missing annotation must remain
   non-blocking; the latency summary must be the slowest stage, not a stage sum.

The webhook payload contains passenger name and phone because the configured
operator endpoint needs them to execute the booking. HMAC authenticates the
payload but does not encrypt it: use HTTPS, keep receiver retention minimal, and
never log payload/signature/URL query. Delivery is enqueued atomically with
confirmation, deduplicated by event ID, and limited to three persisted attempts.
Confirmation makes the first delivery attempts immediately. On the current
Vercel Hobby plan, `apps/web/vercel.json` invokes the authenticated recovery
drainer once per day at `18:17` UTC (Vercel may execute anywhere within that
hour); terminal payload/4xx/destination failures are never selected for retry.
Use Vercel Pro or an external authenticated scheduler when sub-day recovery is
an operator requirement; Hobby rejects cron expressions that run more than once
per day.

## Deploy

```bash
pnpm deploy:web
```

`apps/web`'s `vercel-build` script runs `drizzle-kit migrate` before `next
build`, so every production build applies whatever pending migrations exist
in `apps/web/drizzle` using Vercel's own decrypted `DATABASE_URL` — no local
copy of the connection string is needed to ship a simple additive migration.
This does not replace the careful manual sequencing above for a migration
that needs a compatibility trigger or a data-integrity check before
promotion (like `0005`–`0007`): write that safety into the migration SQL
itself and follow the required-row check before promoting, same as before.
`drizzle-kit migrate` only re-applies what is not yet recorded, so re-running
a build is always safe.

Production secrets are managed in Vercel. Expected variable names are listed in
the repository README; secret values must never be committed.

## Verify

```bash
curl -I https://vedi-one.vercel.app/ban-to-chuc
curl -I https://vedi-one.vercel.app/console
curl -I https://vedi-one.vercel.app/checklist
curl -i https://vedi-one.vercel.app/api/health
```

The health endpoint should return HTTP 200 only when the required migrations
(`verification_snapshot`, `public_rate_limits`, `booking_webhook_outbox`) are
present, `BOOKING_VERIFICATION_SECRET` and the agent secret are valid, at least
one future seat is sellable, and a credentialed read against LiveKit succeeds.
A 503 is a deployment blocker, not a state to ignore.

## Monitoring

Nothing polls `/api/health` on its own. The endpoint is a release gate and a
target for an external uptime monitor; point one at it and treat a 503 as a
page, otherwise a dependency can fail hours before anyone notices.

Error tracking is wired but reports nowhere until a DSN is set. What it covers:

- Unhandled server errors and route-handler failures, via `instrumentation.ts`.
  The `digest` shown to a caller resolves to an event in Sentry.
- Client render errors, via the `error.tsx` boundaries and `global-error.tsx`.
- Booking webhook delivery that has exhausted its retry budget — a paid seat the
  operator never learned about — reported at `error` level.
- Outbox events with no retry path left, counted once per day by the drain cron
  and returned as `abandoned` in its response.
- The drain cron failing to run at all, via an explicit `Sentry.withMonitor`
  check-in in the drain route under the slug `booking-webhook-drain`. Sentry's
  `automaticVercelMonitors` is not used: it is webpack-only and this project
  builds with Turbopack, so it would silently register nothing.

Passenger phone numbers are redacted before any event leaves the process, and
`sendDefaultPii` is off so cookies, headers and IP addresses are never attached.
`src/lib/sentry-wiring.test.ts` holds that guarantee against the real SDK.

Not covered: agent-side latency (`latency.turn` is a live data-channel event and
is still not persisted, so there is no historical p50/p95), and call-audit
delivery, which has no durable queue.

## Rollback

Use the Vercel dashboard deployment history or run:

```bash
vercel rollback <previous-deployment-url>
```

For v2+ and only when the LiveKit plan supports Instant Rollback, roll the Python
worker back with `lk agent rollback --config livekit.production.toml --version
<version> .`. A first-version greenfield agent has no rollback target: recover by
deploying reverted/fixed source or deliberately removing the new agent. Do not
down-migrate expand migrations `0005`–`0007` during a web rollback: their trigger
and conditional check keep the previous web release writing valid snapshots.
