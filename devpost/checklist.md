---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. A real cat photo can run through the local AI pipeline**
  Becomes usable: A runnable React/Vite app with a development spike screen where a real photo can be selected, model download consent is explicit, cat detections are returned from the worker, a selected cat crop can be embedded, and the app displays non-sensitive timing/provider diagnostics.
  Why now: This is the project's critical technical risk and unique kernel. It proves the browser-local detector → crop → embedding path before we invest in the scrapbook around it; bootstrapping belongs inside this slice.
  PRD ref: `prd.md > F2 — Model Preparation and Local Processing`, `prd.md > F3 — Detection and Cat Selection`, `prd.md > F7 — Real-World Proof and Conservative Matching`
  Spec ref: `spec.md > Model Asset Manager`, `spec.md > AI Worker and Protocol`, `spec.md > Model Adapters and Embedding Space`, `spec.md > Feasibility Spike and Verification`
  Build: Scaffold React + TypeScript + Vite + Tailwind; pin the runtime/tooling; add Vitest; implement the typed worker/client protocol, consent-aware model asset boundary, detector/embedder adapters, image decode/crop path, embedding normalization/cosine primitives, and a development-only spike view. Start with the agreed YOLOv10n and DINOv2-small candidates, recording exact artifacts/revisions rather than floating references. Verify license and runtime network behavior before calling the detector releasable.
  Verify (mechanical): Run typecheck, Vitest, and production build; run focused tests for vector normalization/cosine, request-generation stale-result rejection, and asset-permit rules. In a real Chromium run, process at least one cat photo and record whether detector/crop/embedding complete, provider used, actual network requests, model initialization, and warm second-scan timings. Do not mark real Android/WebGPU proof from mocks.
  Learner check: Open the spike on your Android Chrome using the stable test origin when available, choose a real cat photo, and confirm you see a sensible cat crop and a completed embedding result without the UI freezing or any photo upload.
  Commit: `feat: prove local cat vision pipeline`

- [ ] **2. You can scan a photo and reach the correct human identity decision**
  Becomes usable: The real scan flow works from welcome/collection → photo preview → preparation → detection → multi-cat selection when needed → embedding → first-cat, no-suggestion, or possible-familiar-face decision, with manual existing-cat fallback.
  Why now: It turns the technical spike into the approved product interaction while the AI boundary is still fresh, and exposes UX/cancellation problems before persistence makes them harder to untangle.
  PRD ref: `prd.md > The Core Journey`, `prd.md > F1 — Welcome and Photo Preview`, `prd.md > F2 — Model Preparation and Local Processing`, `prd.md > F3 — Detection and Cat Selection`, `prd.md > F4 — Identity Decision and Manual Selection`, `prd.md > F5a — Back, Discard, and Scan-Session Recovery`
  Spec ref: `spec.md > App Shell and Navigation`, `spec.md > Scan Session and Input Validation`, `spec.md > Image Preparation`, `spec.md > Similarity and Reference Strategy`
  Build: Implement the scan reducer/orchestration and scrapbook visual foundation; preserve selected photo/details on Back; invalidate stale request IDs; serialize worker jobs; render no-cat and multi-cat recovery; show one conservative suggestion at most; keep scores hidden; implement the existing-cat picker and intentional first-cat naming path. Use the approved warm 6/10/20-second UI behavior.
  Verify (mechanical): Run typecheck, tests, and production build; add reducer/client tests covering Back, discard, stale worker results, first-cat state, no-suggestion state, multi-cat selection, and 10/20-second recovery transitions. Exercise the flow in desktop Chrome with controlled worker results plus the real spike path.
  Learner check: Try the scan flow on your phone with one single-cat photo and one multi-cat/no-cat case. Check that the crop/identity screens feel clear outdoors and that Back never loses the selected photo unexpectedly.
  Commit: `feat: add human controlled scan flow`

