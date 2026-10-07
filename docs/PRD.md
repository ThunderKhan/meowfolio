# Product Requirements Document — Meowfolio

Version: 0.1  
Date: 7 October 2026  
Hackathon: Hacktoberfest 2026 DEV Challenge — Week 1, **Touch Grass**

## 1. Product summary

**Meowfolio** is a private, browser-first scrapbook for cats a user encounters in the real world.

A user photographs a cat while outside. Open/local computer-vision models run in the browser to confirm a cat is present and create a visual representation. Meowfolio compares that representation with the user's existing collection and may suggest a visually similar cat. The user—not the AI—decides whether it is a repeat encounter or a new cat, gives new cats a name, and saves the memory.

### One-line pitch

> **Meowfolio — your personal scrapbook of the cats you meet outside.**

## 2. Problem

People often notice neighborhood cats repeatedly but have no lightweight way to turn those encounters into a personal record.

Existing approaches tend to become one of three things:
- generic photo galleries,
- species/breed classifiers,
- social/public location apps.

Meowfolio focuses instead on **personal memory and repeat encounters** while keeping photos and location-linked data local by default.

## 3. Opportunity

The Hacktoberfest Week 1 theme is **Touch Grass**: use open-source/open-weight AI in a project that gets users away from the screen and into the real world.

Meowfolio aligns naturally because the meaningful action happens outside:
- walk,
- notice,
- photograph,
- briefly record,
- keep moving.

The AI is not a chat feature added after the fact. It enables the capture and “have I seen this cat before?” interaction locally.

## 4. Product principles

### 4.1 Outdoors first
The app should reward noticing the physical world, not maximize screen time.

### 4.2 Personal over performative
The collection belongs to the user. Public sharing is not required.

### 4.3 Local over cloud
Photos, embeddings, encounter history, and optional precise locations should stay on-device for the MVP.

### 4.4 Human identity decision
The model can suggest similarity. It cannot reliably prove individual identity.

### 4.5 Emotional simplicity
The core emotional payoff is:
> “I met this cat before.”

Not:
> “Look at how many AI features this app has.”

## 5. Goals

### Product goals
- Make real-world cat encounters feel collectible and memorable.
- Provide a friction-light scrapbook that grows through outdoor use.
- Make local AI visible and understandable.
- Preserve privacy by default.
- Deliver a memorable Hacktoberfest demonstration.

### Technical goals
- Perform cat detection in the browser.
- Perform visual feature extraction in the browser.
- Store collection data in IndexedDB.
- Support a WebGPU path and practical fallback where possible.
- Run without a backend for the MVP.

## 6. Non-goals

Meowfolio is not:
- an animal identification encyclopedia,
- a breed classifier,
- a veterinary tool,
- a lost-pet tracking network,
- a social network,
- a public surveillance/location database,
- an individual-animal biometric system,
- a Pokémon imitation.

## 7. Primary persona

### Neighborhood explorer

A mobile user who:
- walks around campus, neighborhood, park, or city,
- notices cats,
- enjoys naming familiar animals,
- wants a playful memory of encounters,
- does not want to create an account,
- values privacy and immediacy.

## 8. Jobs to be done

### JTBD 1
When I meet a cat outside, I want to save the encounter quickly so I can remember it later.

### JTBD 2
When I photograph a familiar-looking cat, I want help recalling whether I have met it before without the app pretending to know for certain.

### JTBD 3
When I revisit my collection, I want to see the cats and encounters as a personal scrapbook rather than a database.

### JTBD 4
When I use AI on photos and location-linked memories, I want those sensitive inputs to stay on my device.

## 9. Core user stories

### Capture
- As a user, I can take or select a photo.
- As a user, I am told if no cat is detected.
- As a user, I can select the intended cat when multiple cats are detected.

### Matching
- As a user, I can see a possible familiar cat if visual similarity is high enough.
- As a user, I can reject the suggestion.
- As a user, I remain the final authority on identity.

### New cat
- As a user, I can create a new cat entry.
- As a user, I choose the cat's name.
- As a user, I can optionally add a note and location.

### Existing cat
- As a user, I can add a new encounter to an existing cat.
- As a user, I can see that cat's encounter history.

### Collection
- As a user, I can browse saved cats.
- As a user, I can open a cat detail view.
- As a user, my collection persists locally.

### Privacy
- As a user, I can use Meowfolio without location permission.
- As a user, I understand that inference runs locally.
- As a user, my precise location is not publicly exposed.

## 10. Functional requirements

### FR-01 Capture
The app must support camera capture on compatible mobile browsers and file upload elsewhere.

### FR-02 Detection
The app must run local object detection and identify cat bounding boxes.

### FR-03 Detection failure
The app must show a recoverable result when no cat is found.

### FR-04 Multi-cat handling
If multiple cats are detected, the user must be able to select the intended crop.

