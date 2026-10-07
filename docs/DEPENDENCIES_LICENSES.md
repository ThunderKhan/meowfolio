# Meowfolio Dependencies & Licensing Register

Status: working register, **not legal advice**

Licensing was a blocker for the original YOLOv10n candidate, which was marked AGPL-3.0. Slice 1 replaced that candidate with YOLOS-tiny, whose upstream model is Apache-2.0.

Do not add a repository LICENSE until the shipped runtime dependencies, model conversions/source notices, and intended distribution approach are reviewed.

## 1. Current planned runtime dependencies

### @huggingface/transformers

Purpose:
- load/run browser AI models,
- WebGPU/WASM execution,
- model preprocessing/postprocessing.

Upstream license:
- Apache-2.0.

Status:
- planned.

### React

Purpose:
- UI.

License:
- verify exact installed package/version during scaffold, expected permissive upstream license.

Status:
- planned.

### Vite

Purpose:
- build tooling.

License:
- verify installed version.

Status:
- planned dev dependency.

### Tailwind CSS

Purpose:
- styling workflow.

License:
- verify installed version.

Status:
- planned.

Do not copy this document's expected license labels into final notices without checking the actual lockfile versions.

## 2. AI models

### Xenova/yolos-tiny

Purpose:
- object detection / cat bounding boxes.

Browser conversion:
- `Xenova/yolos-tiny`
- pinned revision: `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`
- verified Slice 1 WASM artifact: `uint8`

Underlying upstream model:
- `hustvl/yolos-tiny`

Upstream license:
**Apache-2.0**

Status:
- selected after real Chromium evidence showed the original `onnx-community/yolov10n` candidate was unsupported by Transformers.js 4.3.0's object-detection model mapping,
- removes the original YOLOv10n AGPL release blocker,
- final attribution/notice wording still requires verification against the conversion repository and exact shipped dependency/model metadata.

### Xenova/dinov2-small

Purpose:
- browser-compatible DINOv2 visual embedding.

Compatibility repo/model wrapper license:
verify exact repository metadata.

Underlying upstream model:
`facebook/dinov2-small`

Upstream model page license:
**Apache-2.0**

Action:
- pinned revision: `a5406bdfce9ac07eb3dc08dd05cbea034f4648d8`,
- verified Slice 1 WASM artifact: `uint8`,
- output strategy: first CLS token from `last_hidden_state`, 384 values, then L2 normalization,
- verify final notices/attribution.

## 3. Model revision pinning

Once feasibility is confirmed:
- pin known-good model revisions when practical,
- record commit/revision IDs here.

Reasons:
- reproducibility,
- avoid silent behavior changes,
- audit license/source.

## 4. Runtime asset source

Initial:
- Hugging Face Hub.

If self-hosted later:
- keep original license/notice obligations,
- record copied asset hashes/revisions,
- do not treat self-hosting as changing the license.

## 5. Dependency acceptance checklist

Before adding any runtime package:
- [ ] exact package name,
- [ ] exact need,
- [ ] alternatives considered,
- [ ] package license,
- [ ] transitive dependency impact,
- [ ] bundle/runtime impact,
- [ ] browser compatibility,
- [ ] security/reputation.

## 6. Model acceptance checklist

Before replacing/adding model:
- [ ] task fit,
- [ ] Transformers.js/browser compatibility,
- [ ] file size,
- [ ] quantized option,
- [ ] WebGPU/WASM behavior,
- [ ] license,
- [ ] source/revision,
- [ ] evaluation on Meowfolio cases.

## 7. Notice file

Before `v0.1.0`, create the appropriate notices/attribution file once actual dependencies and chosen project license are known.

Do not generate a generic notice file from assumptions.

## 8. Repository license decision

Status:
**OPEN — detector blocker resolved, repository license still requires deliberate selection**

Reason:
The AGPL-marked YOLOv10n candidate is no longer used. The selected YOLOS-tiny upstream model is Apache-2.0, but final project licensing still needs to account for all installed packages, model-conversion metadata, notices, and any copied assets.

Do not choose a permissive repo license solely because it is common for hackathon projects.

## 9. No-copy rule

Do not copy model/library source code into the repo unless its license permits it and attribution/obligations are handled.

Normal package installation/model fetching is preferred.

## 10. Final release gate

Before submission:
- [ ] installed dependency licenses reviewed,
- [x] detector license blocker resolved by replacing YOLOv10n with Apache-2.0-upstream YOLOS-tiny; final notice verification remains,
- [x] DINOv2 source/revision and Apache-2.0 upstream license recorded; final notice verification remains,
- [ ] Transformers.js license recorded,
- [ ] attribution/notices added where needed,
- [ ] README links models and licenses accurately.
