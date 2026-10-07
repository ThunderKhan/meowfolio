# Meowfolio Test Plan

Status: Required for hackathon release

## 1. Testing objective

The biggest risk is not a button bug. It is that the core promise fails in real conditions:

> a user photographs a cat outside, local AI processes it, Meowfolio offers an honest similarity suggestion, and the encounter is saved privately.

Testing therefore prioritizes:
1. AI feasibility,
2. data integrity,
3. mobile field behavior,
4. privacy claims,
5. graceful failure,
6. UI polish.

## 2. Test levels

### Automated unit tests
Use for deterministic logic:
- vector normalization,
- cosine similarity,
- candidate ranking,
- threshold logic,
- reference embedding update,
- domain validation,
- date/display helpers,
- IndexedDB repository behavior where practical.

### Component/integration tests
Use selectively for:
- new-cat form,
- possible-match decision,
- no-cat state,
- permission-denied path,
- collection rendering from saved records.

Do not spend hackathon time snapshot-testing decorative UI.

### Manual browser tests
Required for:
- model loading,
- WebGPU/fallback,
- camera/file input,
- IndexedDB persistence,
- mobile interactions,
- permissions,
- browser cache behavior.

### Field tests
Required for:
- actual outdoor photos,
- bad lighting/framing,
- moving/distant cats,
- real mobile network conditions.

---

# 3. Core logic tests

## 3.1 Vector normalization

Cases:
- normal non-zero vector,
- already normalized vector,
- very small values,
- zero vector.

Expected:
- non-zero output has norm approximately 1,
- zero vector is rejected or safely handled.

## 3.2 Cosine similarity

Cases:
- identical normalized vectors → approximately 1,
- orthogonal vectors → approximately 0,
- opposite vectors → approximately -1,
- mismatched lengths → explicit error.

Do not silently truncate mismatched vectors.

## 3.3 Candidate ranking

Given stored cats with known synthetic vectors:
- highest similarity ranks first,
- candidates below threshold are omitted,
- ties are deterministic,
- empty collection returns no candidate.

## 3.4 Reference update

Given confirmed encounter embeddings:
- first encounter becomes initial reference,
- second confirmed encounter updates reference,
- resulting reference is normalized,
- rejected/non-confirmed sightings never affect reference.

---

# 4. IndexedDB tests

## Database creation
- schema creates successfully on fresh browser data.

## Cat write/read
- create cat,
- reload,
- retrieve same cat.

## Encounter write/read
- image Blob survives round trip,
- Float32Array/embedding survives round trip,
- optional location survives,
- missing optional fields are valid.

## Transaction behavior
New cat:
- Cat + first Encounter both succeed,
- a failure should not leave an obviously broken half-record if transaction can prevent it.

Repeat encounter:
- Encounter addition + Cat metadata update remain consistent.

## Queries
- list all cats,
- get cat by id,
- list encounters by cat,
- sort encounter history correctly.

## Storage error
Where testable:
- quota/write failure produces user-visible failure,
- UI does not falsely say “saved.”

---

# 5. Detector validation

Maintain a small test fixture set.

## Required categories

### Positive
- close clear cat,
- side profile,
- sitting cat,
- dark cat,
- orange/light cat,
- partially occluded cat,
- distant cat.

### Negative
- dog,
- stuffed animal if available,
- empty street,
- person,
- generic indoor scene.

### Multi-object
- two cats,
- cat + dog,
- cat + person.

## Record
For each:
- device/browser,
- detector result,
- confidence,
- latency,
- correct bounding box?,
- usable crop?,
- notes.

## Pass rule
There is no claim that the detector is perfect.

The app passes if:
- common clear cat photos work reliably enough for the demo,
- failures are recoverable,
- false positives are not silently saved as cats.

---

# 6. Embedding/similarity evaluation

This is the most important validation because DINOv2 is not a cat identity model.

## Build a labeled pair set

At minimum include:
- same image / same image,
- same cat / similar viewpoint,
- same cat / different viewpoint,
- same cat / different distance,
- different cats with different colors,
- different cats with similar colors/patterns.

For each pair record:
- label: same cat / different cat,
- similarity score,
- visual notes.

## Threshold selection

Do not optimize for a high number of suggestions.

Prefer a conservative threshold because a false “familiar cat” suggestion is more damaging than no suggestion.

Look for:
- overlap between positive and negative scores,
- hard negatives,
- score stability.

If there is no clean threshold:
- show fewer suggestions,
- present top candidates without confidence language,
- require human selection,
- document the limitation.

## Prohibited interpretation

Never write:
> “0.91 means 91% probability this is the same cat.”

Cosine similarity is not a calibrated identity probability.

---

# 7. Model-loading tests

## First run
- detector downloads/loads,
- embedder downloads/loads,
- progress/status is visible,
- app does not look frozen.

