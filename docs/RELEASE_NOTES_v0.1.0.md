# Meowfolio v0.1.0 — Touch Grass Edition 🐱🌿

The first tagged public release of **Meowfolio**, a playful, privacy-first, Y2K pixel scrapbook for the real cats you meet outdoors. Built for **Hacktoberfest 2026 — Open-Source AI Challenge, Week 1: Touch Grass**.

**[Try the live app](https://mymeowfolio.vercel.app/)** · **[Read the README](README.md)** · **[Touch Grass notes](docs/TOUCH_GRASS_SUBMISSION.md)**

## What's included

- **Find cats locally:** select or photograph a cat, then run pinned open-weight **YOLOS-tiny detection** and **DINOv2-small embeddings** in a browser Web Worker through Transformers.js and WebAssembly.
- **Human-confirmed identities:** name a new cat or manually add another sighting to one you've already saved. Multiple-cat photos support explicit selection.
- **A private scrapbook:** browser-local IndexedDB keeps cats, original encounter photos, timestamps, notes and optional locations. No account, hosted cat database or photo-upload inference API.
- **Slow-phone recovery:** keep an unprocessed photo in the local inbox to scan later, without discarding the original.
- **Stories and memories:** cat histories, photo viewer, and 1080 × 1920 story-card export, plus full JSON backup and transactional restore.
- **Pixel-pink Y2K design:** mobile-first window chrome, keyboard-friendly navigation, cat favicon, GitHub link, and an Open Graph share card.
- **Performance work:** lazy feature chunks, paged cover-photo loading, browser image decoding, a compact tab favicon, and static CDN caching.

## A deliberate safety limitation

**Automatic “possible familiar cat” suggestions are disabled.** A frozen-policy evaluation found a false familiar-cat suggestion on a held-out negative. Rather than claiming reliable recognition, the app requires a person to choose the existing cat manually. Read the [evaluation](docs/evaluation-results/2026-10-08-cat-individuals.md).

## Try it

Open [mymeowfolio.vercel.app](https://mymeowfolio.vercel.app), select or photograph a cat, consent to downloading the models if necessary, follow the detection flow, save your cat, and revisit the scrapbook on the **same browser and origin**.

**Important limitations:** first-use model downloads require internet access and explicit consent; cached model assets can be evicted; saved cats are tied to one browser profile/origin and do not sync automatically. Back up your memories regularly. The complete **physical Android end-to-end field-test report is still pending**, and this release does not claim production-proven animal re-identification. CI evidence is desktop Chromium/WASM evidence, not real-device timing evidence.

## Open-source license and credits

Meowfolio's original source code is released under the **[Mozilla Public License 2.0](LICENSE)**, which retains file-level copyleft while allowing reuse and commercial applications. Model creators, ONNX conversions and major runtime dependencies are credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Your personal cat photographs and private backups are not part of this software license.

## Validation

The preceding PRs passed TypeScript, unit tests, production-build and artifact audits, Playwright production UI tests, real-model Chromium/WASM browser tests and Lighthouse CI. This tag is created **only after a fresh successful Verify Meowfolio run on the tagged `main` commit**.

No public demo video or Devpost entry is required for the **DEV Community Week 1 Touch Grass** challenge; the author's DEV article and final Android observations are separate submission steps.
