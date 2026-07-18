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
- Long-running Python worker registered as agent `alove`. Cascade mặc định
  `STT_PROVIDER=valsea`, cần `VALSEA_API_KEY`; `VALSEA_WS_URL`/`VALSEA_MODEL` chỉ
  là override. Provider không được hỗ trợ hoặc credential active bị thiếu phải
  làm worker fail startup, không âm thầm đổi engine.
- Vercel variables: `DATABASE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME`, `AGENT_WEBHOOK_SECRET` and
  `BOOKING_VERIFICATION_SECRET`; plus `DASHBOARD_ACCESS_KEY` when the dashboard
  is enabled.
- Optional booking webhook: set `BOOKING_WEBHOOK_URL`,
  `BOOKING_WEBHOOK_SECRET`, `BOOKING_WEBHOOK_ALLOWED_HOSTS` and `CRON_SECRET`
  together. Leaving URL, signing secret and allowed hosts blank is the explicit
  disabled state (an independently provisioned `CRON_SECRET` does not enable
  delivery). If any of those three delivery variables is set, all four must be
  valid or confirmation reports `misconfigured` and sends nothing. `CRON_SECRET`
  must be a separate random value of at least 32 bytes; Vercel sends it as the
  bearer credential to the scheduled drainer.

There is no `NEXT_PUBLIC_LIVEKIT_URL` feature switch. Missing production
dependencies must fail readiness instead of enabling a browser demo.

Token and redispatch limiters are per Vercel instance, so production must also
enable a shared edge/WAF limit for those endpoints. Public booking verification
uses an atomic Neon bucket shared across instances, keyed by HMAC digests rather
than raw IP/code/phone; keep an edge/WAF limit as the first layer as well.

## Release order

1. Back up Neon and apply all migrations, including `0004_workflow_output.sql`
   and the **expand** migration `0005_durable_workflow_output.sql`. Migration
   `0005` leaves `verification_snapshot` nullable during the rolling release and
   installs a compatibility trigger so the previous web version still captures
   an immutable snapshot when it confirms a booking.
2. Check that the historical backfill found a matching confirmed snapshot for
   every booking:

   ```sql
   SELECT id, code
   FROM bookings
   WHERE verification_snapshot IS NULL;
   ```

   Do not promote while this returns rows. Restore those rows only from an
   archived confirmed `booking_snapshots.snapshot` (matching code, phone, seats
   and total fare); do not reconstruct old tickets from current trip/route data.
3. Deploy the web/API release to a preview and verify `/api/health` readiness,
   `/evidence` and ticket JSON download. Confirm one test booking and inspect its
   webhook result: `disabled` when delivery variables are absent;
   `pending`/`delivered`/`failed` when enabled. A `misconfigured` result is a
   release blocker even though the authoritative booking remains successful.
4. Build and roll out the Python agent using the same event/booking contract.
5. Promote the web release to production, then repeat the null check. The
   compatibility trigger covers confirmations made by the previous release
   during the preview window.
6. In a later contract migration, after the new release is fully promoted and
   the null check remains empty, set `verification_snapshot` to `NOT NULL` and
   remove `bookings_fill_verification_snapshot_before_insert` plus its function.
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
`apps/web/vercel.json` invokes the authenticated outbox drainer every minute;
terminal payload/4xx/destination failures are never selected for retry.

## Deploy

```bash
pnpm deploy:web
```

Production secrets are managed in Vercel. Expected variable names are listed in
the repository README; secret values must never be committed.

## Verify

```bash
curl -I https://vedi-one.vercel.app/ban-to-chuc
curl -I https://vedi-one.vercel.app/console
curl -i https://vedi-one.vercel.app/api/health
```

The health endpoint should return HTTP 200 only when the required migrations
(`verification_snapshot`, `public_rate_limits`, `booking_webhook_outbox`) are
present, `BOOKING_VERIFICATION_SECRET` and the agent secret are valid, at least
one future seat is sellable, and a credentialed read against LiveKit succeeds.
A 503 is a deployment blocker, not a state to ignore.

## Rollback

Use the Vercel dashboard deployment history or run:

```bash
vercel rollback <previous-deployment-url>
```

Roll the Python worker back to the matching image/contract as well. Do not
down-migrate expand migration `0005` during a web rollback: its compatibility
trigger keeps the previous web release writing immutable verification snapshots.
