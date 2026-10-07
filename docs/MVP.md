# Meowfolio MVP

Status: **Locked for Hacktoberfest Week 1 unless feasibility testing forces a change**

## 1. MVP goal

Ship a mobile-friendly browser experience that proves this loop:

> A user goes outside, photographs a real cat, Meowfolio processes the image locally, helps the user decide whether the cat is new or familiar, and saves the encounter into a private scrapbook.

The MVP is successful when this works reliably enough to demonstrate outdoors.

## 2. Target user

A person who enjoys noticing neighborhood cats and wants a lightweight, private record of the cats they meet.

No account should be required for the basic experience.

## 3. Required user journey

### First launch

1. User opens Meowfolio.
2. App explains:
   - cat photos are processed locally,
   - the AI models may need a first-time download,
   - location is optional.
3. User enters the collection.

### New cat encounter

1. User chooses **Spot a cat**.
2. User takes or selects a photo.
3. Local object detection checks the image.
4. If no cat is found, show a retry state.
5. If one cat is found, use its crop.
6. If multiple cats are found, let the user select the intended cat.
7. DINOv2 creates a local visual embedding.
8. Existing saved cats are compared using cosine similarity.
9. If there is no meaningful candidate, offer **New cat**.
10. User enters the cat's name.
11. User may add a short note.
12. User may allow optional location capture.
13. Save the cat and encounter locally.
14. Show the new scrapbook entry.

### Repeat encounter

1. User photographs a cat.
2. Local detection and embedding run.
3. Meowfolio shows the strongest plausible saved match, if any.
4. Copy must say **possible match / visually similar**, not definitive identity.
5. User chooses:
   - **Yes, this is [name]**
   - **No, new cat**
   - optionally another existing cat if needed.
6. Confirmed encounter is appended to that cat's history.

### Collection

User can:
- see all saved cats,
- see a cover photo and name,
- see encounter count,
- open a cat detail view.

### Cat detail

User can see:
- name,
- cover photo,
- first-seen date,
- encounter count,
- chronological encounter history,
- saved notes,
- optional private location information.

## 4. Must-have features

### Capture and image handling
- Mobile camera input where supported.
- File upload fallback.
- Image preview.
- Browser-side image resizing/cropping with Canvas APIs where useful.
- No automatic image upload to a server.

### Local cat detection
- Model: `onnx-community/yolov10n`.
- Run in-browser.
- Detect cat class and bounding boxes.
- Graceful state for no-cat result.
- Handle multiple cats.

### Local visual embedding
- Model: `Xenova/dinov2-small`.
- Run in-browser.
- Generate embedding from the selected cat crop.
- Normalize vectors before comparison.

### Similarity assistance
- Cosine similarity.
- Rank existing cats by similarity.
- Only show a possible-match prompt above an empirically chosen threshold.
- Never auto-assign identity.

### Local persistence
Use IndexedDB to persist:
- cats,
- encounters,
- images/blobs,
- embeddings,
- notes,
- optional location metadata.

Data must persist across page refreshes and browser restarts unless the user clears site data.

### Scrapbook UI
- Empty state.
- Cat card grid/list.
- Cat detail page/view.
- Encounter timeline.

### Model loading UX
Show:
- first-time model preparation,
- progress where available,
- current phase,
- WebGPU/fallback status where useful,
- retryable errors.

### Privacy UX
Clearly state:
- inference happens on-device,
- location is optional,
- exact location is not publicly shared,
- no account is required for the local scrapbook.

## 5. Nice-to-have features

Only after the full core loop passes the test plan:

- private sighting map,
- approximate area labels,
- PWA installability,
- offline app shell,
- export/import of collection,
- multiple reference embeddings per cat,
- tasteful scrapbook stickers/micro-interactions,
- lightweight collection statistics.

## 6. Explicitly out of scope

Do not build these for the hackathon MVP:

- social feed,
- public cat map,
- authentication,
- cloud database,
- comments or likes,
- follows/friends,
- multiplayer,
- AR,
- cat chatbot,
- LLM-generated names,
- fictional AI biographies,
- veterinary advice,
- breed claims,
- definitive individual-cat recognition,
- dogs/birds/general animal mode,
- leaderboards,
- complicated achievements,
- paid APIs.

## 7. UX copy constraints

Allowed:
- “Possible familiar face”
- “Looks visually similar to Mochi”
- “Could this be Mochi again?”

Not allowed:
- “This is definitely Mochi”
- “AI identified this cat as Mochi”
- “98% same cat” unless that number has a defensible calibrated meaning.

## 8. Acceptance criteria

The MVP is complete only when all of the following are true:

- [ ] App works on a modern Chromium desktop browser.
- [ ] App works on at least one real mobile browser/device.
- [ ] First-run model loading completes with understandable feedback.
- [ ] A real cat photo is detected locally.
- [ ] A no-cat image produces a useful retry state.
- [ ] A cat crop can be embedded locally.
- [ ] At least one saved cat can be compared against a new embedding.
- [ ] User can reject the suggested match.
- [ ] User can manually name a new cat.
- [ ] Cat and encounter survive reload.
- [ ] Cat collection renders correctly from IndexedDB.
- [ ] Cat detail shows encounter history.
- [ ] App still works if geolocation permission is denied.
- [ ] No photo is automatically sent to a hosted inference service.
- [ ] No unverified identity claim appears in the UI.
- [ ] At least one real outdoor end-to-end test is documented.

## 9. Cut order if time runs short

Cut in this order:

1. map,
2. PWA/offline shell,
3. export/import,
4. advanced visual polish,
5. multiple reference embeddings,
6. optional notes/tags.

Do **not** cut:
- local detection,
- local embedding,
- human match confirmation,
- local persistence,
- collection,
- model-loading UX.

Those are the product.
