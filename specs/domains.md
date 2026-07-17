# Domain Boundaries

## Audio ingestion

Owns browser PCM capture, replay timing and telephony decoding. Produces normalized PCM16/16kHz/mono frames; it never persists order data or chooses a transcript provider.

## Speech provider

Owns provider sessions, partial/final event mapping and provider failure state. It returns final source-language segments with timestamps and confidence where available. It does not extract an order.

## Conversation

Owns source, tracks, final transcript segments, current state and audit timeline. Only a final segment can enter persistence and extraction.

## Order intelligence

Owns `OrderPatch` proposals, evidence links, deterministic catalog/customer resolution, arithmetic and exceptions. It cannot call ERP directly. It rejects patches that lack final-segment evidence.

## Approval and export

Owns operator correction, approval, idempotency key and ERP draft result. It accepts an order only from `review_required`/`ready_for_approval`; it cannot infer approval from an agent utterance.

## Reply and speech

Owns a proposed Vietnamese reply and human-clicked TTS. The reply is separate from the sales order and cannot mutate it.

## UI

Owns presentation and user intent. It does not contain provider credentials, catalog resolution logic or export idempotency.
