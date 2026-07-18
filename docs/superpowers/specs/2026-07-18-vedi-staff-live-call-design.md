# VéĐi Staff Live Call - Design Specification

**Date:** 2026-07-18  
**Status:** Approved through product-owner delegation  
**Source branch:** `feature/TASK-003-staff-live-call-console` from `dev@c5e41c3`

## Goal

Rebuild VéĐi around one primary staff workflow and one intentionally simple caller workflow:

- `/staff` is the main product. It shows realtime source transcript, staff-selected translation, reply suggestions, booking fields filled incrementally from finalized caller speech, evidence, call controls, and a human/automatic-agent switch.
- `/call` is a phone-friendly caller page. It joins the same session, publishes microphone audio, receives staff or agent audio, and retains text/preset fallbacks for a reliable demo.
- VALSEA performs the mandatory speech-to-text step in the real voice path.
- LiveKit transports remote two-sided audio and data. A containerized agent derived from project-4 handles VALSEA STT, conversation orchestration, and optional speech output.
- The no-key fallback remains visibly labeled as simulation. It never claims to be VALSEA or a remote call.

## User stories

### Staff

1. I open `/staff?session=<code>` and share the matching `/call` link.
2. I see whether LiveKit, caller audio, VALSEA, and the voice agent are connected.
3. I choose transcript display language: original, Vietnamese, or English.
4. As the caller speaks, partial text appears but does not mutate the booking.
5. Each finalized caller utterance updates only the fields supported by that utterance.
6. I can see evidence and confidence for every AI-filled field.
7. I receive one short, safe reply suggestion focused on the next missing or conflicting fact.
8. In Human mode I speak or send the reply myself. In Auto mode the agent may answer and speak.
9. I can edit and confirm fields. Human edits always win over later low-confidence extraction.
10. I can confirm a booking only when all required fields are complete.

### Caller

1. I open a short mobile page and join a session.
2. I grant microphone permission and see clear connected, muted, speaking, and error states.
3. I can hear staff or agent audio.
4. If voice infrastructure is unavailable, I can still use sample utterances or text input for the demo.

## Approaches considered

### Browser speech only

Fastest implementation, but it fails the mandatory VALSEA requirement, is browser-dependent, and does not provide reliable remote two-device audio.

### Vercel-only WebSocket relay

Would centralize PCM and state, but a long-lived realtime audio bridge is a poor fit for serverless request lifecycles. It also recreates media routing, TURN, reconnect, and echo handling.

### LiveKit plus VALSEA agent worker - selected

LiveKit supplies WebRTC media, reconnection, room identity, and data transport. A persistent Python worker can keep a VALSEA realtime WebSocket open, publish partial/final transcripts, run the voice pipeline, and remain deployable independently from Vercel.

## Architecture

```text
Caller /call                      Staff /staff
  microphone                         microphone + console
       |                                    |
       +------------- LiveKit room ---------+
                            |
                    named agent worker
                    linked to caller only
                            |
              VALSEA RTT custom streaming STT
                            |
                final transcript event only
                  |                    |
          booking extraction     reply suggestion
                  |                    |
                  +---- room data -----+
                            |
                    staff review/edit
                            |
                       Neon snapshot

Auto mode only:
final caller turn -> VALSEA/OpenAI-compatible LLM -> VALSEA TTS -> LiveKit audio
```

### Deployment units

- `apps/web`: Next.js 16 on Vercel. Routes, signed LiveKit token endpoint, configuration status, session persistence API, and UI.
- `agent`: Python 3.11 LiveKit Agents worker in a Docker image. Target LiveKit Cloud Agents first; a Singapore container host is the documented self-host alternative.
- `db`: Neon Postgres schema for call sessions, messages, booking snapshots, field evidence, and audit events.
- `packages/contracts`: shared Zod contracts for snapshots and realtime events.
- `packages/core`: deterministic booking extraction, validation, suggestion, and human edit precedence.

## Route design

### `/staff`

Desktop is a high-density operational workspace, not a marketing dashboard.

Header:

