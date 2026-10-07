# MEOWFOLIO — FULL PROJECT CONTEXT

> Authoritative working context for AI coding assistants, reviewers, and contributors.
>
> Read this file before proposing architecture, adding features, changing the AI pipeline, or writing submission copy.

Last updated: 7 October 2026  
Repository: https://github.com/ThunderKhan/meowfolio  
Hackathon: Hacktoberfest 2026 DEV Challenge — Week 1  
Theme: **Touch Grass**

---

# 1. PROJECT IN ONE SENTENCE

**Meowfolio is a private, browser-first scrapbook for real cats you discover outside: photograph a cat, run local AI on-device to validate and visually fingerprint the sighting, name the cat yourself, save the encounter, and build a personal collection over time.**

Short pitch:

> **Meowfolio — your personal scrapbook of the cats you meet outside.**

The product should feel like a real-world collecting game, but it is not a Pokémon clone and should not use Pokémon branding, terminology, assets, mechanics, or copyrighted visual language.

---

# 2. THE CORE IDEA

The emotional loop is more important than the AI demo.

The user should want to go outside because they may meet another cat.

Core loop:

1. Go outside.
2. Find a real cat.
3. Photograph it.
4. Local object-detection AI confirms that a cat is present and crops the cat.
5. Local feature-extraction AI produces a visual embedding/fingerprint.
6. Compare the embedding against previously saved cats.
7. If there is a plausible visual match, ask the user whether this is a cat they have seen before.
8. The user decides whether it is an existing cat or a new cat.
9. For a new cat, the **user names it manually**.
10. Save the sighting to the user's private Meowfolio.
11. Over time, repeated sightings create a small encounter history for each cat.

The screen should be the shortest part of the experience. The application exists to make real-world walks and encounters more memorable, not to keep people scrolling.

---

# 3. PRODUCT PRINCIPLES

These are high-priority constraints.

## 3.1 Real world first

Meowfolio should make users leave the screen and notice the animals around them.

Do not turn the product into:
- a generic chat app,
- a social feed,
- an endless content app,
- a generic image classifier,
- a virtual-pet simulator,
- or an AI-generated story app.

## 3.2 Human naming is intentional

There is **no LLM requirement for naming cats**.

The user should name each cat themselves.

This is not a missing feature. It is a deliberate product choice because naming creates personal attachment and memory.

Do not add an LLM merely to generate:
- cat names,
- fake personalities,
- generic captions,
- filler descriptions,
- or chat responses.

If an LLM is ever introduced later, it must solve a real product problem rather than exist as an AI gimmick.

## 3.3 Local AI is the core technical story

The important AI work happens in the browser/on the user's device.

The user's cat photo should not need to be uploaded to a hosted inference API just to detect or compare cats.

Open/local AI matters here because:
- personal photos stay on the device,
- location-linked animal sightings can stay private,
- the app can continue working after the model is cached,
- inference does not require a paid API,
- and the open models can be inspected or replaced.

## 3.4 AI suggests; the human decides identity

Visual similarity is **not reliable biometric identification of an individual cat**.

Different cats can look similar. The same cat can also look very different because of angle, lighting, distance, age, occlusion, or seasonal coat changes.

Therefore:

> The model may say **"This looks similar to Mochi"**, but it must never automatically assert **"This is Mochi."**

The user confirms whether a repeated sighting is the same cat.

---

# 4. HACKATHON CONTEXT

## 4.1 Event

Hacktoberfest 2026 DEV Challenges run multiple build challenges through October.

Week 1:
- Challenge: Hacktoberfest Open-Source AI Challenge — Week 1
- Theme: **Touch Grass**
- Starts: **5 October 2026**
- Submission deadline: **11 October 2026 at 11:59 PM PDT**
- Winner announcement: week of 12 October

Official challenge:
https://dev.to/challenges/hacktoberfest-week1-2026-10-05

Official rules:
https://dev.to/page/hacktoberfest-week1-2026-10-05-contest-rules

