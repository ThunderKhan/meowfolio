---
doc: spec
status: approved
---

# Meowfolio — Technical Spec

## How This Works, In Plain Language
React holds the current scan and renders the scrapbook. A dedicated worker loads and reuses the local vision models so long-running model work does not occupy the UI thread. A small asset manager checks actual cached files and permits model downloads from pinned Hugging Face revisions only during an explicitly authorized download operation.

The detector finds cats; the person selects a crop when necessary. DINOv2 turns that crop into a normalized vector. The app compares that vector only with compatible references from saved cats. A suggestion never assigns identity: the person selects an existing cat or names a new one, then explicitly saves.

One IndexedDB transaction saves the encounter and updates its cat. Retrying the same encounter cannot add it twice. Saved encounters survive reopening; unfinished scans live only in memory. A cat's compatible confirmed encounters contribute equally to a reference sum; normalizing that sum gives the matching reference. Different embedding spaces remain separate.

This locks a small client-only architecture and an evidence-gated feasibility process. It does not claim that untested artifacts, workers, providers, or matching thresholds work already.

## The Core Journey Through the System
Implements `prd.md > The Core Journey` and F1–F7, including F5a.
1. App reads the welcome preference and saved collection without loading AI. React renders welcome/collection.
2. File/camera input supplies a photo. An in-memory scan session owns the source image, preview URL, timestamp, stable encounter ID, and eventual form values.
3. Find the cat checks model availability through the worker's asset manager. Missing files lead to preparation explanation; no download is authorized yet.
4. Download models & continue grants an operation-scoped download permit. The manager obtains missing pinned files, the worker initializes models, and progress/stage messages update React. Cached initialization is a distinct operation and needs no download consent.
5. A request generation identifies detection work. The worker returns detections; one proceeds directly, several pause for crop selection, none returns the recoverable no-cat state.
6. The selected crop is embedded in the worker. The main thread compares the small normalized vector against compatible stored cat references. No saved cats means the intentional first-cat naming state; no useful candidate means normal manual identity choices.
7. The person confirms identity, enters a new-cat name if needed, and optionally supplies an encounter note/location. Scan-session data survives Back.
8. Repository save commits the encounter and derived cat changes together. Only transaction completion produces success. Return to collection/detail or keep walking.
9. Back invalidates active results immediately. Discard clears the scan after confirmation. Successfully saved records remain; unfinished scans are never database drafts.

## Stack
Learner-approved baseline; exact compatible package versions must be selected and locked at scaffold/spike, not invented here.

