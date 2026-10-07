# Meowfolio Documentation

This directory is the implementation handbook for **Meowfolio**.

Start with the repository-level [context.md](../context.md). It is the authoritative project context for humans and AI assistants. Then read the documents relevant to the work being done.

## 1. Product

| Document | Purpose |
|---|---|
| [MVP.md](./MVP.md) | Exact hackathon scope, acceptance criteria, cut order, and non-goals. |
| [PRD.md](./PRD.md) | Product requirements, personas, user stories, functional/non-functional requirements, risks. |
| [USER_FLOWS.md](./USER_FLOWS.md) | Canonical end-to-end interaction and failure paths. |
| [BACKLOG.md](./BACKLOG.md) | Prioritized P0–P3 execution backlog. |
| [TRACEABILITY_MATRIX.md](./TRACEABILITY_MATRIX.md) | Maps requirements to implementation areas and verification. |

## 2. UI / UX

| Document | Purpose |
|---|---|
| [UI_UX_SPEC.md](./UI_UX_SPEC.md) | Screen-by-screen UX, navigation, interaction rules, responsive behavior, outdoor use. |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Visual direction, color/type/spacing tokens, controls, imagery, motion. |
| [COMPONENT_SPEC.md](./COMPONENT_SPEC.md) | Reusable component behavior and accessibility contracts. |
| [CONTENT_GUIDE.md](./CONTENT_GUIDE.md) | Product voice, microcopy, AI uncertainty wording, privacy/error language. |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | WCAG-oriented implementation and manual test requirements. |

## 3. Engineering

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Browser architecture, AI pipeline, module boundaries, persistence, runtime decisions. |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Ordered build plan from feasibility spike through submission. |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Code conventions, boundaries, state modeling, testing and dependency policy. |
| [DATA_MODEL.md](./DATA_MODEL.md) | IndexedDB schema, records, invariants, transactions, migrations, model metadata. |
| [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Error taxonomy, stable error codes, recovery and UI behavior. |
| [BROWSER_SUPPORT.md](./BROWSER_SUPPORT.md) | Browser/capability tiers, WebGPU fallback and compatibility matrix. |
| [PERFORMANCE_BUDGET.md](./PERFORMANCE_BUDGET.md) | Measurement strategy, latency/load targets, memory and caching rules. |

## 4. AI

| Document | Purpose |
|---|---|
| [AI_EVALUATION.md](./AI_EVALUATION.md) | Detector validation, embedding pair tests, threshold methodology and model replacement rules. |
| [DEPENDENCIES_LICENSES.md](./DEPENDENCIES_LICENSES.md) | Runtime/model dependency register and licensing release blockers. |

## 5. Privacy, Testing & Release

| Document | Purpose |
|---|---|
| [PRIVACY_SECURITY.md](./PRIVACY_SECURITY.md) | Local data boundary, browser-storage threat model, XSS/location/privacy requirements. |
| [TEST_PLAN.md](./TEST_PLAN.md) | Unit, integration, AI, privacy, performance, browser and real-world field tests. |
| [DEPLOYMENT_RELEASE.md](./DEPLOYMENT_RELEASE.md) | Static deployment, release gate, model hosting, smoke tests and rollback. |
| [SUBMISSION_PLAN.md](./SUBMISSION_PLAN.md) | Hacktoberfest judging strategy, demo evidence and DEV article plan. |

## 6. Architecture Decision Records

See [adr/README.md](./adr/README.md).

Current accepted ADRs:
- [ADR-0001 — Local-First Browser Architecture](./adr/0001-local-first-browser-architecture.md)
- [ADR-0002 — Human-Confirmed Cat Identity](./adr/0002-human-confirmed-cat-identity.md)
- [ADR-0003 — Two-Stage Local Vision Pipeline](./adr/0003-two-stage-local-vision-pipeline.md)
- [ADR-0004 — IndexedDB Local Persistence](./adr/0004-indexeddb-local-persistence.md)

## 7. Research

[RESEARCH_REFERENCES.md](./RESEARCH_REFERENCES.md) records the external engineering/design guidance used to shape these documents.

## Reading paths

### AI coding assistant starting a feature
1. `context.md`
2. `MVP.md`
3. `PRD.md`
4. relevant ADR
5. relevant implementation spec
6. `TEST_PLAN.md`

### UI work
1. `UI_UX_SPEC.md`
2. `DESIGN_SYSTEM.md`
3. `COMPONENT_SPEC.md`
4. `CONTENT_GUIDE.md`
5. `ACCESSIBILITY.md`

### AI/model work
1. `ARCHITECTURE.md`
2. `AI_EVALUATION.md`
3. `PERFORMANCE_BUDGET.md`
4. `BROWSER_SUPPORT.md`
5. `DEPENDENCIES_LICENSES.md`

### Persistence work
1. `DATA_MODEL.md`
2. ADR-0004
3. `PRIVACY_SECURITY.md`
4. `ERROR_HANDLING.md`

## Authority order

When documents disagree:

1. Official Hacktoberfest challenge rules
2. `context.md`
3. Accepted ADRs for the decision they cover
4. PRD
5. MVP
6. Specific implementation specs
7. Current code

A code change that intentionally changes a documented contract must update the relevant documentation or create a superseding ADR.

## Current product thesis

> **Meowfolio — your personal scrapbook of the cats you meet outside.**

Core loop:

**go outside → photograph cat → local detection → local visual similarity → human confirms/name → save encounter → revisit scrapbook**

Do not trade this loop for a larger but shallower feature set.