## Second run
- observe whether browser/runtime cache reduces loading,
- do not assume cache persistence without observation.

## Failure
Test by:
- disabling network before uncached load if practical,
- invalidating/interrupting request if practical.

Expected:
- understandable error,
- retry option,
- collection remains accessible.

---

# 8. Runtime/provider matrix

Minimum target matrix:

| Device | Browser | WebGPU | Required? |
|---|---|---:|---:|
| Development laptop | Chrome/Chromium | test | Yes |
| Android phone | Chrome | test | Yes |
| Development laptop | Firefox | fallback/behavior | Nice |
| iPhone/iPad Safari | Safari | behavior | Nice if device available |

The hackathon should not be blocked trying to support every browser equally.

Document unsupported/slow environments honestly.

---

# 9. Mobile UX tests

Test at phone width:

- primary capture action visible without hunting,
- camera/file chooser works,
- photo preview fits,
- no horizontal overflow,
- modal/dialog content fits,
- keyboard does not hide naming action,
- buttons have usable touch targets,
- long cat name wraps/truncates safely,
- loading state remains legible outdoors,
- orientation changes do not destroy current data if practical.

---

# 10. Geolocation tests

## Permission granted
- coordinates save with encounter,
- accuracy is stored if used,
- no public sharing occurs.

## Permission denied
- user can still save cat,
- no repeated permission harassment,
- UI explains location is optional.

## Unavailable/error
- flow continues without coordinates.

No location request should happen simply by landing on the site.

---

# 11. Privacy verification

Before submission, use browser developer tools Network panel.

Perform:
1. app load,
2. model load,
3. choose a cat image,
4. detect,
5. embed,
6. save,
7. reopen cat.

Verify no requests contain:
- the user's photo,
- image Blob,
- cat name,
- note,
- embedding,
- coordinates.

Document expected external requests:
- app static assets,
- model files/runtime assets.

If analytics are added, inspect them too.

Do not state “nothing leaves your device” if static/model requests exist. The precise claim should be:

> **Your captured photos, scrapbook data, embeddings, and optional sighting location are processed/stored locally and are not sent to a hosted inference service by default.**

---

# 12. Persistence tests

After saving cats:
- refresh,
- close/reopen tab,
- reopen browser,
- revisit site.

Expected:
- collection remains while browser site data remains.

Also test:
- model reload does not wipe database,
- deployment update does not wipe compatible schema.

---

# 13. Error-state tests

Required:
- no cat detected,
- multiple cats,
- model load failure,
- inference error,
- bad/unsupported image,
- IndexedDB unavailable/error,
- storage write failure if reproducible,
- geolocation denied,
- runtime/provider fallback,
- zero saved cats,
- missing referenced encounter handled gracefully.

Every error needs:
- understandable message,
- next action.

Avoid raw stack traces in user-facing UI.

---

# 14. Accessibility smoke test

- tab through major controls,
- visible focus,
- buttons have names,
- image inputs have labels,
- loading status is represented as text, not animation only,
- errors are text,
- contrast remains readable,
- reduced-motion preference respected for nonessential motion where practical.

---

# 15. Performance measurements

Record on at least development laptop and intended demo phone:

- detector first load,
- embedder first load,
- cached/repeat initialization,
- detector inference,
- embedding inference,
- scan-to-match total,
- approximate model transfer size,
- obvious memory issues after 5 scans.

No invented performance claims in README/submission.

Use measured values only.

---

# 16. Field-test protocol

Take the deployed build outside.

Try to capture:
1. clear stationary cat,
2. cat at moderate distance,
3. imperfect light,
4. quick spontaneous encounter.

Observe:
- can the action be completed one-handed?
- is loading understandable?
- does mobile data make first use painful?
- does the crop make sense?
- does the app tempt the user to spend too long staring at the screen?

Write down failures immediately.

The field test should feed both product fixes and the DEV submission story.

---

# 17. Release gate

Do not call the hackathon build ready unless:

- [ ] detector works on real cat photos,
- [ ] embedding pipeline works,
- [ ] similarity behavior has actual measured examples,
- [ ] false certainty language is absent,
- [ ] new cat flow works end-to-end,
- [ ] repeat flow works end-to-end,
- [ ] IndexedDB survives reload,
- [ ] geolocation denial does not block save,
- [ ] mobile field test passes,
- [ ] privacy network inspection completed,
- [ ] model/runtime license review completed,
- [ ] deployed build tested,
- [ ] no known P0/P1 bug remains.

## Bug severity

### P0
Cannot complete the core loop, data loss, privacy violation, deployment broken.

### P1
Major feature failure with no reasonable workaround; AI result flow misleading.

### P2
Annoying but demo can proceed.

### P3
Cosmetic.

On submission day, fix P0/P1 first. Do not risk the build chasing P3 polish.
