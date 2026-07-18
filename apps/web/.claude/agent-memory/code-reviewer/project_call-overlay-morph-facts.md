---
name: call-overlay-morph-facts
description: Verified framer-motion exit-callback semantics + design decisions for CallOverlay morph (phase 2 judge-demo)
metadata:
  type: project
---

Verified facts about `apps/web/src/components/bus-call/call-overlay.tsx` (reviewed 2026-07-18, framer-motion 12.42.2):

- `onLayoutAnimationComplete` does NOT fire on the exiting panel during close. On close the reverse morph runs on the newly promoted CTA button (lead); the callback is taken from the animating node's own props (motion-dom `create-projection-node.mjs:296,327`), and `stack.exitAnimationComplete()` only calls `safeToRemove` (`stack.mjs:69-74`). So the feared "start call during exit" race does not exist. Do not re-flag it without new evidence (rule: verified decisions stand).
- Interrupted open morph: the promoted button's `startAnimation` stops the panel's in-flight animation via `.stop()` which does NOT invoke onComplete (`finishAnimation` calls `completeAnimation` explicitly — stop alone is cancel semantics).
- Zero-key `/console`: text/preset dock is CSS-hidden by DESIGN — user explicitly confirmed ("khách chỉ quan sát"). e2e console.spec asserts this; not a bug.
- Per-instance `layoutId` (`call-cta-${layoutKey}`: hero/support/sticky) deviates from plan text ("one shared layoutId") but is intentional/simpler and satisfies "morph về đúng nút vừa bấm".
- Known pre-existing lint error: `call-stage.tsx` TypewriterCaption `react-hooks/set-state-in-effect` — out of scope for phase reviews, don't count as new.

**Why:** These took source-level verification of framer-motion internals; re-deriving wastes a review cycle and risks flip-flopping on a verified non-issue.
**How to apply:** When reviewing changes to call-overlay.tsx / bus-call-workspace.tsx morph or close paths, start from these invariants; only re-verify if framer-motion is upgraded past 12.x or the layoutId structure changes.