Hacktoberfest activities:
https://hacktoberfest.com/activities/

## 4.2 Main prompt

The challenge asks entrants to:

> Build something with open-source AI at its core.

Qualifying approaches include:
- open-weight models,
- open-source AI frameworks/tools,
- local inference,
- or combinations of these.

The open-source/open-weight component must be meaningful to how the project works.

## 4.3 Week 1 theme

**Touch Grass**

The project should use open-source/open-weight AI to get people away from the screen and into the world.

The challenge explicitly emphasizes that the strongest projects should make the screen the shortest part of the experience.

Meowfolio's core mechanic is designed around that requirement.

## 4.4 Submission constraints

Important:
- This is a **new project**, built during this challenge window.
- This year's challenge is not about counting pull requests to existing repositories.
- A published DEV submission using the challenge template/tag is required.
- One entry may be submitted for this challenge.

## 4.5 Judging criteria

The challenge page lists:
1. Writing Quality — weighted most heavily
2. Relevance to the Prompt and Theme
3. Creativity
4. Technical Execution
5. Use of Partner Technology — optional

Do not bolt on partner technology solely for prize eligibility if it weakens the core product.

## 4.6 Submission-story advantage

The final submission should not merely show screenshots from a desk.

The strongest narrative is:

> "I built a private local-AI scrapbook for neighborhood cats, then took it outside and used it to fill my own Meowfolio."

Before submission, test the real flow outdoors with actual sightings if possible and document:
- first cat discovered,
- local model loading,
- detection result,
- naming,
- saved encounter,
- collection growth,
- and ideally one repeated/similar sighting.

---

# 5. NAME AND BRAND

Project name: **Meowfolio**

Name logic:
- "Meow" = cat
- "folio" = portfolio / collection / scrapbook

The name should evoke a personal collection rather than a Pokédex clone.

Preferred one-line copy:

> **Meowfolio — your personal scrapbook of the cats you meet outside.**

Alternative technical description:

> A private, local-AI field scrapbook for the cats you discover in the real world.

Tone:
- warm,
- curious,
- playful,
- calm,
- personal,
- outdoorsy,
- not childish,
- not overloaded with gaming jargon.

---

# 6. MVP SCOPE

The MVP should be small and polished.

## Must have

1. Mobile-friendly web application.
2. Take/upload a cat photo.
3. Run cat detection locally in the browser.
4. Reject or warn when no cat is detected.
5. Crop/use the detected cat region.
6. Generate a local visual embedding for the cat.
7. Compare it against existing saved cats.
8. Suggest possible visual matches without claiming identity.
9. Let the user:
   - confirm an existing cat, or
   - create a new cat.
10. User manually names a new cat.
11. Save:
   - cat name,
   - representative image,
   - embedding,
   - first seen timestamp,
   - encounter timestamps,
   - optional note,
   - optional location if permission is granted.
12. Collection/scrapbook view.
13. Cat detail page with encounter history.
14. Local/private persistence.
15. Clear model-download/loading state.

## Nice to have

Only after the core loop is solid:
- map of sightings,
- approximate location display,
- installable PWA,
- offline shell,
- lightweight achievements,
- filters/search,
- export/import local collection,
- multiple photos per cat,
- decorative scrapbook/sticker presentation.

## Explicitly out of MVP scope

Do not spend hackathon time on:
- social networking,
- public global animal map,
- accounts/auth unless strictly necessary,
- cloud backend unless strictly necessary,
- comments/likes/following,
- multiplayer,
- AR overlays,
- chatbots,
- AI-generated cat names,
- AI-generated fictional biographies,
- breed prediction presented as fact,
- veterinary advice,
- advanced individual-animal recognition,
- dogs/birds/all animals,
- complex gamification.

**Cats only for the hackathon MVP.**

Expansion to other animals can happen later.

---

# 7. LOCAL AI PIPELINE

The current prototype plan uses **two local browser models**.

