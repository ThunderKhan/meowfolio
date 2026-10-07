# ADR-0001 — Local-First Browser Architecture

Status: **Accepted**  
Date: 7 October 2026

## Context

Meowfolio processes photos of real-world cats and may associate them with:
- names,
- timestamps,
- notes,
- optional precise location.

The hackathon also rewards open/local AI at the core of the experience.

We need to decide whether the MVP should use:
1. a traditional frontend + backend + hosted inference,
2. a client frontend with hosted inference only,
3. a browser-only local-first application.

## Options considered

### A. Backend + hosted AI

Pros:
- centralized storage,
- easier cross-device sync,
- powerful server hardware.

Cons:
- photo/location upload,
- infrastructure time,
- accounts/auth pressure,
- API cost,
- weaker local-AI story,
- larger privacy surface.

### B. Browser UI + hosted inference, local storage

Pros:
- simpler than full backend,
- easy model execution.

Cons:
- photos still leave device,
- dependent on API/network,
- less technically aligned with project thesis.

### C. Browser-only local AI + local persistence

Pros:
- local privacy boundary,
- no paid inference API,
- direct fit with hackathon prompt,
- static deployment,
- app can retain scrapbook without backend.

Cons:
- model download cost,
- browser/device variability,
- harder inference performance,
- no automatic cross-device sync.

## Decision

**We use a browser-only, local-first architecture for the Hacktoberfest MVP.**

The browser performs:
- image preprocessing,
- object detection,
- visual embedding,
- similarity calculation,
- IndexedDB persistence,
- optional geolocation capture.

The app has no required backend and no account requirement.

## Consequences

### Positive
- strong theme alignment,
- user photos and coordinates do not need hosted inference,
- simpler deployment topology,
- no cloud inference bill,
- architecture itself is part of the product story.

### Negative / trade-offs
- first-use model downloads may be large,
- performance varies by device,
- no cloud backup/sync,
- site-data clearing can remove the scrapbook,
- browser compatibility must be tested.

## Revisit when

Create a new ADR if:
- cross-device sync becomes a product requirement,
- public sharing is introduced,
- browser model performance proves unusable,
- a future feature genuinely needs a server.

Do not add a backend merely for conventionality.
