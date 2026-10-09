# Meowfolio dependency and model licensing register

**Status:** Public source license selected: [MPL-2.0](../LICENSE). This record distinguishes original application code, installed libraries, external model weights and personal photographs. The current source is a static browser-local React/Vite app, not a hosted inference service.

For concise public credit, see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Shipped runtime dependencies

Versions reflect the committed `package.json`:

| Dependency | Version | Purpose | Upstream license and verification source |
| --- | --- | --- | --- |
| [React](https://github.com/facebook/react) / React DOM | 19.3.0 | Component rendering | [MIT](https://github.com/facebook/react/blob/main/LICENSE) |
| [@huggingface/transformers](https://github.com/huggingface/transformers.js) | 4.3.0 | Browser-local model loader and inference | [Apache-2.0](https://github.com/huggingface/transformers.js/blob/main/LICENSE) |
| [ONNX Runtime](https://github.com/microsoft/onnxruntime) | Transitive browser-runtime component | WASM inference backend | [MIT](https://github.com/microsoft/onnxruntime/blob/main/LICENSE) |

**Development tooling** (not custom application backend): Vite 8.3.3, Tailwind CSS 4.3.3, TypeScript 5.9.3, Vitest 5.0.3 and Playwright 1.63.0. See `package-lock.json` for the exact resolved dependency graph; refer to each package's included license before redistributing vendored code.

## Model credits and reproducible versions

### Detector: [Xenova/yolos-tiny](https://huggingface.co/Xenova/yolos-tiny)

- Original model: [HUST Vision Lab YOLOS-tiny](https://huggingface.co/hustvl/yolos-tiny) (model card: Apache-2.0).
- Transformers.js-compatible ONNX conversion: Xenova.
- Frozen revision: `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`.
- Role: object-detection bounding boxes with cat selection in photographs.

### Image embedder: [Xenova/dinov2-small](https://huggingface.co/Xenova/dinov2-small)

- Original model: [Meta AI / facebook DINOv2-small](https://huggingface.co/facebook/dinov2-small) (upstream model card: Apache-2.0).
- Transformers.js-compatible ONNX conversion: Xenova.
- Frozen revision: `a5406bdfce9ac07eb3dc08dd05cbea034f4648d8`.
- Role: visual embedding from a selected cat crop, 384-dimensional normalized CLS token output.

Model weights and WASM runtime assets are downloaded from approved hosts **with explicit consent**, then cached in the user's browser. Models **are not checked into the repository** and do not inherit Meowfolio's MPL-2.0 license. If redistributing their files outside the upstream hosting system, review applicable license terms and notices for the specific conversion/weights as well as underlying upstream models.

## Why the detector changed

The original exploratory YOLOv10n candidate was not supported by the verified Transformers.js 4.3.0 browser pipeline and had more restrictive distribution terms. Real Chromium execution established YOLOS-tiny as the supported detector. The project did not ship the original candidate.

## Automatic identity matching

DINOv2 embeddings are descriptors, **not proof of identity**. The project's evaluated candidate failed its false-positive gate, so production suggestions are disabled: `src/evaluation/releasePolicy.ts` records `evaluated-not-approved`. Users manually associate sightings to saved cats. Details: [held-out evaluation](evaluation-results/2026-10-08-cat-individuals.md).

## Original content and data

- Original Meowfolio application source: [MPL-2.0](../LICENSE); file-level copyleft for covered code.
- User-provided photographs, optional locations, personal notes, embeddings and browser backups: **not published** with the source repo, not licensed by Meowfolio.
- Public project favicon, Open Graph graphic and visual brand: represent this application. Use of code under MPL does not automatically grant trademark rights.
- Do not upload external Kaggle/photo dataset files or private user data into repository history without redistribution rights. Evaluation outputs intentionally use aggregate metrics and anonymous labels.

## Review procedure for new dependencies or models

Before introducing a new package/model, review its upstream source, pinned version, browser compatibility, license and notices; test real Chromium inference (not mocked data alone), and update this register. Do not bypass the matching release policy or change the public storage origin without a migration plan.

This document is a technical attribution record, not legal advice.