## 7.1 Model A — cat/object detection

Current choice:

**Xenova/yolos-tiny**

Pinned revision:
`e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`

Purpose:
- detect whether a cat is present,
- return the cat bounding box,
- crop the relevant region before feature extraction.

Model page:
https://huggingface.co/Xenova/yolos-tiny

Runtime:
- Transformers.js / ONNX in the browser.

Why this model:
- real Chromium/WASM testing passed cat detection with the `uint8` artifact,
- Transformers.js 4.3.0 directly supports the YOLOS object-detection architecture,
- the upstream `hustvl/yolos-tiny` model is Apache-2.0,
- it replaces the original YOLOv10n candidate, which failed because Transformers.js 4.3.0 did not support the `yolov10` model type.

Important licensing note:
- the original AGPL-marked YOLOv10n candidate is no longer part of the selected pipeline,
- verify final conversion/source attribution and dependency notices before release.

## 7.2 Model B — visual feature extraction

Current choice:

**Xenova/dinov2-small**

Purpose:
- turn the cropped cat image into a feature vector/embedding,
- compare that vector against embeddings from cats already stored in the user's collection.

Model page:
https://huggingface.co/Xenova/dinov2-small

Original model:
https://huggingface.co/facebook/dinov2-small

Runtime:
- Transformers.js / ONNX in the browser.

The upstream DINOv2 small model is published under Apache-2.0.

Expected embedding size from the model configuration:
- hidden size: 384

## 7.3 Similarity

Initial approach:
- normalize embeddings,
- use cosine similarity,
- retrieve the closest stored cats,
- show a possible match only above an empirically tested threshold.

Do not hard-code a confidence threshold and call it scientifically validated without testing.

The UI wording should be cautious, for example:

> **Possible familiar face**
>
> This cat looks visually similar to Mochi.
>
> Same cat / New cat

Never:

> We identified this cat as Mochi.

## 7.4 No LLM in the core pipeline

The hackathon MVP does **not** need an LLM.

The essential AI is computer vision:
- object detection,
- feature extraction,
- similarity search.

This is enough to satisfy the local/open AI thesis if executed well.

---

# 8. HOW THE MODELS REACH THE BROWSER

Intended deployment behavior:

1. User opens the deployed Meowfolio web app.
2. The JavaScript application loads the required Transformers.js runtime.
3. On first use of AI features, the browser downloads model files.
4. Model assets should be cached by the browser / supported model cache.
5. Subsequent runs should reuse cached assets when possible.
6. Inference runs locally with browser execution providers.
7. Prefer WebGPU when supported.
8. Provide a compatible fallback such as WASM/CPU where practical.

The product must clearly communicate first-run model loading because a model download can take noticeable time or mobile data.

Example UX:

> Preparing local AI…
> Downloading the cat detector for first use.
> This happens once and future scans can reuse the cached model.

Do not pretend the initial model download is zero-cost or instant.

---

# 9. LOCAL DATA MODEL

The application should be privacy-first and local-first.

A practical browser storage target is **IndexedDB** because Meowfolio needs to store structured records and image blobs.

Conceptual records:

## Cat

- id
- name
- createdAt
- updatedAt
- coverImage
- referenceEmbedding
- optional notes/tags

## Encounter

- id
- catId
- timestamp
- image
- embedding
- detection confidence
- optional note
- optional location

## Location

If the user grants permission:
- latitude
- longitude
- accuracy
- timestamp

Precise coordinates should remain private/local by default.

If a map is shown, consider displaying an approximate area rather than exposing an exact home/street location.

---

# 10. PRIVACY AND SAFETY

This is a core product requirement, not polish.

## 10.1 Photos

Default architecture:
- photos stay on-device,
- AI inference runs on-device,
- no automatic upload to a third-party inference API.

## 10.2 Location

Never require location just to use Meowfolio.

Location is opt-in.

If the user declines geolocation:
- the app should still work,
- the sighting can be saved without coordinates.

