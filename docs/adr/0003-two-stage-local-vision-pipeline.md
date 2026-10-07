# ADR-0003 — Two-Stage Local Vision Pipeline

Status: **Accepted**  
Date: 7 October 2026

## Context

Meowfolio needs two different capabilities:
1. know where the cat is in a photograph,
2. compare the cat visually with saved encounters.

A single general model could theoretically perform multiple tasks, or an LLM/VLM could describe the image. But the MVP must be small enough to run in a browser and should avoid unnecessary model weight.

## Options considered

### A. Vision-language model / multimodal LLM

Pros:
- flexible descriptions,
- broad capability.

Cons:
- large model,
- browser performance/download cost,
- generated language does not solve identity comparison directly,
- naming/descriptions are not core.

Rejected for MVP.

### B. Detector only

Pros:
- small/simple.

Cons:
- detects “cat” but cannot provide useful repeat-encounter representation by itself.

Rejected as insufficient.

### C. Feature model only

Pros:
- embedding available.

Cons:
- background/people/scenery can dominate if full image is embedded,
- cannot reliably isolate which cat to save when several appear.

Rejected as incomplete.

### D. Detector + feature extractor

Pros:
- detector isolates cat,
- embedding model focuses on selected crop,
- each model has one clear job,
- independently replaceable/evaluable.

Cons:
- two model downloads,
- more initialization/memory,
- pipeline coordination.

## Decision

**Use a two-stage browser-local vision pipeline:**

1. `onnx-community/yolov10n` for cat detection/cropping.
2. `Xenova/dinov2-small` for visual feature extraction.
3. cosine similarity over normalized embeddings for candidate retrieval.

No LLM is part of the MVP.

## Consequences

### Positive
- clean separation of concerns,
- better control over what image region is embedded,
- easier evaluation,
- each stage can be replaced separately.

### Negative / trade-offs
- two model assets,
- more memory/load time,
- detector license requires deliberate review,
- general DINOv2 embeddings may not separate individual cats well.

## Revisit when

Create a new ADR if:
- evaluation shows DINOv2 similarity is unusable,
- detector model/license is unsuitable,
- a single smaller model can demonstrably replace both stages,
- model download/memory makes two-stage browser execution impractical.