### FR-05 Embedding
The selected cat crop must be converted into a local feature embedding.

### FR-06 Similarity
The app must compare the embedding against stored cat references using cosine similarity.

### FR-07 Human confirmation
The app must never automatically merge a sighting into an existing cat solely from similarity.

### FR-08 Manual naming
New cat names are entered by the user.

### FR-09 Local save
New cats and encounters must be stored in IndexedDB.

### FR-10 Persistence
Saved collection state must survive refresh/reopen.

### FR-11 Optional geolocation
Location collection must require user permission and the core flow must work without it.

### FR-12 Collection
The app must present the user's saved cats.

### FR-13 Detail
The app must show a cat's encounter timeline.

### FR-14 Model state
The UI must communicate model download/loading/error state.

### FR-15 Privacy message
The UI must communicate local processing clearly.

## 11. Non-functional requirements

### NFR-01 Privacy
No captured photo should be sent to a hosted AI API by default.

### NFR-02 Responsiveness
The UI must remain usable while models initialize and inference runs.

### NFR-03 Mobile usability
Primary actions must work comfortably on a phone viewport.

### NFR-04 Graceful degradation
If WebGPU is unavailable, the app should attempt a supported fallback or clearly explain the limitation.

### NFR-05 Recoverability
Model failures, denied permissions, bad images, and storage errors must produce user-facing recovery paths.

### NFR-06 Honesty
Similarity must be described as similarity, not identity certainty.

### NFR-07 Accessibility
Interactive controls need labels, keyboard access where applicable, readable contrast, and meaningful status text.

### NFR-08 First-run transparency
Users should know a local model download may use time and data.

## 12. AI requirements

### Detector
Current choice: `onnx-community/yolov10n`

Responsibilities:
- cat presence,
- bounding boxes,
- confidence scores.

### Feature model
Current choice: `Xenova/dinov2-small`

Responsibilities:
- produce a vector representation for the selected cat crop.

### Similarity
- L2-normalize embeddings.
- Compute cosine similarity.
- Rank saved candidate cats.
- Threshold must be chosen from actual test images, not invented.

### Identity policy
The AI is an assistant for memory retrieval, not an identification authority.

## 13. Data requirements

### Cat
- id
- name
- createdAt
- updatedAt
- coverImage
- referenceEmbedding or reference embeddings
- optional note/tags

### Encounter
- id
- catId
- timestamp
- image
- embedding
- detector confidence
- optional note
- optional latitude/longitude/accuracy

## 14. Key states

The UI must have explicit states for:
- empty collection,
- model not loaded,
- model downloading,
- model ready,
- image selected,
- detecting,
- no cat,
- one cat,
- multiple cats,
- embedding,
- possible match,
- new cat naming,
- saving,
- saved,
- permission denied,
- offline/reload with cached state,
- recoverable error.

## 15. Success metrics

For the hackathon, success is measured by demonstrability rather than growth.

### Required proof
- One complete real-world new-cat flow.
- One repeat/similar-cat flow or controlled demonstration.
- Local persistence shown after reload.
- Local inference explained and demonstrated.
- At least one mobile test.
- Clear privacy behavior.

### Quality targets
These are targets, not guaranteed claims:
- No UI freeze long enough to make the app feel broken.
- User can complete a new-cat save without reading documentation.
- Model-loading state always explains what is happening.
- No location permission is required for completion.

## 16. Risks

### R1 — model downloads are too large
Mitigation:
- test quantized/browser-compatible variants,
- lazy-load only when capture is used,
- show progress,
- avoid adding an LLM.

### R2 — similarity quality is weak
Mitigation:
- frame as candidate retrieval,
- require human confirmation,
- test with multiple images/angles,
- consider multiple embeddings per saved cat if needed.

### R3 — mobile browser inference is slow
Mitigation:
- resize image,
- use cropped cat region,
- prefer WebGPU,
- benchmark early before UI polish.

### R4 — YOLO model licensing complicates release
Mitigation:
- verify the exact model/weights and runtime licenses before final licensing decision,
- document notices,
- if incompatible, replace detector before submission.

### R5 — scope creep
Mitigation:
- MVP document is the cut line,
- no maps/social/PWA until core loop passes.

## 17. Release definition

For the Hacktoberfest submission, Meowfolio is release-ready when:
- the MVP acceptance checklist passes,
- the build is deployed publicly,
- the README explains local AI and privacy,
- model licenses/notices are verified,
- an outdoor demo is recorded,
- the DEV submission article is complete.

## 18. Future possibilities

Not part of the hackathon MVP:
- other animals,
- private map,
- collection export,
- on-device clustering,
- better re-identification models,
- personal discovery statistics,
- optional shared/fuzzed sightings.

Future work must preserve the distinction between **visual similarity** and **verified identity** unless a validated identity method is introduced.
