---
title: Phase 06 — Canonical docs and rubric evidence
status: completed
priority: P1
effort: small
plan: 2026-07-18-valsea-rubric-gap
---

# Phase 06 — Canonical docs and rubric evidence

## Context

The Alove migration already removed the historical console/engine/demo code. This
phase does not restore deleted roadmaps or perform another cleanup pass; it aligns
canonical documentation and challenge evidence with what actually shipped.

## Canonical scope

- `README.md`, `docs/architecture.md`, `docs/deployment.md`.
- `specs/product-vision.md`, `specs/features.md`, `specs/api-contracts.md`.
- ADR 0009 and a new ADR only if annotation/event/evidence decisions require it.
- New `docs/rubric-checklist.md` plus regenerated HTML evidence artifact.

## Checklist

- [x] Map every rubric criterion to status, timestamp, evidence and file:line.
- [x] Mark only live/manual verified claims ✅; use partial/blocked otherwise.
- [x] Record Phase 00 endpoint evidence and Phase 01–05 shipped behavior.
- [x] Keep regional-accent proof open if only synthetic audio exists.
- [x] Remove stale `/v1/understand`, `/engine`, old identity/branch and deleted-doc claims from HTML.
- [x] Update canonical docs/specs for new contracts/envs/routes only.
- [x] Run agent tests plus root lint/typecheck/test/e2e/build.

## Acceptance

- A reviewer can trace each checked claim to current Alove code or timestamped report.
- No canonical doc presents a dated plan path as current runtime behavior.
- README commands work from a clean checkout.

## Out of scope

- Restoring deleted `docs/pilot-roadmap.md` or historical OrderVoice material.
- Turning intended work into evidence without a passing artifact.
