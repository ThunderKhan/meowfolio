# Meowfolio Technical Architecture

Status: Proposed implementation baseline for Hacktoberfest MVP

## 1. Architecture objective

Meowfolio should be a **static, browser-first, local-first web application**.

For the MVP, the application should not require:
- an application server,
- a cloud database,
- authentication,
- hosted AI inference.

The browser owns:
- image capture,
- AI inference,
- similarity calculation,
- persistence,
- optional geolocation,
- rendering.

## 2. High-level flow

```text
Real-world cat
      │
      ▼
Camera / file input
      │
      ▼
Browser image preprocessing
      │
      ▼
YOLOv10n local detection
      │
      ├── no cat ──> retry
      │
      ▼
Selected cat crop
      │
      ▼
DINOv2-small local embedding
      │
      ▼
Normalize vector
      │
      ▼
Cosine similarity vs local cat references
      │
      ├── plausible match ──> user confirms/rejects
      │
      └── no match ────────> new cat
      │
      ▼
Optional geolocation + note
      │
      ▼
IndexedDB
      │
      ▼
Private scrapbook / encounter history
```

## 3. Client stack

Proposed baseline:
- React
- TypeScript
- Vite
- Tailwind CSS
- Transformers.js
- Browser IndexedDB
- Browser Canvas API
- Browser Geolocation API

No global state library is required initially.

Prefer:
- component state,
- focused hooks,
- a small app-level context only if multiple screens genuinely need it.

## 4. Module boundaries

### UI layer
Responsibilities:
- pages/views,
- forms,
- loading states,
- error states,
- scrapbook presentation.

Must not contain model-specific tensor logic.

### AI layer
Responsibilities:
- model loading,
- detection,
- crop handoff,
- embedding,
- normalization,
- similarity scoring.

Expose stable project-owned interfaces so the UI does not depend directly on model internals.

Suggested interface shape:

```ts
type Detection = {
  label: string
  score: number
  box: { x: number; y: number; width: number; height: number }
}

detectCats(image: ImageSource): Promise<Detection[]>
embedCat(image: ImageSource): Promise<Float32Array>
cosineSimilarity(a: Float32Array, b: Float32Array): number
findCandidateCats(embedding: Float32Array): Promise<CandidateMatch[]>
```

### Persistence layer
Responsibilities:
- IndexedDB schema,
- transactions,
- data migrations,
- CRUD,
- binary image storage,
- typed-array storage.

UI components should call domain/repository functions rather than opening IndexedDB directly.

### Domain layer
Responsibilities:
- Cat and Encounter types,
- rules for creating/confirming encounters,
- reference embedding update,
- timestamps,
- validation.

## 5. AI model architecture

## 5.1 Detection model

Current model:
`onnx-community/yolov10n`

Use it for:
- cat class detection,
- bounding boxes,
- confidence.

Do not use it for:
- individual identity,
- breed claims,
- personality inference.

### Detection selection

If zero cats:
- return a recoverable no-cat result.

If one:
- select it.

If several:
- show the detected regions and let the user choose.

Avoid automatically taking the highest confidence cat if that could save the wrong animal.

## 5.2 Feature model

Current model:
`Xenova/dinov2-small`

Use the selected crop to obtain a visual representation.

The exact pooling/output extraction must be validated during the spike and documented in code. Do not assume every output tensor is an appropriate embedding.

After selecting the representation:
1. convert to a stable `Float32Array`,
2. L2-normalize,
3. store the normalized vector.

## 5.3 Similarity

Cosine similarity for normalized vectors reduces to dot product:

```text
similarity(a, b) = a · b
```

Do not expose raw scores as “same-cat probability.”

### Candidate policy

A candidate should be presented only if:
- its score exceeds the empirically selected suggestion threshold,
- and, if testing shows it useful, it is sufficiently separated from the next candidate.

The user remains the final identity decision.

## 5.4 Reference embedding

MVP strategy:

Each Cat stores one `referenceEmbedding`.

For a brand-new cat:
- reference = first confirmed encounter embedding.

For each user-confirmed repeat:
- update the reference as a running average of confirmed normalized embeddings,
- normalize the resulting vector again.

Conceptually:

```text
newReference = normalize(
  oldReference * previousEncounterCount + newEmbedding
)
```

A more precise implementation can store an unnormalized running sum, but only add complexity if required.

All encounter embeddings should remain available for future experimentation.

## 6. Model lifecycle

Use a `ModelManager`-style module with states such as:
- idle,
- downloading,
- loading,
- ready,
- error.

Models should be loaded lazily when the user first enters the scan flow rather than blocking the landing/collection view.

### Caching

Rely on the model/runtime/browser caching mechanisms during the MVP, then verify behavior empirically.

Do not claim “downloads once forever.” Browser cache can be evicted.

Product copy should say:
> “The model is downloaded on first use and can be reused from browser cache.”

## 7. Execution provider

Preferred:
- WebGPU where supported and stable for the chosen model/runtime.

Fallback:
- WASM/CPU when supported.

The model layer should choose the provider centrally so components do not care.

Runtime/provider information may be shown in a small diagnostics area during development.

