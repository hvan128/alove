# Deployment

## Platform

The Next.js web app is deployed to Vercel from the repository root. The Vercel
project's Root Directory is `apps/web`, so the CLI must not be started from
inside that directory.

Production: <https://vedi-one.vercel.app/>

This is the only supported web deployment. OrderVoice/demo deployments are not
part of the current system.

## Required services

- Neon database with all migrations from `apps/web/drizzle` applied.
- LiveKit Cloud project.
- Long-running Python worker registered as agent `alove`.
- Vercel variables: `DATABASE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME`, `AGENT_WEBHOOK_SECRET` and
  `DASHBOARD_ACCESS_KEY` when the dashboard is enabled.

There is no `NEXT_PUBLIC_LIVEKIT_URL` feature switch. Missing production
dependencies must fail readiness instead of enabling a browser demo.

The application-level limiter on token and redispatch endpoints is intentionally
per Vercel instance. Production must also enable a shared edge/WAF rate limit so
traffic cannot bypass the limit by reaching another instance.

## Release order

1. Back up Neon and apply the new migration.
2. Deploy the web/API release to a preview and verify `/api/health` readiness.
3. Build and roll out the Python agent using the same event/booking contract.
4. Promote the web release to production.
5. Run one web call through search, hold, confirm and ticket display; then check
   the call transcript and booking snapshot in `/dashboard`.

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

The health endpoint should return HTTP 200 only when the required migrations are
present, at least one future seat is sellable, the agent secret is valid, and a
credentialed read against LiveKit succeeds. A 503 is a deployment blocker, not a
state to ignore.

## Rollback

Use the Vercel dashboard deployment history or run:

```bash
vercel rollback <previous-deployment-url>
```
