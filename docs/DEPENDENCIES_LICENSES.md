# Meowfolio Dependencies & Licensing Register

Status: working register, **not legal advice**

Licensing matters because the current detector model is marked AGPL-3.0.

Do not add a repository LICENSE until the implications of the shipped/runtime dependencies and chosen distribution approach are reviewed.

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

### onnx-community/yolov10n

Purpose:
- object detection / cat bounding boxes.

Model page:
https://huggingface.co/onnx-community/yolov10n

Current model-page license:
**AGPL-3.0**

Important:
AGPL obligations may materially affect how we distribute a web application using these weights.

Action before final release:
- inspect the model repository/license text,
- understand whether weights and/or derivative distribution trigger obligations,
- decide whether to comply under a compatible project license or replace the detector with a model whose license better matches the intended project.

This is a release blocker, not a footnote.

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
- record the exact browser model revision used,
- verify notices/attribution.

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
**OPEN**

Reason:
current detector's AGPL-3.0 marking requires deliberate review.

Possible outcomes:
1. choose a compatible project/distribution approach and comply,
2. use another detector under a more suitable license,
3. change how model assets are distributed if legally meaningful.

Do not choose a permissive repo license solely because it is common for hackathon projects.

## 9. No-copy rule

Do not copy model/library source code into the repo unless its license permits it and attribution/obligations are handled.

Normal package installation/model fetching is preferred.

## 10. Final release gate

Before submission:
- [ ] installed dependency licenses reviewed,
- [ ] detector license decision resolved,
- [ ] DINOv2 source/license recorded,
- [ ] Transformers.js license recorded,
- [ ] attribution/notices added where needed,
- [ ] README links models and licenses accurately.
