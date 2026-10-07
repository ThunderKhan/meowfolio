# Meowfolio Implementation Plan

Date: 7 October 2026  
Submission deadline: 11 October 2026, 11:59 PM PDT  
Internal target: **feature-complete by the end of 10 October; 11 October is for field testing, fixes, demo, and writing.**

## 1. Delivery strategy

Build vertically.

Do not spend a day building every screen and only then test whether browser AI works. The first milestone is a deliberately ugly end-to-end technical spike:

> image → cat detection → crop → DINOv2 embedding → cosine similarity

If this fails on realistic hardware, everything else is secondary.

## 2. Proposed implementation baseline

Use unless a feasibility test exposes a concrete blocker:

- **React + TypeScript**
- **Vite**
- **Tailwind CSS** for fast responsive UI
- **Transformers.js** for browser model loading/inference
- **IndexedDB** using a small project-owned wrapper around the browser API
- Browser **Canvas API** for image resizing/cropping
- Browser **Geolocation API** for optional location
- No backend
- No authentication
- Static deployment

Keep dependencies intentionally small. Every dependency must directly reduce hackathon risk or enable the local-AI requirement.

## 3. Repository shape

Target structure:

```text
meowfolio/
├─ context.md
├─ README.md
├─ docs/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  └─ routes/
│  ├─ components/
│  │  ├─ capture/
│  │  ├─ collection/
│  │  ├─ cat/
│  │  └─ common/
│  ├─ ai/
│  │  ├─ detector.ts
│  │  ├─ embedder.ts
│  │  ├─ similarity.ts
│  │  ├─ model-manager.ts
│  │  └─ types.ts
│  ├─ db/
│  │  ├─ indexed-db.ts
│  │  ├─ cats.ts
│  │  └─ encounters.ts
│  ├─ domain/
│  │  ├─ cat.ts
│  │  └─ encounter.ts
│  ├─ hooks/
│  ├─ lib/
│  │  └─ image.ts
│  ├─ styles/
│  └─ main.tsx
└─ tests/
```

Do not create abstractions merely to match this tree. Use the smallest structure that keeps AI, persistence, and UI concerns separated.

---

# Phase 0 — Documentation and bootstrap

## Deliverables
- [x] `context.md`
- [x] `docs/MVP.md`
- [x] `docs/PRD.md`
- [x] planning documents
- [ ] project scaffold
- [ ] README skeleton
- [ ] license decision held until detector/model licensing is verified

## Bootstrap tasks
- [x] Initialize Vite React TypeScript project.
- [x] Add Tailwind.
- [x] Add Transformers.js.
- [x] Add test tooling.
- [ ] Add lint/format scripts.
- [x] Add a minimal CI workflow if it does not distract from core work.
- [ ] Add application shell and mobile viewport behavior.

### Exit condition
The app builds, runs, and deploys as an empty shell.

---

# Phase 1 — AI feasibility spike — highest priority

## 1.1 Detector spike

Implement the smallest page/script that can:
- [x] load a verified browser-supported detector (`Xenova/yolos-tiny`, replacing unsupported YOLOv10n),
- [x] accept a local image,
- [x] run object detection,
- [x] filter for cat detections,
- [ ] render boxes on a preview,
- [ ] log latency,
- [x] record model download behavior,
- [x] record browser/device used.

Test:
- clear close cat,
- distant cat,
- no cat,
- multiple cats,
- partially occluded cat.

### Stop/go decision
If this exact model cannot run acceptably in target browsers, investigate a smaller compatible detector **before** building product UI.

Do not hide a model failure with a fake result.

**Slice 1 result:** the initial YOLOv10n candidate failed the real Chromium gate because Transformers.js 4.3.0 does not support its `yolov10` model type. It was replaced with `Xenova/yolos-tiny` pinned to `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`; the WASM `uint8` detector then passed real cat detection. DINOv2-small at `a5406bdfce9ac07eb3dc08dd05cbea034f4648d8` passed crop → 384-D normalized CLS-token embedding in the same browser test.

