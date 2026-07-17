# Feature Specification

## F-01: Unified source selection

The operator selects Browser call, Zalo replay, or Phone. Each mode displays its actual readiness: `ready`, `connecting`, `live`, `unavailable`, `demo`. The selected source is carried into transcript provenance.

## F-02: Browser voice capture

The browser requests microphone permission, captures PCM16 frames via `AudioWorklet`, and sends `20–100 ms` mono/16 kHz frames through a WebSocket. The UI renders partial text as provisional and persists final text only.

## F-03: Zalo replay

The operator selects an audio/video attachment and starts synchronized replay. The media element time is reflected in transcript timestamps. The app calls this “Zalo replay”; it does not represent it as a direct live Zalo call.

## F-04: Direct telephone call

An incoming Twilio webhook creates a conversation. Media Stream packets are decoded from base64 mu-law 8 kHz, resampled to PCM16 16 kHz and sent to ASR. Caller and agent tracks remain distinct where Twilio supplies them. The demo includes a deterministic telephony fixture but does not claim an actual PSTN call without credentials and a reachable WSS URL.

## F-05: VALSEA transcription

When configured, the gateway opens a VALSEA realtime session and maps provider partial/final events. Final events preserve Vietnamese diacritics and original wording. VALSEA is the production/challenge provider. A development provider can only activate through an explicit environment switch.

## F-06: Evidence-backed draft order

A final segment may yield an `OrderPatch`. Each field cites `segmentId`, quoted source span and confidence. A deterministic resolver matches customers and SKUs against seeded aliases. Ambiguity, missing unit, invalid quantity and price mismatch become exceptions.

## F-07: Human-in-the-loop approval and ERP draft

The operator can correct a draft. Approval has a named human actor and timestamp. Export remains disabled before approval. Export sends an idempotency key to ERPNext and records a single external draft reference.

## F-08: Reply and speech

The assistant proposes a Vietnamese confirmation/review reply. The operator must click `Nói phản hồi` to produce audio. In demo mode this uses the device speech API and labels the output; in configured environments VALSEA/OpenAI server-side TTS can be used.

## F-09: Design system

`/design-system` demonstrates semantic colour, type, buttons, inputs, status, panel, transcript and field-evidence primitives. The console composes these primitives rather than defining ad hoc styles.
