# Domain Boundaries — VéĐi

## Web Call session

Owns call lifecycle, elapsed time, mode and role presence. The demo session is local to one browser and visibly labelled. It does not claim PSTN, SIP or remote-room connectivity.

## Conversation

Owns ordered customer, staff, agent and system messages. Only final customer messages enter booking extraction. Each message keeps channel and timestamp provenance.

## Booking intelligence

Owns static trip catalog, supported-route parsing, missing-slot detection, fare arithmetic, seat selection and confirmation invariants. It is pure TypeScript and cannot access browser APIs or send audio.

## Agent orchestration

Owns the next concise Vietnamese reply for `Agent tự động`. It reads a final customer message and booking draft, then returns a new draft plus reply. It cannot charge money or bypass confirmation.

## Human customer care

Owns manual replies, staff takeover and explicit staff confirmation. Switching modes preserves messages and booking state.

## Voice interface

Owns optional browser speech recognition and device speech synthesis. Unsupported/denied microphone access degrades to preset and text input. Voice adapters cannot mutate a booking directly.

## Realtime transport adapters

Own future LiveKit, WebRTC or phone transport. Existing VALSEA/Twilio modules remain isolated legacy seams. No transport credential enters client code.

## UI

Owns presentation and user intent. It composes customer and customer-care surfaces from typed domain results; it does not implement booking rules.