- VéĐi wordmark and `Bàn hỗ trợ đặt vé` descriptor.
- session code and caller URL copy action.
- semantic statuses for call, caller, VALSEA, and agent.
- transcript language selector.
- Human / Auto segmented control.
- start/end and microphone controls.

Workspace:

- Left: live conversation, caller/staff/agent lanes, mutable partial segment, finalized segments, translation, timestamps, and evidence highlight.
- Center: booking form grouped into journey, passenger, pickup/drop-off, trip/seat, and payment/note sections.
- Right: suggested reply, missing-field list, matching trips, confidence/review queue, speak/copy/dismiss actions, and final confirmation gate.

Responsive behavior:

- 1280px and wider: three working columns.
- 768px to 1279px: transcript and form side-by-side, assistant rail below.
- below 768px: strict single column with sticky call controls.

### `/call`

- Session code and connection state.
- Large caller identity and audio state.
- One primary connect/mute control and one hang-up control.
- Minimal transcript preview for the caller's latest final utterance.
- Three realistic Vietnamese sample utterances plus text input only when demo fallback is active.
- No booking back-office detail.

### Existing routes

- `/console` redirects to `/staff`.
- `/` introduces the two-route demo and links directly to both roles.
- `/design-system` documents the updated staff/call tokens and states.

## Visual system

Design read: an operational bus-booking product for Vietnamese customer-care staff, using an Apple-like utility language with calm hierarchy.

- Design variance 4, motion 3, visual density 7.
- System/SF-style sans stack with tight display tracking and 17px readable body text.
- Cold white and `#f5f5f7` surfaces, near-black ink, one Action Blue interactive accent.
- Semantic green/amber/red appear only for real status and validation.
- 18px panels, 11px controls, pill primary actions. No decorative gradients, outer glows, or card shadow stacks.
- Frosted sticky header is a labeled web approximation, not official Apple Liquid Glass.
- Motion only communicates partial-to-final transcript, field updates, connection changes, and button feedback. Reduced-motion users get static transitions.

## Booking data

### Required before confirmation

- origin
- destination
- travel date
- departure time or time window
- passenger count
- passenger name
- Vietnamese phone number
- pickup point
- drop-off point
- selected trip
- one seat per passenger

### Optional

- vehicle preference
- payment method
- note

### Evidence

Each extracted field revision stores:

- field key
- finalized message ID
- exact source quote
- confidence
- source (`caller_speech`, `staff_edit`, `catalog`, or `system`)
- timestamp

Human edits mark the field confirmed. Later machine extraction may only replace a confirmed value after explicit correction language and a staff review flag.

## Incremental extraction rules

1. Partial transcript is UI-only.
2. Only finalized caller speech enters extraction.
3. Staff and agent speech never changes caller booking facts.
4. Each turn produces a field patch, not a regenerated booking object.
5. Every machine patch needs exact evidence.
6. Corrections such as `không, đổi sang` replace prior machine values and append revision evidence.
7. Ambiguous dates, places, counts, or phone numbers create review items instead of guesses.
8. Catalog matching and fare calculation are deterministic.
9. Confirmation remains human-gated even in Auto mode.

The first implementation uses deterministic Vietnamese extraction for the guaranteed demo. The provider boundary allows a VALSEA or OpenAI-compatible structured extractor to propose additional validated patches later.

## Reply suggestion rules

- Ask for at most two missing facts.
- Prefer one natural Vietnamese sentence suitable for a phone call.
- Use only source transcript and catalog facts.
- Never claim a seat is booked until staff confirmation succeeds.
- Never invent fare, location, schedule, or availability.
- Human mode never plays suggestion audio automatically.
- Auto mode may speak only after the staff toggle is received by the worker.

## Realtime contracts

Room data topic: `vedi.events`.

Server-to-client events:

- `session.status`
- `transcript.partial`
- `transcript.final`
- `booking.snapshot`
- `reply.suggested`
- `agent.state`
- `agent.error`

Staff-to-agent commands:

- `staff.preferences` with mode and translation language
- `staff.speak` with approved text
- `staff.end_turn`
- `staff.end_call`

Tokens use short TTL, room-scoped grants, unique participant identities, and dispatch the named agent only from the caller token. The agent links explicitly to `caller-<session>` so staff audio is not treated as booking input.

