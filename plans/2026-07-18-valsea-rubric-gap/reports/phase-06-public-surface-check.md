# Phase 06 public-surface check

- Initial check: `2026-07-18T18:37:07Z`
- `/verify` follow-up: `2026-07-18T18:52:46Z`
- Method: unauthenticated read-only HTTP GET, redirects followed, 20-second timeout.
- Scope: public availability only. No credential, cookie, phone number, booking
  payload, response header or deployment secret was recorded.

| Surface | Observed result |
|---|---|
| `https://vedi-one.vercel.app/` | HTTP 200 |
| `https://vedi-one.vercel.app/api/health` | HTTP 200; body reported `ready` for database, LiveKit and agent webhook |
| `https://vedi-one.vercel.app/evidence` | HTTP 200; rendered Alove evidence labels for tonal Vietnamese, code-switch and 8 kHz |
| `https://github.com/hvan128/alove` | HTTP 200; repository page marked Public |
| `https://vedi-one.vercel.app/verify?code=TEST` | HTTP 404; Phase 04 verification route is not on this deployment |

This check proves only those public surfaces at the timestamps above. It does not
prove a phone QR scan, configured webhook receiver delivery, migration null check,
semantic/latency event from a real call, PSTN call, regional-accent performance or
that uncommitted Phase 04/05 working-tree changes are deployed.