## 10.3 Public maps

Do not build a public exact-location map of cats for the hackathon MVP.

Reasons:
- a pet's location may reveal where its owner lives,
- repeated timestamps can reveal routines,
- exact locations of animals can create welfare/privacy concerns.

A future sharing feature should fuzz/approximate location and require explicit consent.

## 10.4 People in photos

Cat photos may accidentally include people, houses, license plates, or addresses.

Do not automatically upload those images.

Do not add face recognition.

---

# 11. USER EXPERIENCE

The desired emotional experience is:

> "I went for a walk, met a cat, and now that encounter belongs in my little scrapbook."

A discovery should feel rewarding without becoming noisy or manipulative.

Possible first-discovery flow:

1. Camera/photo screen.
2. "Looking for a cat locally…"
3. Detector finds cat.
4. "Cat found 🐾"
5. Similarity check.
6. If no good match:
   - "New cat?"
   - ask the user to name it.
7. Save.
8. Show a scrapbook card.

Possible repeat flow:

1. Capture.
2. Detect.
3. Compare.
4. "Possible familiar face: Mochi"
5. User confirms.
6. Add encounter to Mochi's timeline.

The UI should make local processing visible:

> **Processed on your device.**

---

# 12. SCRAPBOOK / COLLECTION DESIGN

The collection is the emotional center of Meowfolio.

A card may show:
- photo,
- chosen name,
- number of encounters,
- first-seen date,
- optional approximate place label.

Example:

> **Mochi**
>
> 3 encounters
> First met Oct 7

Cat detail view:
- cover image,
- user-created name,
- notes,
- first seen,
- encounter count,
- encounter timeline,
- optional sighting map/list.

Avoid manufactured rarity scores unless there is a defensible mechanic behind them.

---

# 13. TECHNICAL REALITY CHECKS

Future AI assistants must preserve these caveats.

## 13.1 DINOv2 is not an individual-cat identity model

DINOv2 produces useful visual representations, but this does not magically make it a robust cat re-identification system.

Treat matching as **visual similarity assistance**.

The user is the source of truth.

## 13.2 Object detection may fail

YOLO can:
- miss a distant cat,
- confuse an object,
- detect multiple animals,
- return poor crops.

The UI needs graceful failure and retry.

If several cats are present, allow the user to choose the relevant detected cat if needed.

## 13.3 Browser hardware varies

WebGPU support and performance vary.

The app must:
- detect capability,
- communicate loading,
- avoid freezing the main UI,
- and degrade gracefully.

## 13.4 Model size matters

This is a browser application.

Do not casually add hundreds of megabytes of additional model weights.

Every model must justify:
- download cost,
- memory use,
- latency,
- and user benefit.

---

# 14. SUCCESS CRITERIA FOR THE HACKATHON

A strong submission should prove the complete loop rather than present a large feature list.

Minimum successful demo:

1. Open Meowfolio on a phone/laptop.
2. Show the local model loading.
3. Photograph/upload a real cat.
4. Detect the cat locally.
5. Create embedding locally.
6. Save a new cat.
7. Name the cat manually.
8. Show it in the scrapbook.
9. Add a second encounter or demonstrate possible visual matching.
10. Show that data persists after refresh/reopen.
11. Explain that inference and collection data stay local.

An excellent submission additionally demonstrates the app outside with actual cats.

---

# 15. DEVELOPMENT PRIORITIES

Order of work:

## P0 — prove feasibility

Before visual polish:
1. Load detector in browser.
2. Detect cat from a test image.
3. Crop cat correctly.
4. Load DINOv2 in browser.
5. Generate embedding.
6. Compare two embeddings.
7. Measure download, memory, and inference behavior on realistic hardware.

## P1 — complete core loop

1. Capture/upload.
2. Detect.
3. Compare.
4. New/existing decision.
5. Manual naming.
6. IndexedDB persistence.
7. Collection.
8. Cat detail/encounter history.

