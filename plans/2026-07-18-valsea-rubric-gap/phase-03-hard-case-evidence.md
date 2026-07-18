---
title: Phase 03 — Synthetic hard-case evidence
status: pending
priority: P1
effort: medium
plan: 2026-07-18-valsea-rubric-gap
---

# Phase 03 — Synthetic hard-case evidence

## Context

The historical `/engine` route was removed during the Alove migration. This phase
creates a new evidence-only surface deliberately; it does not restore browser
fallback or proxy production provider credentials.

## Deliverables

- Three committed synthetic/no-PII fixtures with provenance, ground truth and hash:
  tonal Vietnamese, dense VN–EN code-switch, and 8 kHz noisy telephone audio.
- `scripts/evaluate-valsea-hard-cases.ts` calls documented batch VALSEA and a
  Whisper baseline with `language=vi`, then writes a redacted result artifact.
- Pure Unicode-NFC WER/diff metrics plus English-token and tone-retention rates.
- New `/evidence` page renders fixture labels, diffs and comparison table from the
  committed artifact; it never receives API keys.

## Current touchpoints

- Fixtures: `apps/web/public/evidence/fixtures/`.
- Metrics: `apps/web/src/lib/evidence/wer.ts` + tests.
- Results: `plans/.../reports/hard-case-results.json` and a web-safe copy.
- UI: new `apps/web/src/app/evidence/page.tsx` and focused components.
- Navigation: current `AppShell`, added deliberately after tests.

## Checklist

- [ ] Generate three synthetic fixtures and provenance manifest.
- [ ] Implement/test WER, diff, English-token and tonal-diacritic metrics.
- [ ] Implement evaluation script with secret/PII redaction and fail-closed keys.
- [ ] Run both engines or record a truthful external blocker—never mock results.
- [ ] Build `/evidence` from committed, validated result JSON.
- [ ] Add unit and Playwright coverage.

## Acceptance

- All three synthetic fixtures are runnable and visibly labelled synthetic.
- Comparison uses the same audio input and `language=vi` for Whisper.
- Metrics/diffs are reproducible; any engine loss remains visible.
- Regional-accent rubric evidence stays unchecked until a consented real fixture exists.

## Out of scope

- Raw customer/call audio.
- Claiming synthetic speech proves regional accent accuracy.
- A production upload/transcription feature.
