# ADR 0005: Definition of Done

**Status:** Accepted

A feature is done only when its acceptance criteria have implementation and automated evidence; contracts/docs are current; lint, typecheck, unit, integration, browser smoke and production build pass; no secret appears in the diff; and review is complete.

For this repository, a release additionally requires a release manifest mapping every task AC to a commit/file/test, clean source tree, Vercel production deployment from the approved release SHA, and a post-deploy HTTP smoke test. Missing credentials or hosting access are documented as external blockers rather than hidden behind a claim of deployment success.
