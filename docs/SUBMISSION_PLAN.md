# Meowfolio Hacktoberfest Submission Plan

Challenge: Hacktoberfest 2026 DEV Challenge — Week 1  
Theme: **Touch Grass**  
Official deadline: **11 October 2026, 11:59 PM PDT**

This document exists because the submission itself is part of the product. The challenge heavily rewards the quality of the write-up, not only the code.

## 1. Submission thesis

Do not pitch Meowfolio as:

> “an AI cat detector.”

Pitch it as:

> **A private real-world cat scrapbook that uses open local AI to turn walks into recurring encounters.**

The best story:

> I wanted an AI project where the AI made me look at the real world more, not at the AI more. So I built Meowfolio, took it outside, and started collecting the neighborhood cats I actually met.

## 2. Judge-facing strengths

### Theme relevance
The user has to leave the screen to create the meaningful content.

The application should make the screen a brief bridge between:
- noticing a cat,
- capturing the memory,
- continuing the walk.

### Open/local AI
The core computer-vision work runs in-browser:
- cat detection,
- visual embedding,
- similarity retrieval.

There is no hosted LLM pretending to be the product.

### Creativity
The interesting mechanic is not species identification.

It is:
> **“Have I met this cat before?”**

The app turns repeat neighborhood encounters into a personal story.

### Technical execution
Demonstrate:
- browser model loading,
- local detection,
- local feature extraction,
- cosine similarity,
- IndexedDB binary/vector persistence,
- optional geolocation,
- WebGPU/fallback behavior,
- honest uncertainty.

### Privacy
Captured photos and precise sighting data do not need to be uploaded to a hosted inference API.

This is both a technical design choice and a user benefit.

---

# 3. What evidence to collect while building

Do not wait until the last hour.

Capture:
- screenshot/video of first model download,
- detector box around a real cat,
- cropped cat,
- new cat naming screen,
- filled scrapbook card,
- cat detail timeline,
- possible familiar-face prompt,
- browser Network panel showing no photo upload during inference,
- mobile view outdoors,
- app after reload with collection intact,
- measured model/inference timings.

Also record:
- what failed,
- what surprised you,
- any threshold experiments,
- model/browser limitations.

These details make the article credible.

---

# 4. Outdoor evidence target

Before submission, aim for:
- at least 3 real cat sightings,
- ideally 2 photos of the same known cat at different moments/angles,
- one no-cat/control test.

A repeated real cat is ideal but not mandatory if nature does not cooperate.

Never stage a false claim that the model independently proved identity.

If the repeat demonstration uses controlled photos, say so.

---

# 5. DEV article structure

## Title candidates

Preferred:
**I Built a Local-AI Scrapbook for the Cats I Meet Outside**

Other:
- **Touch Grass, Find Cats: Building Meowfolio with Local AI**
- **Meowfolio: An Offline-First AI Scrapbook for Neighborhood Cats**
- **I Took Browser AI Outside and Built a Cat Scrapbook**

Avoid leading with “Pokémon Go for cats.” It is a useful explanation in conversation but weakens originality as the main brand.

## Opening

Start with the human behavior:

> I keep seeing the same neighborhood cats, but I never remember where I first met them or whether the orange cat from today's walk is the same one from last week.

Then introduce the constraint:

> For Hacktoberfest's Touch Grass challenge, I wanted AI to be the shortest part of the experience.

Then the solution:
> Meowfolio.

## Section 1 — What Meowfolio does

Show the loop:
1. go outside,
2. photograph cat,
3. local AI detects it,
4. visual embedding checks for familiar cats,
5. user confirms,
6. name/save,
7. scrapbook grows.

Use a GIF/video/screenshot sequence.

## Section 2 — Why local AI

Explain:
- photos can contain houses/people,
- sightings can contain coordinates,
- hosted inference is unnecessary,
- model runs in browser.

Be precise:
model files are still downloaded from their hosting source unless self-hosted.

## Section 3 — The AI pipeline

Explain clearly without pretending the system does more than it does:

```text
Photo
 → YOLOv10n cat detection
 → crop
 → DINOv2-small embedding
 → cosine similarity
 → possible familiar cat
 → human confirmation
```

Important sentence:

> DINOv2 is not a cat biometric system. Meowfolio uses visual similarity to help jog your memory; the user always decides identity.

This honesty is a strength, not an apology.

## Section 4 — The scrapbook

Show:
- names chosen by user,
- encounter counts,
- timeline,
- local storage,
- optional location.

Explain why no LLM names cats:
> Naming the cat is part of the memory. Outsourcing that to an LLM would make the interaction less personal, not more intelligent.

## Section 5 — I took it outside

This should be the strongest section.

Tell a short chronological story:
- loaded app,
- walked outside,
- found first cat,
- captured,
- model behavior,
- named cat,
- later encounter,
- what failed in sunlight/network/motion,
- what you changed.

Use real photos/screenshots if safe and appropriate.