## 8. Main thread vs worker

Start the feasibility spike with the simplest supported inference path.

If profiling shows model loading/inference causes unacceptable UI jank:
- move the AI service behind a Web Worker boundary,
- pass image data/transferables,
- keep the same project-owned AI interface.

Do not introduce worker complexity before measuring the problem.

## 9. Image pipeline

Input sources:
- camera-enabled file input,
- normal file chooser.

Processing:
1. decode image,
2. correct/display orientation as browser decoding permits,
3. optionally downscale for detector performance,
4. run detection,
5. map box coordinates correctly to source/display dimensions,
6. crop selected cat with modest padding,
7. pass crop to embedding pipeline,
8. store an appropriately sized image Blob for scrapbook display.

Avoid storing enormous original images when a high-quality resized version is enough for the product.

## 10. IndexedDB design

Database name:
`meowfolio`

Initial schema version:
`1`

### Store: cats

Key:
`id`

Suggested record:

```ts
type CatRecord = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  firstSeenAt: number
  lastSeenAt: number
  encounterCount: number
  coverEncounterId: string
  referenceEmbedding: Float32Array
  note?: string
}
```

Indexes:
- `createdAt`
- `lastSeenAt`
- optionally normalized `name` if search is added.

### Store: encounters

Key:
`id`

Suggested record:

```ts
type EncounterRecord = {
  id: string
  catId: string
  timestamp: number
  imageBlob: Blob
  embedding: Float32Array
  detectionConfidence: number
  note?: string
  location?: {
    latitude: number
    longitude: number
    accuracy: number
  }
}
```

Indexes:
- `catId`
- `timestamp`
- compound index only if actual queries need it.

### Store: settings

Small key/value records for:
- onboarding completed,
- schema metadata,
- optional diagnostics/preferences.

## 11. ID generation

Use browser-native `crypto.randomUUID()`.

No UUID dependency is necessary.

## 12. Transactions

When creating a new cat:
- write Cat and first Encounter in a single read-write transaction when practical.

When confirming a repeat:
- add Encounter and update Cat metadata/reference in a single transaction.

This avoids scrapbook records pointing to missing encounters.

## 13. Location architecture

Location is optional and requested at save time or immediately before, not on app launch.

Use:
`navigator.geolocation.getCurrentPosition`

Store only when permission succeeds.

Failure/denial:
- proceed without location.

No public endpoint receives exact coordinates in the MVP.

If a private map is added later, it reads from local encounter records.

## 14. Privacy boundary

### Data allowed to leave device
For the MVP, network activity may include:
- static app assets,
- model/runtime assets from their hosting source,
- normal deployment analytics only if explicitly introduced and privacy-reviewed.

### Data that should not leave by default
- captured cat images,
- embeddings,
- names,
- notes,
- encounter history,
- precise coordinates.

Before submission, verify this with browser devtools Network inspection while performing a scan.

## 15. Security considerations

This is local personal data, but basic hygiene still matters:
- never interpolate user names/notes as HTML,
- use React escaping,
- validate imported data if export/import is later added,
- revoke temporary object URLs,
- do not log coordinates/images to remote telemetry,
- do not persist unnecessary EXIF metadata if images are re-encoded.

## 16. Offline behavior

MVP requirement:
- local data survives offline/reload.

Not required:
- first-ever AI use while offline.

Nice-to-have:
- PWA app shell and cached model assets after successful first load.

Do not let PWA work delay the core flow.

## 17. Deployment

The app should deploy as static assets.

Acceptable targets include:
- GitHub Pages,
- Cloudflare Pages,
- Vercel static deployment,
- similar static hosting.

Choose based on:
- HTTPS,
- correct SPA handling,
- WebGPU/browser compatibility,
- asset size limits,
- easy updates.

A backend is not justified for the MVP.

## 18. Performance strategy

Measure:
- detector model load time,
- embedder load time,
- detector inference time,
- embedding time,
- total scan-to-decision time,
- memory behavior after repeated scans.

Optimizations in order:
1. avoid loading models before needed,
2. resize input,
3. crop before DINOv2,
4. use supported quantized model variants,
5. use WebGPU,
6. avoid duplicate model initialization,
7. consider worker isolation if jank remains.

Do not prematurely optimize scrapbook rendering while inference is the actual bottleneck.

## 19. Failure modes

### Model download failure
Show:
- what failed,
- retry,
- network hint.

### Unsupported runtime/provider
Try fallback; otherwise explain requirements.

### No cat
Keep selected image and offer retry/new image.

### Multiple cats
Ask user to select.

### Storage quota
Show a clear failure and do not claim save succeeded.

### Corrupt/missing local data
Fail gracefully per record rather than crashing the whole collection.

### Location denial
Save normally without coordinates.

## 20. Architecture decision record

Current MVP decisions:
- static client-only architecture,
- local AI,
- cats only,
- no LLM,
- no backend,
- IndexedDB,
- optional geolocation,
- human-confirmed identity,
- detector + feature model split,
- similarity retrieval rather than automatic recognition.

Any proposal that changes one of these should state:
- problem,
- evidence,
- migration cost,
- privacy impact,
- deadline impact.
