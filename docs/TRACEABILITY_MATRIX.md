# Meowfolio Requirements Traceability Matrix

Purpose: connect product requirements to implementation ownership and verification so AI assistants do not implement isolated features without their failure/test requirements.

## Core matrix

| Requirement | Source | Implementation area | Verification |
|---|---|---|---|
| Capture/select photo | PRD FR-01 | capture UI + image utility | mobile/file manual test |
| Local cat detection | PRD FR-02 | `src/ai/detector` | detector fixture + field test |
| No-cat recovery | PRD FR-03 | scan state + Error/NoCat UI | component/manual |
| Multi-cat selection | PRD FR-04 | detection overlay/cards | keyboard + image test |
| Local embedding | PRD FR-05 | `src/ai/embedder` | vector shape + runtime test |
| Similarity | PRD FR-06 | `src/ai/similarity` | unit + labeled pair evaluation |
| Human identity confirmation | PRD FR-07 | match-decision state | end-to-end test |
| Manual naming | PRD FR-08 | new-cat form | form test |
| IndexedDB save | PRD FR-09 | db repositories | integration |
| Persistence | PRD FR-10 | IndexedDB | reload/reopen |
| Optional location | PRD FR-11 | geolocation utility | grant/deny tests |
| Collection | PRD FR-12 | collection view | integration/manual |
| Cat detail | PRD FR-13 | detail view | integration/manual |
| Model state UX | PRD FR-14 | model manager + status UI | cold-load manual |
| Privacy explanation | PRD FR-15 | scan/about copy | review + network verification |
| No hosted photo inference | NFR/privacy | AI architecture | Network panel |
| Responsive mobile use | NFR-03 | all UI | 320px + real phone |
| Runtime fallback | NFR-04 | model manager | browser matrix |
| Recoverable failures | NFR-05 | error layer | error test table |
| Honest similarity | NFR-06 | copy + AI layer | content review |
| Accessibility | NFR-07 | all UI | accessibility checklist |
| First-load transparency | NFR-08 | model preparation | cold-cache manual |

## Cross-cutting contracts

### AI
Docs:
- `AI_EVALUATION.md`
- `ARCHITECTURE.md`

Every AI change must consider:
- quality,
- performance,
- browser support,
- license,
- uncertainty wording.

### Persistence
Docs:
- `DATA_MODEL.md`
- `PRIVACY_SECURITY.md`

Every schema change must consider:
- migration,
- transactions,
- storage quota,
- user data preservation.

### UI
Docs:
- `UI_UX_SPEC.md`
- `DESIGN_SYSTEM.md`
- `COMPONENT_SPEC.md`
- `ACCESSIBILITY.md`

Every new screen/component must consider:
- empty/loading/error,
- keyboard/focus,
- touch,
- responsive state.

### Release
Docs:
- `TEST_PLAN.md`
- `DEPLOYMENT_RELEASE.md`
- `SUBMISSION_PLAN.md`

## Definition

A requirement is not “implemented” merely because the happy-path component exists.

It is complete when its corresponding verification path passes.