## P2 — submission polish

1. Mobile UX.
2. Loading/error states.
3. Privacy messaging.
4. Outdoor testing.
5. Screenshots/video.
6. README.
7. DEV submission article.

## P3 — optional extras

Only if P0-P2 work:
- map,
- PWA install/offline shell,
- export/import,
- tasteful micro-interactions.

---

# 16. WHAT NOT TO DO

Future AI assistants should not:

- turn Meowfolio into a generic "identify any animal" app,
- add an LLM just because the challenge mentions AI,
- auto-name cats,
- claim DINOv2 can definitively identify an individual cat,
- auto-publish precise animal locations,
- require cloud inference,
- require authentication for the basic local scrapbook,
- add a backend before there is a demonstrated need,
- expand to dogs/birds before the cat loop works,
- copy Pokémon visual assets or terminology,
- spend the challenge on architecture that does not improve the demo,
- sacrifice the outdoor experience for a feature-heavy dashboard.

---

# 17. OPEN QUESTIONS

These decisions are intentionally not locked yet:

- frontend framework and exact UI stack,
- whether model assets are fetched from Hugging Face at runtime or self-hosted,
- exact model quantization variants,
- similarity threshold,
- whether embeddings are averaged across multiple encounters,
- exact IndexedDB schema,
- whether a map makes the MVP,
- map provider/library if a map is included,
- deployment provider,
- final repository license after checking all model/runtime licensing.

When making these decisions:
1. prefer the smallest solution that preserves the demo,
2. benchmark rather than guess,
3. keep private/local behavior as the default,
4. document tradeoffs.

---

# 18. CURRENT DECISIONS — DO NOT SILENTLY OVERRIDE

As of 7 October 2026:

- Project name: **Meowfolio**
- Scope: **cats only**
- Product form: **browser-first web application**
- Core challenge theme: **Touch Grass**
- AI execution: **local/on-device browser inference**
- Object detector: **Xenova/yolos-tiny**
- Visual feature model: **Xenova/dinov2-small**
- Cat names: **chosen by the user**
- LLM: **not part of the MVP**
- Matching: **similarity suggestion, never definitive identity**
- Collection: **private/local-first**
- Location: **optional**
- Exact public cat locations: **not allowed in MVP**
- Priority: **one polished outdoor capture → scrapbook → repeat-encounter loop**

If a future assistant believes one of these decisions should change, it should explain:
- what problem the change solves,
- evidence that the current approach fails,
- performance/privacy/licensing tradeoffs,
- and the smallest migration path.

Do not silently redesign the project.

---

# 19. SOURCES

Hacktoberfest / DEV:
- https://dev.to/challenges/hacktoberfest-week1-2026-10-05
- https://dev.to/page/hacktoberfest-week1-2026-10-05-contest-rules
- https://dev.to/challenges/hf26
- https://hacktoberfest.com/activities/

Models:
- https://huggingface.co/Xenova/yolos-tiny
- https://huggingface.co/Xenova/dinov2-small
- https://huggingface.co/facebook/dinov2-small

---

# 20. INSTRUCTIONS TO AI ASSISTANTS

When helping with Meowfolio:

1. Read this file before making architectural recommendations.
2. Treat the decisions in Section 18 as current project constraints.
3. Prefer implementation over speculative feature expansion.
4. Keep answers grounded in the Hacktoberfest deadline and MVP.
5. Preserve privacy-first/local-first behavior.
6. Never present uncertain cat identity as fact.
7. Do not introduce an LLM without a concrete reason.
8. Do not add dependencies or services without explaining their purpose.
9. If recommending a different AI model, compare:
   - browser compatibility,
   - model download size,
   - latency,
   - memory,
   - license,
   - accuracy for the required task.
10. If official challenge rules conflict with this file, the official rules win and this file should be updated.
11. If code and this document diverge, explicitly call out the divergence rather than guessing which is correct.

---

END OF CONTEXT.
