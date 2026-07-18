# Product Vision Maturity Rewrite Design

**Date:** 2026-07-18  
**Status:** Approved for documentation update

## Goal

Rewrite `specs/product-vision.md` so it remains an aspirational product vision while clearly separating three maturity levels:

1. current `main` prototype;
2. credentialed pilot;
3. target operator platform.

The document must explain the intended product without implying that provider-backed voice, durable booking, catalog operations, seat inventory or enterprise operations are already live.

## Source of truth

The rewrite uses:

- `specs/features.md` for target requirements;
- `docs/current-vs-target-architecture.md` for current implementation evidence and gaps;
- current `main` source for runtime behavior;
- existing trust, deployment and release documents for pilot boundaries.

`specs/features.md` remains the detailed feature contract. Product Vision stays concise and does not duplicate its full acceptance matrix.

## Information architecture

### Product purpose and users

Keep VéĐi positioned as a Vietnamese intercity bus-booking voice workflow. Preserve passenger, customer-care, dispatcher and administrator outcomes. Add security/data ownership where pilot readiness depends on consent, access and retention decisions.

### Current truth

State that current `main` supports a local/public two-surface prototype with deterministic booking extraction, evidence, suggestions, Human/Auto switching and a confirmation gate. Describe LiveKit, VALSEA and Neon as code-ready integration paths until a credentialed smoke record proves them.

### Maturity model

Describe each level with explicit entry and exit meaning:

- **Current main:** public/local fallback, sample data, no real inventory or issued ticket claim.
- **Credentialed pilot:** two-device LiveKit, VALSEA-first audio, durable persistence, difficult-audio evidence, authenticated staff and safe confirmation.
- **Target operations:** incoming queue and ownership, audited delegation, enterprise dashboard, published catalog, seat layout and conflict-safe holds.

### Success journey

Show target journey as a sequence from incoming call through staff acceptance, delegated Agent assistance, evidence-backed field filling, catalog-bound trip selection, seat hold, explicit confirmation and idempotent booking issuance. Mark steps not present on current `main` as target behavior.

### Product principles

Retain current safety principles and make these boundaries explicit:

- staff acceptance and ownership precede Agent delegation;
- reply authority differs from confirmation authority;
- only final caller evidence changes booking facts;
- published catalog and inventory, never LLM output, determine trip, fare and seats;
- provider or persistence failure blocks success claims and degrades to Human/text flow;
- raw audio is not retained by default.

### Measurable outcomes

Add metrics suitable for pilot exit decisions:

- critical booking-field accuracy;
- final transcript and reply latency;
- suggestion acceptance/edit rate;
- Human takeover and provider fallback success rate;
- duplicate/conflicting booking issuance count;
- seat-hold conflict correctness;
- completion rate without blocking review items.

Metrics receive no invented targets. Customer and sample-specific thresholds belong in pilot planning.

### Gaps and exclusions

Name current gaps without turning Product Vision into backlog detail: incoming acceptance/ownership, delegation audit, credentialed difficult-audio evidence, durable confirmation/idempotency, catalog publishing, seat inventory/holds, operations dashboard, roles and retention automation.

Keep exclusions until independently verified: payment, external operator-synchronized inventory guarantee, PSTN/SIP, Zalo raw-call audio, SMS delivery and autonomous confirmation.

## Scope

Only `specs/product-vision.md` changes during implementation. No contracts, runtime behavior, feature status or deployment claims change.

## Acceptance criteria

- Reader can distinguish current prototype, credentialed pilot and target operations without consulting another document.
- Current `main` capability is not overstated.
- Target success journey still communicates ambitious product direction.
- Terminology matches `specs/features.md`: Human/Agent authority, VALSEA-first, evidence, published catalog, seat hold, explicit confirmation and scoped idempotency.
- Metrics are measurable but contain no fabricated baseline or target.
- Exclusions remain explicit.
- Markdown has no placeholders, broken relative links or internal contradictions.

## Verification

- Review diff against current Product Vision and Feature Specification.
- Scan for `TODO`, `TBD` and unsupported live/production claims.
- Run `git diff --check`.
- Confirm only intended documentation files enter implementation diff.
