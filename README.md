# ♡ Meowfolio

**A private, browser-local, pink pixel scrapbook for cats you meet outdoors.**

Photograph a cat, let two locally executed computer-vision models find and describe its appearance, decide which cat it is yourself, and save the encounter in a personal browser scrapbook. Each cat has an image-first profile and a chronological history of sightings.

> **Current release policy (8 October 2026):** Automatic “possible familiar face” suggestions are **disabled**. A 50-photo individual-cat test found a false match when the true cat was absent from the gallery. Manual “choose a saved cat” and “name a new cat” remain available. See [the documented evaluation](docs/evaluation-results/2026-10-08-cat-individuals.md).

## What works

- 🐾 Mobile one-tap native camera or photo picker → preview → local cat detection → choose a crop if there is more than one.
- 💾 **Save photo for later:** original unprocessed photos are stored in a private IndexedDB inbox and can be reopened for AI detection after a reload, even if the phone's model is too slow. No fabricated identity is created.
- 👤 **Human-controlled identity**: add a new named cat, or manually attach a repeat sighting to a saved cat.
- 📓 Persistent local collection and per-cat history, with dates, encounter photos, optional notes and a collapsed, optional precise-location disclosure.
- 🔐 Photos, embeddings, names, notes and coordinates live in **IndexedDB** in your current browser profile/origin. No account or backend is required.
- 🎀 Pink, square-edged Y2K/pixel scrapbook presentation, mobile touch targets and reduced-motion support.
- 🧪 Local-only Matching Lab in development mode for reproducible real-photo matching evaluations.

**Scope limitations:** This is a hackathon proof of concept, not a validated pet-identification or outdoor tracking service. The benchmark was not a field test. Browsers can evict locally cached models and, depending on storage conditions, local scrapbook records; there is no cloud sync, backup/export or multi-device transfer in the MVP. Clearing site data, changing profiles, or changing the production **origin** can lose access to saved records. Do not use this for precise public animal location sharing.

## Stack and execution

- React 19, TypeScript, Vite 8, Tailwind CSS 4.
- Transformers.js 4.3 and two **pinned** Hugging Face models:
  - Cat detection: `Xenova/yolos-tiny` (`e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`).
  - Image embedding: `Xenova/dinov2-small` (`a5406bdfce9ac07eb3dc08dd05cbea034f4648d8`), 384-dimensional normalized CLS-token embedding.
- Both models run in a Web Worker. The current user-facing scan deliberately requests the **WASM** provider to keep the evaluation embedding space consistent; WebGPU remains an unverified optimization.
- Model/runtime files can be downloaded from **Hugging Face and supporting runtime CDNs**, but cat images are not uploaded for inference. First-time downloads require an explicit button click. Cached availability is rechecked rather than assumed permanent. An initialized worker is now reused across scans on the same page; a subsequent browser reload may still need initialization or, if storage was evicted, another authorized download.
- IndexedDB uses atomic transactions and idempotent encounter IDs. Its schema v2 also stores pending photo inbox records without changing existing saved-cat data. Similarity references do not combine embeddings from incompatible model/preprocessing versions.

See [architecture](docs/ARCHITECTURE.md), [AI evaluation](docs/AI_EVALUATION.md), [dependencies and license register](docs/DEPENDENCIES_LICENSES.md), and [release guide](docs/DEPLOYMENT_RELEASE.md).

## Run locally

Requirements: Node.js 22.12+ and npm.

```bash
git clone https://github.com/ThunderKhan/meowfolio.git
cd meowfolio
npm ci
npm run dev
```

Visit the local URL shown by Vite (usually `http://localhost:5173`). This localhost origin is separate from any eventual HTTPS production origin and has separate IndexedDB storage.

```bash
npm run typecheck
npm test
npm run build
npm run audit:production
npm run test:e2e
npm run test:e2e:production
```

The main browser suite includes a genuine YOLOS → DINOv2 Chromium/WASM check, and can download model files. The production-smoke suite verifies **production-mode** behavior without downloading models. Playwright Chromium can be installed via `npx playwright install chromium`.

For the local-only evaluation tool, run `npm run dev` and visit `/?matchingLab=1`, then provide a real-photo manifest and photos. The lab is not exposed in an ordinary production build. `evaluation-data/` is Git-ignored.

## Deploy with Vercel

This repository contains a `vercel.json` for a **static** Vite deployment. In Vercel, import `ThunderKhan/meowfolio`, select the `main` branch as production, install with `npm ci`, build with `npm run build`, and deploy `dist`. Do **not** add a server, Vercel Functions, API keys, tracking scripts, or a database.

Headers protect the HTML from stale caching and allow immutable hashed assets. No restrictive cross-origin isolation/CSP header is applied without real model runtime testing: the pinned Hugging Face and WASM runtime asset paths must remain functional.

**Do not switch the public production domain after collecting cats**: browser persistence is origin-scoped. After the first release, redeploy the **same origin** and check that saved cats/photos/history remain.

Deployment is prepared in code, **not claimed live** until an HTTPS Vercel URL has been confirmed and an Android real-device check has passed. Follow [the release checklist](docs/DEPLOYMENT_RELEASE.md).

## Where photos actually live

Meowfolio does **not** upload cat photos to Vercel. The Vercel server only provides the website files; browser-local inference runs in a dedicated worker.

- Saved cat photos and their selected crops are stored as **Blob** values inside this browser profile's **IndexedDB**, in the `meowfolio` database, `encounters` store. Names, embeddings, dates, optional notes, and any voluntarily saved coordinates are in the associated `cats` and `encounters` records.
- Unprocessed **Save photo for later** originals are stored separately in the `pendingPhotos` IndexedDB store until processed, confirmed, and committed (or manually deleted).
- AI model weights and supporting WASM runtime files use browser-managed caches. They are **not** the same storage as the scrapbook photos.
- Storage is tied to **this device, this browser profile, and the HTTPS origin** `https://mymeowfolio.vercel.app`. It does not sync across phones/computers. Clearing site data, browser storage eviction, or changing the website domain may make these photos unavailable; there is not yet an export/backup feature.
- A temporary IndexedDB upgrade block can occur when a previously loaded version of Meowfolio still holds a connection. Current releases wait for the old connection to release, close their own connection on version-change requests, and let failed opens retry. **Never clear site data as a first troubleshooting step.**

## Privacy and honest evidence

- No account, hosted photo inference, public location map, or app-side analytics.
- Optional geolocation is only requested when you press Add location; failures/timeouts do not block saving.
- The public matching report contains anonymized labels and metrics, not images or coordinates. The benchmark itself is not proof of outdoor Android quality.
- Currently, automatic matching is explicitly disabled in `src/evaluation/releasePolicy.ts`; it must not be toggled based on the held-out results after the fact.

**License:** A project-wide license has not yet been selected. Do not assume the source is OSI-licensed merely because the repository is public. Third-party libraries and model licenses/attribution are tracked in [the license register](docs/DEPENDENCIES_LICENSES.md).

## Status

Slices 1–5 are implemented; Slice 5's matching evaluation **failed the optional auto-suggestion release gate**. Slice 6 production/Android proof is in progress. Follow the [Devpost build checklist](devpost/checklist.md) for the evidence/status distinction.
