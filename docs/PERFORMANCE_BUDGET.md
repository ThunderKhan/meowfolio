# Meowfolio Performance Budget

Status: engineering target, values must be measured

## 1. Why performance is product-critical

Meowfolio is used during a fleeting real-world encounter.

If a cat walks away while the app:
- downloads huge assets,
- freezes the UI,
- or takes too long to process,

the core experience fails.

Performance is therefore part of the MVP, not post-hackathon optimization.

## 2. Measurement rule

Never put unmeasured performance numbers in README or submission copy.

For every reported number record:
- device,
- browser/version,
- runtime provider,
- cold/warm state,
- model variant.

## 3. Core metrics

Measure:

### App shell
- initial JS/CSS transfer,
- time to useful collection UI.

### Models
- detector transfer size,
- embedder transfer size,
- first initialization,
- cached initialization.

### Inference
- cat detection latency,
- crop/preprocessing latency,
- embedding latency,
- similarity search latency,
- total photo-to-decision latency.

### Storage
- image resize output size,
- save latency,
- collection load latency.

## 4. Initial targets

These are engineering targets, not public claims.

### UI
- collection interface should appear without waiting for AI models.
- route transitions should feel immediate.
- model work should not block unrelated collection browsing.

### Scan flow
Target on intended demo hardware:
- warm detector inference: preferably < 2 seconds,
- warm embedding inference: preferably < 2 seconds,
- similarity search with MVP-scale collection: effectively immediate relative to inference.

If actual results are worse, prioritize clear status and reducing image/model cost over hiding latency.

## 5. Model loading budget

No fixed MB target is locked until exact model artifacts are inspected.

Decision rule:
- use the smallest variant that preserves useful output,
- prefer quantized/browser-appropriate weights where supported,
- do not introduce an LLM.

Model assets may dwarf the application bundle. Optimize where it matters.

## 6. Lazy loading

Required:
- do not initialize both AI models on collection page load.

Preferred:
- start model preparation when entering scan or immediately after the user selects/captures an image.

Possible optimization:
- after first intentional scan action, detector and embedder can initialize concurrently if memory/device behavior permits.

Measure before choosing concurrency.

## 7. Browser cache

Transformers.js supports browser Cache API use when available.

Assume:
- cache can improve later loads,
- browser eviction is possible.

Do not promise permanent caching.

## 8. Image preprocessing

Before inference:
- downscale unnecessarily huge camera photos,
- preserve enough resolution for detection,
- crop before embedding.

Before persistence:
- store a scrapbook-quality resized image rather than multi-megabyte original where practical.

Record chosen dimensions/quality after visual and AI testing.

## 9. Main-thread responsiveness

During model work:
- buttons/status should remain responsive,
- browser must not appear hung.

If measured jank is unacceptable:
1. profile,
2. identify whether preprocessing/inference is blocking,
3. consider Web Worker boundary.

Do not add worker architecture without a measured problem.

## 10. Similarity scale

Hackathon collections are small.

A linear scan across normalized 384-ish dimension vectors is likely sufficient for MVP.

Do not introduce:
- vector database,
- ANN index,
- backend search service.

Revisit only when collection size data proves a need.

## 11. Memory

Watch for:
- duplicate initialized models,
- tensors not disposed where runtime requires it,
- image bitmaps retained,
- unreleased object URLs,
- large originals stored unnecessarily.

Manual stress:
- perform at least 5–10 scans in one session,
- observe obvious degradation/crashes.

## 12. UI assets

Keep:
- icon system small,
- no autoplay video on app shell,
- no heavy animation framework solely for polish,
- no remote decorative imagery required for core experience.

## 13. Fonts

MVP uses system font stacks.

Reason:
- zero font network cost,
- privacy/simple deployment,
- fast outdoor first render.

Custom brand font can be reconsidered after submission.

## 14. Performance regression gate

Before merging a model/runtime change:
- compare cold load,
- warm inference,
- mobile behavior,
- result quality.

A “more accurate” model that makes mobile use impractical can be a product regression.

## 15. Submission evidence

If performance is discussed publicly:
use a table like:

| Measurement | Device | Browser | Provider | Result |
|---|---|---|---|---|
| Detector warm inference | TBD | TBD | TBD | TBD |
| Embedding warm inference | TBD | TBD | TBD | TBD |

Never prefill values before measurement.