## Section 6 — Technical decisions

Cover:
- React/TypeScript/Vite,
- Transformers.js,
- IndexedDB,
- Canvas crop,
- optional Geolocation API,
- WebGPU/fallback,
- no backend.

## Section 7 — What did not work perfectly

Strong candidates:
- first model download,
- mobile inference speed,
- similar-looking cats,
- angle sensitivity,
- cache eviction,
- browser differences.

Do not hide limitations.

## Section 8 — What is next

Keep brief:
- better local re-identification research,
- private map,
- export/import,
- other animals only after cats are excellent.

End by returning to the theme:
> The best sign that Meowfolio works is that using it gives me a reason to close the laptop and go see who is outside.

---

# 6. Demo video plan

Target: concise, no dead time.

## Scene 1 — Hook
Outside or about to go outside.

Show:
> “This is Meowfolio. The cats are real; the AI stays on my device.”

## Scene 2 — Empty/partial collection
Quickly show existing scrapbook.

## Scene 3 — Capture
Photograph a real cat or use a clearly disclosed field recording.

## Scene 4 — Local processing
Show:
- detector state,
- detection,
- embedding/match state.

Mention:
- open models,
- browser inference.

## Scene 5 — Human decision
If new:
- name cat.

If match:
- show “possible familiar face,”
- confirm manually.

## Scene 6 — Save
Show cat entering collection / encounter count increasing.

## Scene 7 — Persistence
Refresh/reopen and show collection remains.

## Scene 8 — Privacy proof
Briefly state:
- photo/embedding/location are local,
- no hosted inference backend.

## Scene 9 — Close
Show the real-world cat/area rather than ending on a dashboard.

---

# 7. README checklist

README should contain:

- [ ] strong hero statement,
- [ ] screenshot/GIF,
- [ ] why it exists,
- [ ] Touch Grass alignment,
- [ ] feature list,
- [ ] local AI pipeline diagram,
- [ ] models and links,
- [ ] honest identity limitation,
- [ ] privacy model,
- [ ] local development instructions,
- [ ] deployment link,
- [ ] browser requirements,
- [ ] known limitations,
- [ ] model/runtime licenses and notices,
- [ ] hackathon attribution.

Avoid:
- walls of badges,
- inflated “AI-powered” language,
- fake metrics,
- claims of offline first-use unless proven.

---

# 8. Judging-criteria mapping

## Writing Quality
Evidence:
- chronological field story,
- clear diagrams,
- measured results,
- honest limitations,
- concise technical explanations.

## Relevance
Evidence:
- outdoor loop is product core,
- screenshots/video outside,
- screen is intentionally brief.

## Creativity
Evidence:
- repeat encounters,
- human-named cat scrapbook,
- visual similarity as memory assistance rather than species classification.

## Technical Execution
Evidence:
- two-model local pipeline,
- browser inference,
- persisted embeddings/images,
- WebGPU/fallback,
- measured behavior,
- tests.

## Partner technology
Only include if a partner integration truly improves the product.

Do not weaken the submission by forcing one in.

---

# 9. Claims discipline

### Safe claims
- “Runs model inference locally in the browser” if verified.
- “Uses visual similarity to suggest possible familiar cats.”
- “Stores the scrapbook locally in IndexedDB.”
- “Location is optional.”
- “No hosted AI inference is required.”

### Claims requiring measurement
- “fast”
- exact inference time,
- model download size,
- offline behavior after cache,
- browser support.

Measure before stating.

### Claims to avoid
- “recognizes individual cats accurately”
- “biometric cat recognition”
- “works fully offline” unless all required assets are demonstrably cached
- “never sends anything to the internet”
- “100% private”
- “same cat probability”

---

# 10. Submission-day checklist

## Product
- [ ] deployed URL works in incognito/new session,
- [ ] model download works,
- [ ] mobile core flow works,
- [ ] IndexedDB persistence works,
- [ ] privacy claim verified,
- [ ] no P0/P1 bugs.

## Repository
- [ ] README complete,
- [ ] docs current,
- [ ] clean public repo,
- [ ] license decision correct,
- [ ] attribution/notices,
- [ ] no secrets,
- [ ] meaningful commit history.

## Media
- [ ] hero screenshot,
- [ ] capture screenshot,
- [ ] local AI screenshot,
- [ ] scrapbook screenshot,
- [ ] outdoor photo/video,
- [ ] demo video accessible.

## Article
- [ ] challenge template used correctly,
- [ ] correct tags,
- [ ] repo link,
- [ ] live demo link,
- [ ] video link,
- [ ] architecture explained,
- [ ] limitations included,
- [ ] proof of outdoor use included,
- [ ] proofread on mobile and desktop.

---

# 11. Final positioning

The submission should leave the judge remembering one sentence:

> **Meowfolio uses local AI not to generate more things to look at on a screen, but to help you remember the real cats you met after you put the screen away.**
