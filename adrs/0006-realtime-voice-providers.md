# ADR 0006: VALSEA-first transcription and adapter-based telephony

**Status:** Accepted

## Decision

VALSEA is the default production ASR adapter. It receives realtime PCM16/16 kHz/mono via its documented WebSocket API. OpenAI may run only as a server-side development fallback. Twilio Media Streams is the initial direct-telephone adapter. Zalo is a synchronized file replay flow, not an assumed live voice API. TTS is a human-clicked provider adapter with device speech as no-key demo fallback.

## Rationale

The challenge explicitly requires a real VALSEA ASR call. Twilio documents raw bidirectional media needed for the audio boundary. Public Zalo documentation does not establish a general raw live-call audio stream. A provider adapter interface makes replacement (including Stringee after commercial confirmation) safe.

## Consequences

- Actual provider success needs credentials, phone number/verification and publicly reachable WSS where relevant.
- The repository has exact protocol code and fixture tests without implying unauthenticated live calls succeeded.
- The UI states provider readiness honestly and points to `docs/integration-feasibility.md`.
