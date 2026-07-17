# Third-Party Integration Feasibility

**Checked:** 2026-07-18

This record separates implemented protocol support from a live credentialed test. No account key supplied in chat is copied into the project, command history or deployment configuration.

## VALSEA ASR — required, implemented adapter; live test blocked by absent sandbox key

VALSEA documents a realtime WebSocket at `wss://api.valsea.ai/v1/realtime`, session start/configuration and PCM16 16 kHz mono audio with partial/final transcript events. The gateway adapter implements that shape and fixture tests validate its event mapping. An anonymous `POST https://api.valsea.ai/v1/audio/transcriptions` check on 2026-07-18 returned `401`, proving the endpoint is reachable and correctly credential-gated; it is not an ASR success. A real call cannot be performed because no VALSEA sandbox credential has been provisioned in this environment. Add `VALSEA_API_KEY` server-side, then run the documented live smoke command.

References: [VALSEA Realtime](https://valsea.ai/docs/realtime), [VALSEA Speech API](https://valsea.ai/docs/api/speech).

## OpenAI — implemented development fallback; not challenge compliance

OpenAI structured output is suitable for a constrained draft-patch proposal and its TTS can supply a server-side development voice. It is explicitly behind `ASR_PROVIDER=openai`/`TTS_PROVIDER=openai`, never the default production VALSEA choice. The repository does not use the credential pasted in the request; its owner should rotate it immediately because it was exposed in chat.

References: [OpenAI Voice Agents](https://platform.openai.com/docs/guides/voice-agents), [OpenAI Text-to-Speech](https://platform.openai.com/docs/guides/text-to-speech), [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs).

## Twilio Media Streams — adapter + fixture test; live PSTN test needs account and public WSS

Twilio documents Media Streams as base64 `audio/x-mulaw` 8 kHz audio delivered to a secure WebSocket. The adapter decodes and resamples it; the Fastify gateway exposes TwiML/webhook seams. The initial `Connect/Stream` route is deliberately inbound-ASR-first: Twilio bidirectional streams receive the inbound caller track, while any phone-side synthesized reply needs a separately configured outbound-media/TTS step. The demo's audible reply therefore uses an explicit browser/device-voice action and must not be represented as a completed live PSTN TTS test. An anonymous `GET https://api.twilio.com/2010-04-01/Accounts.json` check on 2026-07-18 returned `401`, confirming a reachable credential boundary only. A live test requires an account SID/auth token, a verified/provisioned number (trial accounts restrict destinations), and a publicly reachable secure WebSocket URL. Twilio test credentials do not simulate full Media Streams callbacks, so they are insufficient for proving the live audio path.

References: [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams), [Twilio test credentials](https://www.twilio.com/docs/iam/test-credentials), [Vietnam voice pricing](https://www.twilio.com/en-us/voice/pricing/vn).

## Stringee — Vietnam-oriented alternative; commercial media capability unverified

Stringee documents telephone and Web SDK calling and is a sensible Vietnam-market telephony candidate. Public documentation reviewed establishes call setup/webhooks but did not establish a general server-side raw audio streaming interface equivalent to the Twilio Media Streams path. Keep Twilio for the first realtime adapter; validate Stringee media capture and number provisioning with its commercial/support channel before replacing it.

Reference: [Stringee Call API overview](https://developer.stringee.com/docs/call-api-overview).

## Zalo audio — implemented as truthful replay; live raw audio API not assumed

Zalo public developer material exposes OA and call-related product areas, but the reviewed public documentation does not establish an app-accessible raw audio stream for arbitrary Zalo calls/voice notes. `https://developers.zalo.me/docs/` returned `200` on 2026-07-18; this verifies documentation availability, not product entitlement. The product therefore accepts an operator-exported audio/video attachment and synchronizes playback/transcription. A direct live Zalo implementation must wait for applicable OA/partner entitlement and written confirmation of allowed media access.

Reference: [Zalo Developers](https://developers.zalo.me/docs/).

## Neon — implementation ready; live DB test blocked by absent connection string

Neon's serverless driver supports HTTP queries and WebSocket-based transactions. Drizzle schema/migration code is included. A live persistence test needs `DATABASE_URL`; without it the local demo intentionally uses fixture state and labels this in the UI.

Reference: [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver).

## Vercel — web deployment target; realtime gateway should use a durable Node host

Vercel auto-deploys the Next.js web app. Vercel's current documentation has evolving WebSocket guidance; reliable media WebSocket affinity and long-running stream ownership should be verified against the account/runtime before production use. The architecture therefore keeps Fastify portable to Railway, Fly.io, Cloud Run or another Node WebSocket host. If only Vercel credentials are available, the web demo deploys and operates in client demo mode; it must not claim PSTN/VALSEA live ingestion is active.

References: [Vercel WebSocket guide](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections), [Vercel Functions limits](https://vercel.com/docs/functions/limitations).

## Live-test checklist after credentials arrive

1. Put each credential in the host's encrypted environment variables; never in `.env.example`, source, logs or Git.
2. Run `pnpm --filter @ordervoice/api test:live:valsea` with a short known Vietnamese/code-switching PCM fixture and retain only result metadata.
3. Deploy the gateway behind HTTPS/WSS; set `PUBLIC_GATEWAY_URL` for Twilio/TwiML on the gateway and `NEXT_PUBLIC_GATEWAY_URL` for browser capture on Vercel.
4. Configure Twilio webhook and Media Stream URL; place a consented test call; verify a final segment and no partial persistence.
5. Configure a Neon branch URL; run migrations; create/export the fixture order twice and confirm one ERP external reference.
6. Record provider outcome/date/account mode here.