## VALSEA integration

The custom STT adapter follows the current official RTT protocol:

1. Connect to `wss://api.valsea.ai/v1/realtime` with a server-side Bearer key.
2. Send `session.start` with `model: valsea-rtt`, `language: vietnamese`, booking vocabulary in `hint_text`, correction enabled, and diarization off.
3. Stream PCM16 16 kHz mono using `audio.append` or binary frames.
4. Map `transcript.partial` to LiveKit interim events.
5. Map `transcript.final` to LiveKit final events.
6. Send `audio.commit` at end of utterance and `session.stop` during shutdown.

The worker uses VALSEA's OpenAI-compatible `POST /v1/audio/speech` endpoint with model `valsea-tts` for spoken replies. VALSEA's public API does not currently expose a general chat-completions endpoint, so OpenAI is the optional downstream LLM for Auto-mode reasoning and reply generation. OpenAI is never an ASR fallback: configured remote transcription always uses VALSEA RTT.

## Demo fallback

Without LiveKit or VALSEA credentials:

- `/call` and `/staff` communicate through a same-origin `BroadcastChannel` when opened on one device.
- caller text, sample utterances, and optional browser speech recognition feed the same deterministic final-message reducer.
- device speech synthesis can demonstrate an audible reply after user interaction.
- every fallback state says `Mô phỏng cục bộ` and `Chưa dùng VALSEA`.

This fallback is for UI and workflow validation only. A phone on a different device requires the configured LiveKit path.

## Error handling

- Mic denied: keep text/sample controls and show recovery instructions.
- Caller absent: staff remains usable with a clear waiting state.
- LiveKit token failure: expose configuration reason without leaking secrets.
- VALSEA failure: do not update booking from stale or partial text; show retry and Human mode.
- Agent worker absent: remote human audio still works; Auto mode is disabled.
- Invalid patch: reject it, preserve current draft, and add an audit error.
- Disconnect: keep the latest booking and messages; reconnect to the same session.

## Security

- `VALSEA_API_KEY`, `LIVEKIT_API_SECRET`, and model keys remain server/worker-only.
- The previously pasted OpenAI key must be revoked and replaced. It is not copied into any file or deployment environment.
- Caller URLs contain a demo session code, not customer PII.
- Production token endpoint must add authentication and session authorization before real customer use.
- Audio retention is disabled by default in the demo.

## Testing and acceptance

- Contract tests validate all snapshots, commands, and events.
- Core tests cover partial-ignore, multi-field extraction, correction, speaker rules, human edit precedence, missing-field suggestions, and confirmation gate.
- Provider tests cover official VALSEA start/commit/stop shapes and partial/final mapping.
- Agent tests cover VALSEA event mapping and Human/Auto response policy without external credentials.
- Component tests cover staff field updates, suggestions, language switch, Human/Auto behavior, and fallback labeling.
- Playwright uses two pages/contexts for `/staff` and `/call`, completes a booking, and verifies mobile caller layout.
- Live smoke tests are conditional on credentials and recorded separately from deterministic gates.

## Required credentials after implementation

- LiveKit Cloud URL, API key, and API secret.
- VALSEA API key with RTT and TTS access.
- A worker deployment target or LiveKit Cloud Agents access token.
- Neon `DATABASE_URL` for persistence.
- Optional fresh OpenAI key for Auto-mode LLM reasoning; it is never used for STT.

## Sources

- `1.pdf`
- `ORDERVOICE_IMPLEMENTATION_GUIDE.md`
- `project-4/agent/agent.py`
- `project-4/src/components/interview/livekit-room.tsx`
- `project-4/docs/live-interview-agent-hosting.md`
- https://valsea.ai/docs/realtime
- https://valsea.ai/docs/api/voicebot-realtime
- https://valsea.ai/docs/api/speech
- https://docs.livekit.io/agents/logic/sessions/
- https://docs.livekit.io/agents/models/stt/
- https://docs.livekit.io/agents/multimodality/text/
- https://docs.livekit.io/frontends/build/authentication/endpoint/
- https://docs.livekit.io/deploy/custom/deployments/
