# Product Vision — OrderVoice

## Purpose

OrderVoice is a Vietnamese voice-order copilot for B2B sales operators. It turns an imperfect order conversation into a reviewable sales-order draft, with proof for every AI-derived field. The product is built for the Vietnam AI Innovation Challenge: VALSEA ASR is the required speech-recognition integration, Vietnamese and Vietnamese/English code-switching are first-class input, and workflow-ready output matters more than a raw transcript.

## Users

| User | Need | Product outcome |
|---|---|---|
| Sales operator | Capture a rushed, noisy order without retyping it | Final transcript, structured draft, exception list and reply suggestion |
| Sales supervisor | Trust and correct the AI before a business system changes | Evidence, confidence, source timestamps and explicit approval |
| Integration owner | Deliver one safe ERP draft per approved order | Idempotent export with an auditable external reference |

## Principles

1. Human approval is a product boundary, not a UI decoration.
2. The final source-language transcript is canonical; translation is never used to resolve a SKU or mutate an order.
3. AI proposes; deterministic rules validate; a human decides.
4. Audio provenance survives every channel and every derived field.
5. A working demo may simulate unavailable providers only when it is visibly labelled. It must never simulate success as if it were a live provider call.

## Success measures for the MVP

- Operator can demonstrate a full conversation-to-draft path in under three minutes.
- Every generated draft field has at least one final transcript evidence reference.
- The demo covers noisy/casual Vietnamese and a Vietnamese/English SKU phrase.
- Duplicate export never creates a second ERP draft.
- Browser UI works at desktop and phone widths; at least one human-clicked reply is audible.

## Scope

Included: browser microphone calls, synchronized uploaded-file replay for Zalo-originated audio/video, PSTN media adapter, VALSEA realtime ASR adapter, OpenAI development fallback, TTS preview, order extraction/rules/evidence, Neon persistence, ERPNext draft adapter, Apple-like operator console, design-system route and deployment-ready web application.

Excluded: autonomous agent purchasing, production account provisioning, payment, stock reservation, customer authentication and direct undocumented Zalo live-call capture.