| Choice | Purpose and documentation |
| --- | --- |
| React + TypeScript | Familiar typed UI; component state/reducer, no added global-state library. [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/) |
| Vite | Static client build, worker bundling, development server. [Guide](https://vite.dev/guide/) |
| Tailwind CSS | Styling with a small project-owned token layer. [Vite integration](https://tailwindcss.com/docs/installation/using-vite) |
| @huggingface/transformers | Browser model loading/inference, with verified cache/fetch controls. [Docs](https://huggingface.co/docs/transformers.js), [environment](https://huggingface.co/docs/transformers.js/api/env) |
| Native IndexedDB | Two record stores, transactions and indexes through a small project-owned wrapper; no database dependency. [API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) |
| Dedicated Worker | Model lifecycle/inference off the UI thread; small typed protocol. [API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) |
| Canvas / image APIs | Orientation-aware decoding, resizing and selected crop preparation. [Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API), [ImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap) |
| Geolocation | Explicitly requested optional location, no reverse geocoder. [API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) |
| Cache API | Actual asset presence, separate from scrapbook records. [API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) |

No backend, authentication, networking framework, component framework, animation library, or persistent-draft system. Verification uses TypeScript checking, Vitest for vector/session/domain logic and browser-capable IndexedDB integration tests, plus selective Playwright flows where browser automation adds value. Mocked browser tests never substitute for real Android inference evidence.

## Where It Runs and How Someone Tries It
- Release-validation target: learner's Android phone, current Chrome. Record phone model, Android/Chrome versions, tested provider and model manifest for evidence.
- Development: Windows Chrome. Use a Node version supported by the pinned Vite/runtime toolchain and document it when scaffolding.
- Planned scripts: `npm ci` after a lockfile exists; `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`, then open `http://localhost:5173`. `npm run build` creates `dist/`. These are the intended scaffold contract; no application or scripts exist yet.
- USB development proposal: with Android debugging authorized, `adb reverse tcp:5173 tcp:5173`, then Android Chrome opens `http://localhost:5173`. This gives a localhost secure context for capability testing; availability of the learner's ADB setup is unconfirmed.
- Static HTTPS host: **Vercel**, serving the Vite app/static assets only. Connect the GitHub repository, select the Vite preset, production branch `main`, build command `npm run build`, output directory `dist`. No Vercel Functions, backend API, authentication or server-side database. Model assets still come from approved pinned Hugging Face sources after consent; inference and scrapbook data remain in the browser.
- Use the stable Vercel production URL as the canonical Android/outdoor testing origin. Preview deployments may help development but are not interchangeable persistence environments. Record the actual production URL after deployment; no deployment has been performed during planning. Merely serving a LAN IP over HTTP is not an adequate plan for secure-context APIs.
- Localhost and deployed origins have separate collections and caches; no migration/export is promised. No PWA/offline-shell promise: cached weights do not guarantee the application itself loads offline.
- Record the normal Android new/repeat/reopen loop and publish appropriate repo/demo evidence for the Hacktoberfest DEV target. Follow that event's submission requirements; curriculum shipping rules do not silently replace them.

### Production-Origin Verification
On the same production Vercel origin: consent/download → process a real cat → save → close/reopen → verify scrapbook persistence → verify cached-model behavior. Then deploy a frontend update to that same production origin and confirm existing cats, encounters and image data remain intact. Frontend updates must not clear IndexedDB or reset it as initialization logic. Apply any database version changes deliberately; model cache changes do not authorize deleting scrapbook data. Browser eviction remains possible and missing model assets still require consent.

## Look and Feel
Implements `prd.md > Look and Feel` and F6.
Use CSS custom properties and project-owned styling for a **late-1990s/2000s pink pixel scrapbook**: candy-pink checkerboard canvas, cream/pale-pink panels, deep plum readable text, hot-pink primary actions, square/beveled controls, 2px borders, pixel-offset shadows, faux window-title chrome, tiny badges/stickers, and monospace/bitmap-adjacent system typography with no external font request. Cat photography remains dominant. Decorative motion stays restrained and reduced-motion-safe; avoid brand/trade-dress imitation.
Use native semantic controls, visible focus, labelled inputs/errors and progress announcements, responsive one-column scan surfaces and photo-first collection layout. Respect reduced motion. No UI scores or model metrics in the scrapbook; development measurements belong to the spike tool/report.

## Components

### App Shell and Navigation
Implements `prd.md > F1 — Welcome and Photo Preview`, `F6 — Collection and Cat History`, and `F5a — Back, Discard, and Scan-Session Recovery`.
React renders collection, detail, and scan surfaces. Keep a welcome-completed preference separate from AI readiness (a small localStorage flag is a derived implementation choice; failure to persist it must not block use). Model work is lazily imported/started when needed, never on initial collection rendering.
Use a scan reducer with explicit states: preview, preparation-consent, preparing, detecting, select-cat, embedding, identity, existing-picker, details, saving, success, recoverable-error. A generation token guards every asynchronous continuation, including geolocation and save UI updates. Route deliberate app Back/Cancel through scan actions; Android/browser Back handling must follow the same within-scan/discard distinction. Proposed lightweight History API adapter avoids a routing dependency.

### Scan Session and Input Validation
Implements `prd.md > F1 — Welcome and Photo Preview`, `F4 — Identity Decision and Manual Selection`, `F5 — Encounter Save and Optional Location`, and `F5a — Back, Discard, and Scan-Session Recovery`.
Memory only: source photo, generated preview/crop URLs, detected subjects, selected crop, embedding with space metadata, identity decision, new-cat draft name/ID, encounter ID/timestamp, note, location, request generation and errors. Back retains inputs; changing identity retains the draft name but never uses it to rename an existing cat. Changing photo invalidates old detections/embedding and must not reuse a previous identity confirmation for the new subject.
Generate encounter ID once per scan and a new-cat ID once for that new-cat choice; preserve them across retries. A completed transaction freezes that encounter's identity/payload for idempotent retrieval. Disable duplicate submission while a commit is in flight; do not offer a misleading discard of a transaction already committing.
Names: trim outer whitespace, require non-empty, maximum 40 user-perceived characters. Proposed implementation uses `Intl.Segmenter` grapheme segmentation on the target Chrome, not UTF-16 string length, to handle Unicode/emoji predictably. Render names/notes as text, not HTML. Duplicate names are valid. No profanity filter. Note length remains unrestricted by an invented product rule.
On discard, release image resources and clear the session; do not delete cached weights. No IndexedDB draft writes. Close/reload may lose unfinished work.

### Image Preparation
Implements `prd.md > F1 — Welcome and Photo Preview` and `F3 — Detection and Cat Selection`.
Use native file inputs for camera/file selection, browser decoding and canvas resizing. Validate decoding and nonzero dimensions before inference; a bad image offers replacement, preserving the scan UI. Keep source image coordinates, decoded orientation and resized detector coordinates explicit so boxes map correctly. Clamp boxes to valid bounds; never embed an invalid or empty crop.
Select resize limits and saved-photo encoding after measuring phone memory/quality in the spike. Store a usable full encounter image and its selected-cat crop (or equivalent crop metadata), not only a transient object URL, so histories remain meaningful and future explicit re-embedding is possible. Saved display images may be resized/re-encoded; retaining original camera bytes/EXIF is not required. This is distinct from any optional geolocation record.
Test transferable ImageBitmap/buffer handoff; transferring detaches ownership, so retain the session source Blob and close consumed bitmaps/revoke URLs when no longer needed. Main-thread Canvas can handle display previews; AI-side preprocessing/postprocessing belongs with the worker where supported.

### Model Asset Manager
Implements `prd.md > F2 — Model Preparation and Local Processing`.
Hugging Face hosts pinned assets. Manifest records local version, exact model IDs/revisions, dtype/variant, required configs/processors/ONNX files and external tensor files, tested provider paths, and known sizes when reliable. Never release floating `main` model references. Package lock pins the runtime; changing an artifact creates a new manifest/cache identity.
Read actual versioned entries from the runtime's browser cache. Prefer native Transformers.js caching; use its custom match/put hook only if needed. No `modelsDownloaded` setting is authoritative. Inspect the exact pinned implementation's cache naming/key behavior rather than assuming it.
All required cached entries present → cached-only loading is allowed. Missing entry → explanation and download consent. The runtime fetch hook must deny model network requests unless there is an active explicit download permit for the current manifest/operation. Use an allowlist of manifest asset requests; authorization must not accidentally cover an old cancelled operation or arbitrary URLs. Cached assets becoming unavailable after the pre-check must fail closed and return a typed missing-assets/consent-required result. Do not silently retry over the network.
Back/discard revokes permission for new network work immediately; abort in-flight downloads where supported. Completed cache entries may remain. Reinitializing from cache does not require download consent. Cache writes may fail/eviction may occur; never claim readiness for a future session based solely on a previous download.
Audit runtime WASM binaries, module loading, external ONNX data, redirects and optional config probes too. The current docs expose env.fetch, useBrowserCache, useCustomCache and customCache, but that is not proof all provider-network paths use that hook. Prefer bundling compatible runtime support files with the static app; record actual requests during testing and resolve any uncontrolled AI downloads before acceptance. Do not invent size estimates or sum progress with double-counted retries.

### AI Worker and Protocol
Implements `prd.md > F2 — Model Preparation and Local Processing`, `F3 — Detection and Cat Selection`, and `F5a — Back, Discard, and Scan-Session Recovery`.
One session-lived dedicated worker owns model instances, loading, detector/embedding inference, and AI preprocessing/postprocessing. Serialize jobs; avoid overlapping heavy inference or model initialization. A newer scan can invalidate/remove queued stale work but cannot assume an active kernel is interruptible. Bound pending work instead of accumulating photos in a queue.
Small discriminated-union protocol, derived from the learner's suggested messages:
- UI → worker: CHECK_ASSETS, LOAD_MODELS, DETECT_IMAGE, EMBED_CROP, CANCEL_REQUEST, DISPOSE.
- Worker → UI: ASSET_STATUS, MODEL_PROGRESS, MODELS_READY, PROCESSING_STAGE, DETECTIONS, EMBEDDING_RESULT, ERROR.
- Include requestId/generation, manifest version, and worker-instance generation where relevant; progress/loading operations also carry IDs. Typed errors distinguish missing-assets consent, decode failure, initialization failure, inference failure and unavailable provider.
Detection and embedding are separate requests because the person may need to select a cat. The main thread applies results only to the current scan generation and expected state. Worker-side cancellation invalidates queued work and uses verified abort support where available. Otherwise let an operation finish and discard the result. Normal Back does not terminate the worker. Terminate/recreate only for a stuck/broken worker or explicit recovery; model reinitialization is then a separate visible cost.
Prefer WebGPU only if capability and actual initialization/inference succeed. Test supported WASM execution inside the worker as well; provider fallback must respect required-artifact download consent and memory cleanup. Do not silently add another set of weights. If worker WebGPU fails but another execution path works, measure responsiveness and return for a learner-approved adjustment instead of forcing architecture purity.

### Model Adapters and Embedding Space
Implements `prd.md > F2 — Model Preparation and Local Processing`, `F3 — Detection and Cat Selection`, and `F7 — Real-World Proof and Conservative Matching`.
Verified Slice 1 detector: `Xenova/yolos-tiny` at revision `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`, using `uint8` on the verified WASM path and `fp16` as the WebGPU candidate. The original `onnx-community/yolov10n` candidate was rejected after real-browser testing showed Transformers.js 4.3.0 does not support its `yolov10` model type. Embedder: `Xenova/dinov2-small` at revision `a5406bdfce9ac07eb3dc08dd05cbea034f4648d8`, using `uint8` on the verified WASM path. Its bare model has no pooler output; Meowfolio takes the first CLS token from `last_hidden_state` (384 values) and L2-normalizes it. WebGPU behavior, Android timing, and standard-vs-quantized separation remain later evidence gates.
Adapters expose project-owned detection and embedding types rather than model tensors to React. Reject malformed, non-finite, wrong-dimension and zero-norm vectors; do not treat them as a successful comparison. L2-normalize valid encounter embeddings before storage/matching.
EmbeddingSpace includes exact model ID, revision, artifact/variant/dtype, preprocessing version, embedding dimension, and output/pooling/transformation version. Use a stable canonical space key for compatibility. A library upgrade affecting preprocessing/output requires investigation and a space-version change when semantics change. Matching never compares incompatible spaces just because dimensions agree.
The YOLOv10n AGPL-3.0 release blocker is resolved by not shipping that candidate. The current detector is the Transformers.js-compatible YOLOS-tiny conversion, whose upstream `hustvl/yolos-tiny` model is Apache-2.0. Final notices must still record the exact conversion/source and installed dependency licenses; detector quality and Android performance remain evidence gates.

### Similarity and Reference Strategy
Implements `prd.md > F4 — Identity Decision and Manual Selection` and `F7 — Real-World Proof and Conservative Matching`.
Compare normalized query against compatible references; compute cosine similarity, choose only the strongest candidate, and show it only at/above the evaluated single global threshold. A tie/ambiguous case may abstain rather than assert a winner; exact tie handling is a conservative implementation detail. Ranking is internal; UI exposes neither score nor probability.
Default strategy: normalized running centroid, with exact stored sum. First encounter: sum = e, count = 1, reference = e. Compatible confirmed repeat: sum += e; count += 1; reference = normalize(sum). AI suggestion alone never changes a reference. If a valid reference cannot be derived (e.g. non-finite or effectively zero sum), mark it ineligible for matching without manufacturing a vector; preserve valid encounter history.
Compare centroid with first-compatible-encounter-only in the field trial. For first-only mode, select the earliest compatible confirmed encounter, not the normalized centroid. Maintaining the sum does not force using it for suggestions. Strategy and threshold live in a versioned matching policy tied to tested embedding space, with suggestions disabled until evidence permits enabling them.
Manual choice always includes incompatible cats. Save such an encounter and normal history fields but leave the old reference sum/count/vector and its space metadata untouched. Do not silently replace the reference. Automatic migration/re-embedding is deferred.
Learner-authorized release fallback: disable automatic suggestions if neither simple strategy meets the precision-first gate. Local detection, embeddings, manual identity and scrapbook still work; state that matching is unproven. Disabled suggestions use the ordinary manual decision surface, not a false claim that a comparison positively identified anything.

### IndexedDB Repository and Idempotent Save
Implements `prd.md > F5 — Encounter Save and Optional Location` and `F6 — Collection and Cat History`.
Native wrapper owns database opening/versioning, transactions, indexes and repository queries. Two stores only: cats and encounters. UI never opens transactions directly. Blobs/typed vectors use structured cloning, not base64 strings or JSON-encoded images.
Prepare validated payloads/images before starting the write transaction; do not await unrelated network/model work inside it. For a save, use one read-write transaction spanning both stores:
1. Read encounterId first. If already committed, verify it belongs to the same intended immutable save and return that existing successful result; never add to the sum/count again. A conflicting ID/payload is a recoverable error, not permission to overwrite.
2. For a new cat, create its stable ID record with the first reference and cover encounter. For a repeat, read the latest stored cat within this transaction.
3. Add the encounter; update count, firstSeenAt/lastSeenAt bounds, updatedAt, and compatible reference fields. Keep the first cover encounter for the PoC (derived default, no cover editing).
4. Success waits for transaction completion, not individual request success. Abort rolls back both records. Surface quota/unavailable errors without raw exceptions and retain session values for retry.
Concurrent saves are serialized by read-write transactions over the same stores; recompute from the cat read in the transaction to avoid lost updates. No unique index on names. A retry reuses the same stable ID; a new scan gets a new one.

### Optional Location
Implements `prd.md > F5 — Encounter Save and Optional Location` and `F6 — Collection and Cat History`.
Call Geolocation only on explicit Add location. Store latitude, longitude, accuracy and observation timestamp when available. Use an 8-second acquisition timeout; Save without location remains possible while waiting, not only after timeout. Generation tokens prevent late callbacks from adding data after discard, save-without-location or a different scan.
History shows Location saved as a small native disclosure, with coordinates and accuracy collapsed by default. No maps, reverse geocoding or external lookup. Denial/failure retains all form data and saving remains available.

### Scrapbook and Detail Views
Implements `prd.md > F6 — Collection and Cat History`.
Repository reads cats and indexed encounters, displays images through managed object URLs, and uses saved counts/dates. Cat cards: photo/name/count/last-seen. Detail: cover/name/count/first-last dates and chronological encounter history with encounter-only notes/location. Same-name picker entries add dates/counts to photos for disambiguation. No model readiness prerequisite for browsing.
Read errors are distinct from a genuinely empty collection; do not present storage failure as an empty scrapbook. Revoke object URLs when views unload or records change. Never display similarity metadata as scrapbook content.

## Data Model
All proposed fields below implement approved behavior; identifiers and schema names are implementation details.

### Cat Record — cats, keyPath id
`id`, `name`, `createdAt`, `updatedAt`, `firstSeenAt`, `lastSeenAt`, `encounterCount`, `coverEncounterId`, `referenceEmbeddingSum`, `referenceEmbeddingCount`, `referenceEmbedding`, `embeddingSpace`.
Reference sum can use Float64Array for accumulated values; normalized embeddings/references can use Float32Array. Each vector length must equal its space dimension. `referenceEmbeddingCount <= encounterCount`; differing values are expected after incompatible manually confirmed sightings. No cat-level note. Cover points to an owning encounter rather than duplicating its photo blob.

### Encounter Record — encounters, keyPath id
`id`, `catId`, `timestamp`, `savedAt`, `photo` Blob, selected-cat crop Blob and/or crop geometry with source dimensions, `embedding`, `embeddingSpace`, `detection` (box, score, detector model/revision/variant), optional `note`, optional `location` (latitude, longitude, accuracy, timestamp).
Index by catId and by [catId, timestamp] for history. Photos and embeddings belong to the encounter; cat reference vectors belong to the cat. Exact image encodings/limits are measured spike choices. Timestamp is fixed for the scan rather than regenerated on retries; location has its own acquisition time.

### Persistent versus Ephemeral Data
IndexedDB: committed cats/encounters only. Cache API: versioned model files and approved runtime support assets, never proof of a successful encounter. Small welcome preference: localStorage. Memory: unfinished scan, initialization instances, transient photo URLs and request tokens. Build-time manifest/policy: pinned artifacts, embedding space and evaluated strategy/threshold. No silent embedding migrations.

## Performance and Recovery Gates
Implements `prd.md > F2 — Model Preparation and Local Processing` and `F7 — Real-World Proof and Conservative Matching`.
With models initialized, normal single-cat photo: Find the cat to identity decision includes detection, crop handling, embedding, similarity, worker messaging and UI handoff.
- 0–6 seconds: target.
- 6–10 seconds: acceptable for PoC but below target quality.
- At 10 seconds while unfinished: This is taking longer than expected; Keep waiting / Cancel and go back. Keep waiting does not extend the original deadline.
- At 20 seconds: fail the UI request, invalidate its generation immediately, retain photo, offer Try again / Choose another photo / Back. A result after the deadline cannot advance the UI. This is not a guarantee of forcibly cancelled computation.
- Routinely over 10 seconds: pipeline not proven; revisit artifact, resize limit or provider before polish.
Record first download, post-download initialization, cached initialization after reopening, and warm detection/embedding/similarity/total separately for every tested provider. Warm total includes queue delays; do not label a queued old computation as a fast new scan. Exclude human multi-cat selection time and report it separately. The download inactivity and cold-initialization clocks below are separate from the warm 20-second deadline.

### Download Progress and Stall Recovery
Show **Downloading local AI models**. An actively progressing download has no hard total timeout. Show transferred bytes and a total/percentage only when trustworthy; otherwise use transferred bytes or indeterminate progress, never invented percentages.
- After approximately 30 seconds without observable download progress: **This download seems to be taking longer than expected**, with **Keep waiting**, **Try again**, and **Back**.
- After approximately 60 seconds without progress: invalidate the attempt, revoke its network permit, abort where supported, and show **The model download stopped making progress.** Actions: **Try again** / **Back**.
- Actual observed transfer progress resets the inactivity clock. Keep waiting alone does not reset it. A status heartbeat is not evidence that bytes are arriving. Verify progress observability in the pinned runtime; instrument the authorized response path minimally if needed rather than treating silence from an unobservable transport as proof that bytes stopped.
- Retry first inspects actual cache entries and reuses completely downloaded, valid required assets. Do not deliberately redownload those files or promise byte-range/partial-file resume without evidence. Missing assets still require an explicit authorized download operation.
- Back returns to preview with the photo intact; completed cached files remain. Ignore stale progress/completion messages and do not let a cancelled attempt consume a newer attempt's download permit.

### Cold Initialization and Restart Recovery
After all required assets are available locally, initialization has its own timer:
- Up to 20 seconds: desired cold-start range.
- 20–30 seconds: slow but acceptable for the PoC.
- At 30 seconds: **Local AI is taking longer to start than expected.** Actions: **Keep waiting**, **Restart AI**, **Back**.
- At 60 seconds: invalidate that initialization generation and show **Meowfolio couldn’t start the local AI.** Actions: **Try again** / **Back**. A late MODELS_READY cannot advance the UI. Keep waiting does not extend the original 60-second boundary.
Restart AI / retry may terminate and recreate the worker, unlike normal Back. Inspect the cache before loading: complete assets mean initialization-only retry with network guarded; missing assets return to explicit download consent. An initialization failure never by itself justifies redownloading weights. Neither preparation failures nor worker restarts modify scrapbook IndexedDB data.
Measure download bytes/elapsed time/stalls/retries, first initialization after download, cached initialization after browser reopen, and worker creation → models ready for each tested provider. If worker creation includes a download, annotate that end-to-end measurement and also retain the separate initialization-only measurement. These are UX/recovery targets, not observed model performance.

## Feasibility Spike and Verification
Implements `prd.md > F7 — Real-World Proof and Conservative Matching` and all acceptance-critical boundaries.
Build the technical spike before most UI, with developer-only metrics clearly separate from final app screens. It must use the same adapters, worker and asset manager intended for the app.
1. Pin candidate runtime and model revisions/artifacts; inventory licenses and full required files. Record model/download sizes rather than guessing.
2. Detect a real photo, verify crop geometry, extract/normalize the intended DINOv2 output and compute similarity in Windows Chrome.
3. On actual Android Chrome, test worker WebGPU and supported worker WASM: initialization, both models, progress, image transfer, output, invalidation during inference, and second-scan model reuse. Measure memory pressure qualitatively where exact measurements are unavailable; record crashes/tab eviction and limits honestly.
4. Compare supported quantized/standard embedding variants on speed, initialization, size and resulting separation. Lock artifacts only after results; changing vector semantics changes embedding space.
5. Consent test: empty cache and no authorization → zero model downloads; authorize → cache/init; recreate worker with network blocked → cached init succeeds; delete one required cached file → consent required, no silent refetch. Also delete between pre-check and load. Test Back revocation, incomplete cache and fallback-artifact downloads.
6. Verify save rollback, same-ID retry without double count/sum, duplicate names, incompatible-space manual save, and reference update only on committed human-confirmed encounters.
7. Verify Android warm timing bands, stale result rejection, discard/back, optional-location failure, normal new/repeat/save/reopen journey, and request logs for no photo/embedding uploads.
No mock inference can satisfy the kernel's feasibility gate. Simulated failures may verify recovery but must be labelled as such.

### Precision-First Field Trial
Use roughly 8–12 known cats and 40–60 real photos, approximately 4–6 usable photos per cat. Select a manageable subset with distinctive cats, similar colors/patterns, and different poses, angles, distances, lighting and backgrounds. The total is a planning target, not a requirement to use every available cat.

Separate chronological or otherwise independent capture groups before analysis. Example: 10 cats × 5 photos = 30 development/reference photos (A1–A3 per cat) and 20 held-out queries (A4–A5). Avoid near-duplicate bursts split across development and holdout; record actual grouping rather than claiming chronological independence where it does not exist. Use development photos to establish references, compare strategies and tune one conservative threshold. Holdout photos remain untouched until the strategy/threshold and preprocessing/artifacts are fixed.

For each development query, use only eligible earlier confirmed reference encounters; never include the query in its own reference. For the final held-out check, freeze references built from development photos and do not add held-out queries to them while scoring. For different-cat negatives, the photographed cat must not be an eligible reference identity in that negative case. Alongside enrolled-repeat tests, run a predeclared excluded-identity gallery test using held-out photos: remove that query cat's reference, leave competing cats, and check abstention. Report these negative cases separately from repeat queries; correlated reuses are not additional independent photos.
Record per query and per first-only/centroid strategy: reference encounter IDs, correct-cat similarity where applicable, highest wrong-cat similarity/identity, top candidate, threshold, and outcome (correct suggestion, abstention, wrong suggestion). A wrong candidate above threshold is a wrong suggestion even if the correct cat ranks second. Report failures to detect/embed separately rather than quietly dropping difficult photos.
Use one conservative global threshold per released strategy/space, not per-cat/per-photo tuning. Choose the release strategy/threshold on development photos, freeze them, and check untouched queries. Log first-only and centroid results on held-out photos using their development-fixed settings, but do not switch the released winner based on those results and still call that independent validation. If an error causes strategy/threshold/artifact retuning, disclose that the viewed holdout became development data and gather fresh holdouts for a final check.
Release gate from learner:
- Zero wrong suggestions on final evaluated negatives/hard negatives; investigate any wrong-cat suggestion, including on true repeats, and do not release unresolved wrong suggestions.
- Useful correct suggestions across more than one cat, with roughly half of true-repeat queries correctly surfaced as the practical target. Remaining repeats may abstain.
- A single defensible threshold, without erratic per-photo adjustments. Prefer centroid only if it improves/preserves precision-first separation; first-only may win.
- Repeated wrong suggestions, no useful separation, or unresolved false familiarity → suggestions disabled. Do not fake the recurring-cat demonstration; state which part remains unproven.
Report held-out correct suggestions, abstentions, wrong-cat suggestions, correct-cat similarity and highest competing similarity for both strategies. Report actual cat/photo/query counts and repeat/negative gallery definitions; 30 development + 20 held-out is an illustrative split until the files are collected. Roughly half of true repeats remains the learner's practical target, not an invented strict percentage gate. Zero unresolved wrong suggestions remains the conservative release goal; if similar cats cannot be separated defensibly, keep suggestions disabled.

Indoor photos form a controlled matching evaluation, not the entire outdoor field trial. Separately capture a smaller set through Meowfolio on the actual Android phone in realistic/outdoor use to demonstrate camera → detector → embedding → identity decision → save → reopen. Describe controlled and outdoor evidence separately in the submission, and never turn a dataset fraction into general cat-recognition accuracy. The earlier 5/8 example was illustrative, not observed data.

## File Structure
Planned, not existing application files. Preserve existing docs and reconcile changed decisions deliberately.
```text
meowfolio/
├── package.json / package-lock.json   # pinned dependencies and scripts
├── index.html / vite.config.ts        # static entry and worker/build settings
├── tsconfig*.json                    # strict browser/worker typing
├── src/
│   ├── main.tsx / App.tsx            # entry, lazy AI, view orchestration
│   ├── styles.css                   # Tailwind plus scrapbook tokens
│   ├── ui/
│   │   ├── Welcome.tsx              # F1
│   │   ├── Collection.tsx           # F6 cards/empty state
│   │   ├── CatDetail.tsx            # F6 history/location disclosure
│   │   ├── ScanFlow.tsx             # F1–F5a screen composition
│   │   ├── PhotoPreview.tsx         # capture/replace
│   │   ├── Preparation.tsx          # consent/progress/recovery
│   │   ├── CatSelection.tsx         # multiple detections
│   │   ├── IdentityDecision.tsx     # first cat/suggestion/no suggestion
│   │   ├── ExistingCatPicker.tsx    # manual confirmation, duplicate names
│   │   ├── EncounterForm.tsx        # note/location/name/save failures
│   │   ├── SaveSuccess.tsx          # view cat / collection
│   │   └── DiscardDialog.tsx        # keep editing / discard
│   ├── scan/
│   │   ├── session.ts              # typed reducer, stable IDs/generation
│   │   ├── navigation.ts           # app/browser Back integration
│   │   └── useScan.ts              # async orchestration and timing
│   ├── ai/
│   │   ├── worker.ts / protocol.ts # serialized model work, typed messages
│   │   ├── client.ts               # worker lifecycle/request filtering
│   │   ├── assets.ts               # cache inspection/guarded network permits
│   │   ├── manifest.ts             # pinned evidence-selected artifact set
│   │   ├── detector.ts             # model-specific boxes/class mapping
│   │   ├── embedder.ts             # validated preprocessing/pooling
│   │   └── matchingPolicy.ts       # evaluated strategy/threshold/enabled flag
│   ├── domain/
│   │   ├── types.ts                # cats, encounters, embedding space
│   │   ├── embeddings.ts           # normalize/sum/cosine/compatibility
│   │   ├── matching.ts             # eligible candidates and conservative top1
│   │   └── validation.ts           # names and save-payload integrity
│   ├── storage/
│   │   ├── database.ts             # native open/version/index/transaction
│   │   └── repository.ts           # reads and atomic idempotent save
│   ├── browser/
│   │   ├── images.ts               # decode/resize/crop/URL lifecycle
│   │   └── location.ts             # optional finite request, stale callbacks
│   └── spike/
│       ├── SpikeView.tsx           # development-only real pipeline probes
│       └── evaluation.ts           # first-only/centroid per-query report
├── tests/                           # focused invariants/integration, runner TBD
├── docs/
│   └── evidence/                    # manifest, device timings, trial results
├── devpost/                         # canonical learning plans + HTML companions
└── README.md                        # actual start/build/demo and limitations
```
Do not put private photos/coordinates into public evidence without explicit permission. Aggregate outcomes and non-sensitive fixture identifiers suffice for the report.

## External Services and Dependencies
- Hugging Face Hub asset request template: `https://huggingface.co/{modelId}/resolve/{commit}/{file}` (GET, no photo payload; configs return JSON, weights binary; redirects may use CDN hosts). Slice 1 verifies guarded, exact-revision model requests for `Xenova/yolos-tiny` and `Xenova/dinov2-small` in Chromium/WASM. Do not promise unlimited/free availability or fixed bandwidth. [Hub download docs](https://huggingface.co/docs/huggingface_hub/guides/download), [YOLOS detector](https://huggingface.co/Xenova/yolos-tiny), [DINO embedder](https://huggingface.co/Xenova/dinov2-small).
- Browser WebGPU/WASM via the pinned Transformers.js/ONNX runtime: no hosted inference endpoint. Verify actual provider artifact support. [WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu).
- Vercel static hosting: GitHub-connected Vite deployment from `main`, `npm run build`, output `dist`; stable production HTTPS URL. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite). Verify account plan limits, build settings and required runtime headers during setup; no paid plan or unlimited usage is assumed. No application API, Vercel Functions or cloud database.
- No geocoder, maps service, auth service or telemetry endpoint.

## Important Failure Modes
- Missing/evicted asset or forbidden fetch → consent-required preparation, retained photo, no network bypass.
- Provider init/inference failure → report stage, allow retry/back; tested fallback only, requesting consent for any additional uncached model assets.
- Warm request exceeds 20 seconds → invalidate and recover; do not accept late success or claim forced cancellation.
- Storage abort/quota/unavailable → retain pending encounter, no success, same-ID retry. Partial transactions do not count as saved.
- Embedding incompatibility → no similarity candidate from that reference; manual history save works without replacing it.
- Location denial/timeout → save without location; stale callbacks cannot mutate saved/discarded work.
- Model license unsuitable or matching gate fails → learner-approved model revision or disabled suggestions; truthful release notes.

## What Was Simplified and Why
- Two native database stores and a thin wrapper; no backend or database library.
- One persistent worker, small typed messages and request tokens; no new state/concurrency framework.
- Hugging Face-hosted pinned assets with guarded caching; no weight bundle/deployment pipeline unless demonstrated necessary.
- Exact centroid or first-only evaluation; no clustering, recency weights, multiple prototypes or automatic embedding migration.
- Scan-session recovery only; no persistent drafts, cloud sync or offline-shell project.

## Decisions and Open Issues
### Agreed Decisions and Learning Evidence
- Learner confirmed the stack, native IndexedDB wrapper, worker/UI separation and cancellation hierarchy, pinned HF assets with guarded fetching, and exact sum/count centroid with compatible-space isolation.
- Mathematical clarification: a normalized mean loses magnitude; the learner explicitly chose an extra sum vector to preserve equal weighting without rereading history.
- Genuine uncertainty to investigate: exact detector/embedder worker paths on Android with WebGPU and WASM, plus consent enforcement through the pinned runtime's cache/fetch controls. The spike above supplies the evidence; documentation availability alone does not settle behavior.
- Warm timing gate and precision-first matching gate are learner-defined targets, not measured results.
- Learner explicitly allows automatic suggestions to be withheld while manual scrapbook use ships; do not describe that release as proving the familiar-face kernel.

### Resolved Before Approval
- Optional USB debugging: confirm ADB availability only if using that development path; the agreed Vercel production URL is sufficient for actual Android/outdoor verification.
- Optional geolocation uses an 8-second acquisition timeout. Save without location remains available immediately; denial, failure, or timeout never blocks persistence. Download inactivity 30/60-second recovery, cold initialization 20/30/60-second bands, and warm 6/10/20-second bands are settled.
- Testing tools approved: Vitest for vector/session/domain logic and browser-capable IndexedDB integration tests; selective Playwright automation may cover consent/cancellation/save behavior with clearly labelled mocks. Actual Android model loading, WebGPU/WASM behavior, timing, and matching remain manual real-device evidence. Dependencies are installed only when the relevant build slice needs them.

### Spike Outputs and Locked Slice 1 Evidence
Slice 1 locks the browser-spike package versions in `package.json`, Transformers.js `4.3.0`, the YOLOS-tiny and DINOv2-small revisions above, the WASM `uint8` artifacts, the guarded Hugging Face request boundary, and DINOv2 CLS-token extraction. GitHub Actions run `37664646226` on commit `2894c955bab20c9979a5bb3ea400f4d02b536354` passed install, TypeScript, six Vitest checks, production build, and the real Chromium AI spike: a real cat photo produced a detector crop and normalized 384-dimensional DINOv2 embedding. This does **not** claim Android/WebGPU success, final matching quality, warm performance targets, or standard-vs-quantized equivalence; those remain evidence-gated.

### Relationship to Existing Plans
`context.md` section 18 names fixed candidate models; the learner now explicitly treats exact models/artifacts as evidence-gated starting candidates and permits replacing an unsuitable detector after review. Approved PRD F7 describes the useful-matching proof; the learner now authorizes a manual-only release if matching is unproven. Carry these explicit refinements into the existing context/architecture/evaluation documents when the technical plan is approved, retaining the caveat that withheld matching has not met that proof. Existing documents' broader features or unsupported thresholds are not silently inherited.
