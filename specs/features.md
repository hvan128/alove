# Feature Specification — VéĐi

## F-01: Two-sided Web Call

`/console` shows `Phía khách hàng` and `Nhân viên chăm sóc` together. Start/end state and elapsed time are shared. Copy explicitly states that the demo runs in one browser.

## F-02: Human and automatic modes

The mode selector offers `Nhân viên` and `Agent tự động`. Human mode never sends an automatic reply. Auto mode responds after each final customer message. Switching to human stops later automation and keeps current state.

## F-03: Guaranteed customer input

Customer text and four ordered demo presets always work. Browser speech recognition may provide Vietnamese interim/final text when supported. Unsupported or denied recognition never blocks the demo.

## F-04: Deterministic booking agent

The agent supports Sài Gòn → Đà Lạt, 1–6 passengers, evening travel, static trip proposals, passenger name/phone and explicit confirmation. Unknown input produces one safe clarification. Replies remain compact enough for speech.

## F-05: Human customer care

Staff can send a text reply, speak it through device TTS, use a suggested response and take over from auto mode. Staff sees the same transcript and current booking facts.

## F-06: Evidence-backed draft

Origin, destination, date, passenger count, selected trip and passenger data retain customer-message IDs. Missing required values keep the draft in `collecting` or `awaiting_confirmation`.

## F-07: Confirmation invariant

Booking confirmation requires selected trip, passenger count, passenger name, valid Vietnamese mobile number, enough seats and explicit customer/staff action. Repeated confirmation reuses one booking code.

## F-08: Audible reply

Agent/staff replies can use `speechSynthesis` with `vi-VN`. Audio follows a user-triggered flow, has visible replay/stop controls, and degrades to readable text.

## F-09: LiveKit pilot seam

This release does not use or claim LiveKit. Pilot architecture uses a server-only token endpoint, LiveKit room transport and a named agent worker after credentials exist. Booking intelligence remains transport-independent.

## F-10: Design system

`/design-system` documents VéĐi semantic colors, type, buttons, inputs, mode/status controls, conversation bubbles and booking facts. Console remains responsive and reduced-motion safe.

