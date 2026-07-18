# VéĐi voice worker

The worker is separate from Vercel because it keeps long-lived LiveKit and VALSEA WebSocket sessions. It subscribes only to `caller-<SESSION_CODE>` and publishes the same versioned `vedi.events` messages used by `/staff` and `/call`.

Behavior:

- VALSEA RTT is the only production STT path.
- Human mode transcribes but raises `StopResponse`, so no spontaneous reply is generated.
- `staff.speak` is synthesized with VALSEA TTS in either mode.
- Auto mode uses OpenAI for the reply text and VALSEA for Vietnamese speech.
- English display mode translates finalized caller turns with OpenAI Responses, uses `store=false`, and falls back to the source text on timeout or provider error.
- Final booking confirmation remains a staff action in the web app.

## Local setup

```bash
cp .env.example .env
uv sync --all-extras
uv run pytest
uv run ruff check .
uv run python agent.py dev
```

Development workers register as `vedi-booking-agent-dev`. Set the web app's `LIVEKIT_AGENT_NAME` to that name while testing locally. Production uses `vedi-booking-agent`.

## Container

```bash
docker build -t vedi-booking-agent .
docker run --env-file .env vedi-booking-agent
```

## LiveKit Cloud

Install and authenticate the LiveKit CLI, then run from this directory:

```bash
lk cloud auth
lk agent create
lk agent deploy
```

The CLI creates a project-linked `livekit.toml`. Keep the three LiveKit credentials synchronized with the Vercel project, then enable caller dispatch with `VOICE_AGENT_ENABLED=true` on Vercel.
