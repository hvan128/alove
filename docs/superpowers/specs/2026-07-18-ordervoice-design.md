# SpeechToInvoice voice booking design

**Status:** Historical planning design. Its pilot safety language is a target, not a claim about the shipped public demo.

## Outcome

SpeechToInvoice is a Vietnamese AI Voice Agent đặt vé xe. In the shipped browser demo, a customer can speak, type, or choose presets; changed final messages append to aggregate `evidenceMessageIds`, and a supported confirmation keyword or manual staff action creates a deterministic in-memory code. A customer-care employee can observe the same conversation, reply manually, and take over from automation. The field-level/elevated confirmation terms below describe the target pilot only.

## Product boundary

- Canonical scenario: `Sài Gòn → Đà Lạt`, two passengers, evening departure.
- Target-pilot readiness facts: origin, destination, travel date, passenger count, selected trip, passenger name, and Vietnamese phone. Time window, fare, and seats are derived summary data, not prerequisites. The source-compatible public-demo names are `travelDateLabel`, `phone`, and aggregate `evidenceMessageIds`; the pilot names are `travelDate`, `vietnamesePhone`, and `fieldEvidenceMessageIds`.
- Browser text and presets are guaranteed controls. Browser recognition and device TTS are optional and always visibly controllable with replay and stop.
- A code, seat, or **Đã giữ vé** label is demo output only. The demo does not lock inventory, issue a real ticket, take payment, send messages, or start a live phone call.

## Architecture

```text
Passenger text / preset / optional microphone
                  │
                  v
      final message + deterministic booking rules
                  │
                  v
    shared transcript, booking facts, and evidence
                  │
         ┌────────┴────────┐
         v                 v
  automatic agent    customer-care employee
         └────────┬────────┘
                  v
     explicit confirmation → one demo booking code
```

The browser workspace is the active public transport. Realtime media, provider ASR/TTS, telephony, persistence, and LiveKit remain replaceable pilot seams and require separately recorded credentialed evidence.

## Interaction rules

1. Start a Web Call and select automatic or human mode.
2. In the public demo, a final `customer` message can update supported draft facts and append its ID to aggregate evidence; target pilot field-level provenance is separately specified.
3. Automatic mode proposes a trip and asks only for missing facts; human mode never sends an automatic reply.
4. When the public-demo readiness values exist, the summary asks for a supported confirmation phrase; the target pilot instead requires a persisted explicit confirmation event.
5. `Tôi xác nhận` produces a deterministic in-memory code once; repeating the confirmed draft returns the same result, without scoped API-idempotency semantics.
6. Switching to human mode preserves transcript and draft but stops future automatic replies.

## UI and accessibility

The desktop workspace presents passenger and staff surfaces side by side; mobile stacks them. Native labels, 44px targets, keyboard access, status text, visible focus, contrast-safe semantic colors, and reduced-motion behavior are required. Speech never starts without a user gesture.

## Verification

- Unit tests cover booking extraction, missing-field clarification, confirmation gate, and duplicate confirmation.
- Component tests cover auto/human isolation, takeover, text/preset fallback, and speech controls.
- Browser checks cover the full scenario, desktop/mobile layout, and absence of error overlays.
- Credentialed pilots are documented separately; no public release claim depends on them.