- [ ] **3. A confirmed encounter saves exactly once and survives reopening**
  Becomes usable: A new cat or manually/AI-confirmed existing cat can be saved locally with its photo, encounter embedding, optional note, optional location, and atomic cat/reference updates; reopening retains it.
  Why now: Persistence is the product's first durable payoff and the place where retry/idempotency and centroid correctness can silently corrupt history if left late.
  PRD ref: `prd.md > F5 — Encounter Save and Optional Location`, `prd.md > F5a — Back, Discard, and Scan-Session Recovery`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > IndexedDB Repository and Idempotent Save`, `spec.md > Optional Location`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Implement native IndexedDB schema/repository, stable IDs, atomic new/repeat saves, exact referenceEmbeddingSum/count/reference updates for compatible spaces, incompatible-space history saves without reference mutation, 40-grapheme name validation, encounter-only notes, 8-second optional geolocation timeout, save-without-location, same-ID retry, and save-failure preservation.
  Verify (mechanical): Run typecheck, Vitest, production build, and browser IndexedDB integration tests covering atomic new/repeat saves, duplicate retry, transaction failure, exact centroid math, incompatible embedding spaces, duplicate names, and location timeout/denial. Reload the app and verify saved records/photos remain.
  Learner check: Save a new cat, close/reopen the app, then add a repeat encounter. Confirm the encounter count changes once, the history survives reload, and denying location never blocks Save.
  Commit: `feat: persist cats and encounters locally`

- [ ] **4. The scrapbook makes saved cats and their histories worth returning to**
  Becomes usable: The collection is image-first and each cat has a calm scrapbook detail page with cover photo, name, encounter count, first/last seen, encounter photos, notes, and collapsed private-location details.
  Why now: With trustworthy persistence in place, this slice exposes the emotional payoff of the product without introducing features outside the PoC.
  PRD ref: `prd.md > F6 — Collection and Cat History`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Scrapbook and Detail Views`, `spec.md > Look and Feel`
  Build: Implement empty collection, photo-first cards, same-name disambiguation, cat detail/history, object-URL cleanup, location disclosure, and the approved warm paper / muted green / restrained terracotta visual system with large touch targets, focus states, reduced motion, and mobile-first layouts.
  Verify (mechanical): Run typecheck, tests, and production build; add focused rendering/repository tests where valuable and selective Playwright coverage for collection → detail → disclosure using labelled fixtures. Verify no model initialization/network request occurs merely by browsing saved cats.
  Learner check: Browse a few saved cats on your phone and open one with multiple sightings. Confirm it feels like a personal scrapbook rather than an AI dashboard, and that the primary Spot a cat action remains obvious.
  Commit: `feat: build the cat scrapbook experience`

- [ ] **5. Familiar-face suggestions are enabled only if the evidence supports them**
  Becomes usable: A reproducible evaluation tool/report compares first-only and centroid references, supports absent-query negatives, freezes a single threshold/strategy before holdout evaluation, and controls whether automatic suggestions are enabled.
  Why now: The product already works manually, so matching can now be judged honestly without pressure to fake the kernel. This slice decides whether the optional familiar-face assist is safe enough to ship.
  PRD ref: `prd.md > F7 — Real-World Proof and Conservative Matching`
  Spec ref: `spec.md > Similarity and Reference Strategy`, `spec.md > Precision-First Field Trial`, `spec.md > Spike Outputs, Not Pretense of Locked Artifacts`
  Build: Add the evaluation path and public-safe evidence format; run development/reference photos for roughly 8–12 known cats and 40–60 photos when supplied; compare first-only vs exact centroid, choose/freeze one global conservative threshold from development data, then evaluate untouched holdouts and absent-query negatives. Enable suggestions only if the agreed precision-first gate is satisfied; otherwise leave manual matching fully usable and record matching as unproven.
  Verify (mechanical): Run typecheck/tests/build; verify the evaluator never includes a query in its own reference, never compares incompatible spaces, reports correct/abstain/wrong outcomes plus nearest competing similarity, and uses the frozen policy for held-out evaluation. Inspect aggregate evidence for private photos/coordinates before commit.
  Learner check: Review the held-out summary and try several known and unfamiliar cats in the app. Confirm that wrong familiarity is not being hidden and that manual selection remains straightforward when the AI abstains.
  Commit: `feat: gate familiar cat suggestions on evidence`

- [ ] **6. The production Android loop is deployable, recoverable, and demonstrably complete**
  Becomes usable: Meowfolio runs from a stable Vercel HTTPS origin on Android Chrome, handles model-download/cold-start/warm recovery correctly, keeps scrapbook data across reopen and frontend redeploy, and has public-safe evidence for the final demo.
  Why now: Deployment and outdoor proof should validate the finished loop, not become a substitute for implementing it. This is where measured reality replaces the remaining evidence-gated assumptions.
  PRD ref: `prd.md > F2 — Model Preparation and Local Processing`, `prd.md > F5a — Back, Discard, and Scan-Session Recovery`, `prd.md > F7 — Real-World Proof and Conservative Matching`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Production-Origin Verification`, `spec.md > Performance and Recovery Gates`, `spec.md > External Services and Dependencies`
  Build: Finalize model manifest/provider/license decisions from evidence, remove or isolate development-only spike surfaces, add selective Playwright recovery-flow checks where useful, document actual package/model/device/browser versions and timings, prepare Vercel static settings and README, verify model/network privacy behavior, and record the separate outdoor Android new/repeat/reopen proof without publishing private cat photos or coordinates unintentionally.
  Verify (mechanical): Run the full typecheck/test/build suite; audit production network requests; verify Vercel build output; on the stable production origin perform consent/download, cold reopen, warm scan, new save, repeat save, close/reopen, and a frontend redeploy while confirming IndexedDB cats/encounters/photos remain. Record actual 6/10/20 warm behavior and 30/60 download + 20/30/60 cold-start observations.
  Learner check: Use Meowfolio outside on your Android phone for the complete capture → process → decide → save → reopen loop and report anything confusing, slow, or broken before final review.
  Commit: `chore: prepare verified Meowfolio proof of concept`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after Slice 2, learner tries the real scan/identity flow on Android before persistence and scrapbook work continue
- [ ] Final kick-the-tires exploration and feedback completed — after Slice 6 on the stable production origin

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: 
Route and stops: 
Edit outcome: 
Reflection: 
Activity mode: 

## Revisions
