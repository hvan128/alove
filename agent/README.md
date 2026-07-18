# Alove bus agent worker (LiveKit)

Voice agent for Alove bus booking operated by nhà xe Mai Anh. The model handles
natural conversation, but booking facts remain **server-authoritative**: trips,
prices, seats and ticket codes come from the Next.js `/api/booking/search`,
`hold`, `confirm`, `lookup` and `cancel` endpoints backed by the application
database.

The worker mirrors live state to the browser on the `alove-events` data topic.
Every outbound event contains `callId`, `eventId` and a monotonically increasing
`sequence`. Final customer/agent transcripts and booking snapshots are also sent
to `/api/call/events` for the call audit trail.

## Files

- `agent.py` — worker entrypoint, provider selection and booking tools.
- `booking_helpers.py` — pure confirmation and browser snapshot payload builders.
- `call_lifecycle.py` — room deletion and worker shutdown used by `end_call`.
- `speech_text.py` — Vietnamese speech normalization before TTS.
- `valsea_stt.py` — VALSEA realtime ASR wrapped as a livekit-agents STT plugin.
- `turn_rules.py` — deterministic Vietnamese end-of-turn detection (no model, ~0ms).
- `tests/` — unit tests for API payload and confirmation invariants.

## Engine presets (A/B testable)

Set in `agent/.env` (copy from `.env.example`):

| Preset | env | Needs |
|---|---|---|
| VALSEA-first | `AGENT_ENGINE=cascade STT_PROVIDER=valsea` | `VALSEA_API_KEY`; OpenAI LLM and TTS may use direct keys or their configured gateways |
| Speechmatics cascade | `AGENT_ENGINE=cascade STT_PROVIDER=speechmatics` | `SPEECHMATICS_API_KEY` is optional; blank uses the LiveKit inference gateway |
| OpenAI STT cascade | `AGENT_ENGINE=cascade STT_PROVIDER=openai` | `OPENAI_API_KEY` |
| gemini-sts | `AGENT_ENGINE=gemini-sts` | `GEMINI_API_KEY` |

`STT_PROVIDER` is cascade-only and defaults to `valsea` when missing or blank.
Unknown STT values fail closed for cascade. Gemini speech-to-speech does not use
that variable, so it ignores stale cascade-only values while still requiring a
non-blank `GEMINI_API_KEY` before the Gemini SDK is constructed.

## Run locally

```bash
cd agent
uv sync                      # or: pip install -e .
cp .env.example .env         # fill LiveKit + provider + AGENT_WEBHOOK_SECRET
uv run python agent.py console  # local audio, no room (dev name auto-suffixed -dev)
# or, joined to a real LiveKit room served by the web app:
uv run python agent.py dev

# Pure contract tests (không cần provider credentials)
uv run python -m unittest discover -s tests
```

The web app must run with matching env: `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`, and the same
`AGENT_WEBHOOK_SECRET`. A local `python agent.py dev` worker automatically uses
the dispatch name `alove-dev`, so set the web app's `LIVEKIT_AGENT_NAME=alove-dev`
for that session. Open `/console` and start a web call.

The booking tools require `DATABASE_URL`, migrated schema and seeded operator data
on the web app; a credentialed LiveKit call without database inventory cannot
search or reserve seats.

`end_call` waits for the final spoken line, publishes the terminal browser event,
then deletes the LiveKit room. Room deletion disconnects both browser participants
and inbound SIP callers; the worker job shuts down afterward so call-audit shutdown
callbacks can finish.

## Deploy

```bash
cd agent

# First production rollout only: creates the Cloud agent in the immutable
# ap-south region and writes non-secret IDs to a separate production config.
lk agent create --config livekit.production.toml --project <livekit-project> \
  --region ap-south --secrets-file /private/tmp/<owner-only-agent-env> .

# Subsequent immutable versions use that checked-in identity.
lk agent deploy --config livekit.production.toml \
  --secrets-file /private/tmp/<owner-only-agent-env> .
lk agent status --config livekit.production.toml .
lk agent versions --config livekit.production.toml .

# From v2 onward, on a plan that supports Instant Rollback:
lk agent rollback --config livekit.production.toml --version <version> .
```

LiveKit Agents Cloud is the canonical production worker host. Its build uses the
checked-in `Dockerfile` and runs `python agent.py start`. The secrets file is a
temporary, owner-only file and must contain only the agent runtime variables —
never `DATABASE_URL`, dashboard keys or Vercel-only secrets. Keep the bare
`LIVEKIT_AGENT_NAME` (`alove`) in production, point `NEXTJS_API_URL` at
`https://vedi-one.vercel.app`, and use the same `AGENT_WEBHOOK_SECRET` as
Vercel. Local `dev`/`console` auto-isolate under `alove-dev`.

The first Cloud create has only v1, so it has no rollback target. Its recovery is
fix/revert source and deploy a new version, or deliberately stop/remove the new
agent. Instant Rollback is used only from v2 onward after confirming the LiveKit
plan supports it. Always record `lk agent versions` before a later rollout.

The Docker build exports from the committed `uv.lock`; update it with `uv lock`
whenever `pyproject.toml` changes.

No LiveKit / provider credentials are committed here, so a fresh checkout cannot
exercise the live audio path without deployment secrets. VALSEA supplies STT
only; VALSEA mode uses Google or Cartesia for TTS.