## 1.2 Image crop

- [x] Convert selected image to a browser-friendly bitmap.
- [x] Use detector coordinates to crop the selected cat with Canvas.
- [ ] Add a modest padding around the box.
- [ ] Resize to the feature model's expected processing path.
- [ ] Dispose temporary bitmap/object URLs where appropriate.

## 1.3 Embedding spike

- [x] load `Xenova/dinov2-small`,
- [x] process the cat crop,
- [x] extract one stable feature vector (first CLS token from `last_hidden_state`),
- [x] verify expected vector shape (384),
- [x] L2-normalize,
- [ ] log inference time.

## 1.4 Similarity spike

Implement cosine similarity.

Test:
- same photo vs itself,
- same cat / similar angle,
- same cat / different angle,
- different similar-looking cat,
- obviously different cat.

Create a small local test matrix with:
- image pair,
- expected relationship,
- measured score.

### Do not do yet
Do not choose the final matching threshold from intuition.

### Phase 1 exit condition
On at least one realistic browser/device:

> photo → cat crop → embedding → similarity score

works reliably and the measured performance is acceptable for a hackathon demo.

---

# Phase 2 — Domain model and persistence

## 2.1 Define domain types

### Cat
- id
- name
- createdAt
- updatedAt
- coverEncounterId
- referenceEmbedding
- optional note/tags

### Encounter
- id
- catId
- timestamp
- imageBlob
- embedding
- detectionConfidence
- optional note
- optional location

### Settings
- schemaVersion
- model/runtime preferences if needed
- onboarding state

## 2.2 IndexedDB

Create stores:
- `cats`
- `encounters`
- `settings`

Required operations:
- [ ] create cat,
- [ ] update cat,
- [ ] list cats,
- [ ] get cat,
- [ ] delete cat only if UI exposes it,
- [ ] add encounter,
- [ ] list encounters for cat,
- [ ] list reference embeddings efficiently enough for MVP.

## 2.3 Reference embedding strategy

Start simple:
- first confirmed encounter establishes a reference,
- after a user confirms repeat encounters, update the reference as a normalized running mean of confirmed encounter embeddings.

This improves the representation over time without claiming formal re-identification.

### Phase 2 exit condition
Create data manually, reload the page, and recover the same collection and images from IndexedDB.

---

# Phase 3 — End-to-end capture flow

Build the actual product loop.

## 3.1 Collection home
- [ ] empty state,
- [ ] “Spot a cat” primary action,
- [ ] saved cat cards,
- [ ] model/privacy status messaging kept subtle.

## 3.2 Capture
- [ ] mobile camera/file input,
- [ ] preview,
- [ ] retake/change image,
- [ ] processing CTA.

Prefer HTML file input with `accept="image/*"` and camera capture hints over building a custom camera stack unless testing proves that insufficient.

## 3.3 Detection states
- [ ] loading detector,
- [ ] detecting,
- [ ] no cat,
- [ ] one cat,
- [ ] multiple cats selector,
- [ ] error/retry.

## 3.4 Match decision
- [ ] generate embedding,
- [ ] rank existing cats,
- [ ] present strongest plausible candidate,
- [ ] cautious wording,
- [ ] “same cat” confirmation,
- [ ] “new cat” path.

If no candidate passes the test-derived threshold, skip the match prompt.

## 3.5 New cat
- [ ] name input,
- [ ] optional note,
- [ ] optional geolocation request,
- [ ] save cat + first encounter atomically enough for MVP,
- [ ] confirmation screen/card.

## 3.6 Repeat cat
- [ ] add encounter,
- [ ] update reference embedding,
- [ ] update cover photo only by an intentional rule,
- [ ] show updated encounter count.

### Phase 3 exit condition
A new user can complete the entire loop without developer tools or manual database edits.

---

# Phase 4 — Scrapbook experience

## Collection
- [ ] responsive card grid,
- [ ] cover image,
- [ ] name,
- [ ] encounter count,
- [ ] first-seen date.

