# VéĐi bus agent worker (LiveKit)

Voice agent for the VéĐi bus-ticket demo. Ported from the project-4 interview
agent, domain-swapped to bus booking. Booking stays **deterministic and
server-authoritative**: the worker never invents prices, trips, seats, passenger
info or ticket codes — every customer turn is relayed to the Next.js
`/api/booking/advance` endpoint (which runs `@ordervoice/core`), and the worker
just speaks the exact reply and mirrors the authoritative booking snapshot to the
browser over the room data channel.

## Files

- `agent.py` — worker entrypoint, engine selection, `advance_booking` / `end_call` tools.
- `valsea_stt.py` — VALSEA realtime ASR wrapped as a livekit-agents STT plugin.
- `turn_rules.py` — deterministic Vietnamese end-of-turn detection (no model, ~0ms).

## Engine presets (A/B testable)

Set in `agent/.env` (copy from `.env.example`):

| Preset | env | Needs |
|---|---|---|
| VALSEA-first | `AGENT_ENGINE=cascade STT_PROVIDER=valsea` | `VALSEA_API_KEY`, `OPENAI_API_KEY` (LLM), a TTS (Google/Cartesia) |
| cascade | `AGENT_ENGINE=cascade STT_PROVIDER=speechmatics` | `SPEECHMATICS_API_KEY`, `OPENAI_API_KEY`, a TTS |
| gemini-sts | `AGENT_ENGINE=gemini-sts` | `GEMINI_API_KEY` |

## Run locally

```bash
cd agent
uv sync                      # or: pip install -e .
cp .env.example .env         # fill LiveKit + provider + AGENT_WEBHOOK_SECRET
python agent.py console      # local audio, no room (dev name auto-suffixed -dev)
# or, joined to a real LiveKit room served by the web app:
python agent.py dev
```

The web app must run with matching env: `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_URL`,
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME=vedi`, and the SAME
`AGENT_WEBHOOK_SECRET`. Open `/console`, pick **Agent tự động**, **Bắt đầu Web Call**.

## Deploy

```bash
docker build -t vedi-bus-agent .
# Run on any host that keeps a long-lived outbound WebSocket to LiveKit
# (Railway, Fly.io, Cloud Run w/ min-instances, a VM/container).
```

Production runs `python agent.py start`. Keep the bare `LIVEKIT_AGENT_NAME`
(`vedi`) in prod; local `dev`/`console` auto-isolate under `vedi-dev`.

## Not verified in this workspace

No LiveKit / provider credentials are present here, so the live audio path has not
been run. `valsea_stt.py` maps the VALSEA WS protocol correctly (same as the Node
`packages/providers/src/valsea.ts`) but its livekit-agents STT/SpeechStream glue
should be verified against the installed `livekit-agents` version before a pilot.
VALSEA has no TTS in this repo — VALSEA mode uses Google/Cartesia for TTS.
