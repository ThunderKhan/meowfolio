# Meowfolio Development Guide

Audience: contributors and AI coding assistants

## 1. Read before coding

Read in this order:
1. `context.md`
2. `docs/MVP.md`
3. `docs/PRD.md`
4. `docs/ARCHITECTURE.md`
5. the specific implementation doc for the area being changed
6. relevant ADRs

Do not infer product decisions from unfinished code when the docs state them explicitly.

## 2. Core engineering rules

- Keep the app client-only for MVP.
- Keep AI inference local.
- Do not add an LLM.
- Do not auto-identify a cat.
- Keep location optional.
- Avoid dependencies where browser/platform APIs are enough.
- Optimize the core loop before optional features.

## 3. Proposed stack

- React
- TypeScript
- Vite
- Tailwind CSS
- @huggingface/transformers
- IndexedDB
- browser Canvas API
- browser Geolocation API

Testing stack should be chosen during scaffold, keeping setup small.

## 4. TypeScript

Use strict TypeScript.

Prefer:
- explicit domain types,
- discriminated unions for states,
- `unknown` rather than `any` for external errors,
- narrow boundaries around model/runtime outputs.

Avoid:
- giant shared types file,
- type assertions used to silence uncertainty,
- leaking raw Transformers.js types through UI components.

## 5. State modeling

Model scan state explicitly.

Example:

```ts
type ScanState =
  | { type: "idle" }
  | { type: "photo-selected"; image: SelectedImage }
  | { type: "preparing-models"; phase: ModelPhase }
  | { type: "detecting" }
  | { type: "choose-cat"; detections: Detection[] }
  | { type: "embedding" }
  | { type: "possible-match"; candidate: CandidateMatch }
  | { type: "new-cat"; draft: CatDraft }
  | { type: "saving" }
  | { type: "saved"; catId: string }
  | { type: "error"; error: AppError }
```

Prefer explicit state transitions over many unrelated booleans such as:
`isLoading && isDetecting && !isMatching`.

## 6. AI boundary

UI imports project-owned AI functions.

UI should not:
- create raw pipelines,
- know ONNX tensor shapes,
- compute cosine similarity,
- know model URLs.

Centralize that under `src/ai/`.

## 7. Storage boundary

Components do not directly open IndexedDB.

Use repository functions:
- `createCatWithEncounter`
- `addEncounterToCat`
- `listCats`
- `getCatWithEncounters`

This keeps migrations and transactions out of JSX.

## 8. Browser API boundary

Wrap:
- geolocation,
- image decoding/cropping,
- storage estimation
in small testable utilities where useful.

Do not build abstract service frameworks.

## 9. Component policy

Create components when:
- repeated,
- interaction is nontrivial,
- accessibility behavior needs one source of truth.

Do not create:
- `BaseContainer`,
- `GenericWrapper`,
- abstraction layers with only one caller and no complexity benefit.

## 10. Naming

Use product language:
- Cat
- Encounter
- Scan
- CandidateMatch
- Collection
- ReferenceEmbedding

Avoid misleading:
- RecognitionResult
- IdentityConfidence
- Biometrics
unless the product genuinely changes.

## 11. CSS

Use design tokens from `DESIGN_SYSTEM.md`.

Do not:
- add random hex values in JSX,
- use inline styles for normal layout,
- add a second styling system.

## 12. Accessibility

Component PR/code review must check:
- semantic control,
- label,
- keyboard,
- focus,
- status announcement,
- touch target.

Accessibility bugs affecting core flow are not cosmetic.

## 13. Error handling

Convert external/runtime errors to project `AppError` codes at boundaries.

Do not make components inspect runtime exception text.

## 14. Logging

Development:
- concise console logs for model/runtime diagnosis are fine.

Production:
- avoid noisy logs,
- never log private image/location data to a remote service.

## 15. Tests

Prioritize:
- similarity math,
- reference update,
- IndexedDB transactions,
- scan-state decisions,
- user-critical components.

Do not chase coverage percentage.

## 16. Git

Prefer small meaningful commits.

Suggested prefixes:
- `feat:`
- `fix:`
- `docs:`
- `test:`
- `refactor:`
- `perf:`
- `chore:`

Do not mix major docs/architecture changes with unrelated UI polish when avoidable.

## 17. Branches

Solo hackathon default:
- `main` remains deployable,
- use short-lived feature branches for risky work if useful.

Do not introduce GitFlow overhead.

## 18. Dependency rule

Before adding a package, document:
- exact problem,
- why browser/native code is insufficient,
- bundle/runtime impact,
- license.

For a tiny utility, write the few lines locally when safer and clearer.

## 19. AI-generated code review

AI-generated code must be reviewed for:
- invented APIs,
- incorrect model output assumptions,
- privacy regressions,
- fake confidence logic,
- dependency bloat,
- error paths.

Never accept “it should work” for model tensor handling. Run it.

## 20. Definition of a completed implementation slice

A slice is done when:
- behavior works,
- failure state works,
- TypeScript passes,
- relevant tests pass,
- mobile layout checked,
- accessibility checked,
- docs updated if contract changed.