## Detail
- [ ] hero/cover,
- [ ] name,
- [ ] first seen,
- [ ] encounter count,
- [ ] notes,
- [ ] chronological encounter timeline.

## Emotional polish
Use:
- paper/sticker/scrapbook cues,
- tactile but restrained micro-interactions,
- warm copy.

Avoid:
- fake rarity systems,
- casino-like rewards,
- Pokémon visual imitation,
- heavy dashboards.

### Exit condition
The scrapbook itself is pleasant enough that the user wants to revisit it.

---

# Phase 5 — Privacy, resilience, and mobile polish

## Privacy
- [ ] local-processing copy visible.
- [ ] location requested only when useful.
- [ ] denied geolocation does not break save.
- [ ] no public exact-location UI.
- [ ] inspect network panel during inference and document what model assets are fetched.

## Runtime resilience
- [ ] capability detection for WebGPU where useful.
- [ ] supported fallback path tested.
- [ ] model errors can be retried.
- [ ] model loading does not trap the user on a blank screen.
- [ ] no stale object URLs or obvious memory leaks during repeated scans.

## Mobile
Test:
- [ ] touch target size,
- [ ] portrait viewport,
- [ ] long cat names,
- [ ] photo orientation,
- [ ] browser back/reload behavior,
- [ ] camera/file chooser.

### Exit condition
The app is demo-safe on the actual device intended for the outdoor video.

---

# Phase 6 — Field calibration and testing

## Similarity calibration
Use a small labeled set:
- same-cat positives,
- different-cat negatives,
- visually similar negatives.

Record score distributions.

Choose a conservative suggestion threshold that minimizes embarrassing false matches.

If separation is poor:
1. do not fake confidence,
2. show candidates less aggressively,
3. rely more heavily on user selection,
4. consider top-k candidate UI,
5. only then consider a model/pipeline change.

## Real-world test
Take the deployed application outside.

Test:
- [ ] direct sunlight,
- [ ] imperfect framing,
- [ ] distant cat,
- [ ] moving cat,
- [ ] mobile network first model download,
- [ ] cached second use,
- [ ] location denied,
- [ ] location accepted.

Capture screenshots/video evidence during this phase.

---

# Phase 7 — Submission readiness

## README
Must explain:
- what Meowfolio is,
- why it fits Touch Grass,
- local AI architecture,
- exact models,
- privacy,
- how to run locally,
- limitations,
- licensing/notices.

## Demo
Record:
1. leave/being outside,
2. spot real cat,
3. capture,
4. local detection,
5. possible match/new cat,
6. name/save,
7. scrapbook,
8. repeat encounter or similarity example,
9. privacy/local processing explanation.

## DEV post
Follow `SUBMISSION_PLAN.md`.

---

# 4. Suggested day plan

## 7 Oct
- documentation,
- scaffold,
- detector spike starts.

## 8 Oct
- finish detector + DINOv2 feasibility,
- similarity tests,
- IndexedDB.

## 9 Oct
- complete end-to-end capture/save flow,
- collection/detail.

## 10 Oct
- mobile polish,
- privacy/error states,
- field calibration,
- deployment.

## 11 Oct
- outdoor test,
- bug fixes only after a practical freeze,
- screenshots/demo recording,
- README,
- DEV article.

## 12 Oct IST morning
Emergency buffer only. The official deadline corresponds to midday in India; do not plan primary development here.

---

# 5. Definition of done

Engineering is done when:
- [ ] MVP checklist passes,
- [ ] tests relevant to core logic pass,
- [ ] real mobile field test passes,
- [ ] deployed build is accessible,
- [ ] browser network inspection supports the privacy claims,
- [ ] model/runtime licenses are documented,
- [ ] no known demo-blocking bug remains,
- [ ] submission assets exist.

## Final rule

When choosing between:
- one more feature, or
- making the capture → local AI → scrapbook loop faster, clearer, and more reliable,

choose the loop.
