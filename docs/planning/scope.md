---
doc: scope
status: approved
---

# Meowfolio

A private, browser-first scrapbook of the real cats you meet outside, with local AI suggesting familiar faces and you deciding who they are.

## The Unique Kernel
Random cat sightings become an ongoing personal history. The memorable moment is photographing a cat on a later walk and seeing the name you gave it appear as a possible familiar face—not an asserted identity.

## Who It's For
First, the learner walking outside with their own Android phone and current Chrome, noticing cats and wanting to remember them across encounters. Their existing method of recording sightings has not been specified.

## The Core Loop
Go outside → photograph a real cat → detect, crop, embed, and compare locally → confirm a possible familiar cat, manually choose an existing cat, or name a new one → optionally add a note or location → save → see the scrapbook entry or increased encounter count → put the phone away and keep walking.

Reopening the app later shows the saved cat and encounter history. A later sighting gives a reason to return.

## Inspiration & Identity
The Touch Grass theme is the motivation: the screen should be the shortest part of the experience. Existing context.md describes a warm, curious, calm, personal, outdoorsy scrapbook. Human naming creates attachment; there are no generated identities or fictional biographies.
Challenge reference: https://dev.to/challenges/hacktoberfest-week1-2026-10-05

## Why This Matters to the Learner
Learn to make browser-local model loading, inference, embeddings, similarity matching, and persistence practical without a cloud AI API. Challenge assumptions early, trace requirements into implementation, and avoid a feature-heavy build whose core does not work.

## What "Working" Looks Like
On the learner's Android phone in current Chrome, complete the full outdoor loop using real photos and normal app controls, with no developer-only steps. A new cat appears in the scrapbook; a confirmed repeat increases its encounter count. Close and reopen the app and verify that the cat and history remain. Saving should be brief enough to resume the walk; a measured time target is not yet set.

Separately evaluate useful similarity with roughly 8–12 known cats and 40–60 real photos (approximately 4–6 usable photos per cat), including similar-looking different cats. Keep an independent held-out set untouched until the strategy and conservative threshold are fixed using development photos. Repeat photos should usually rank the correct saved cat among the strongest candidates; different cats should not trigger false familiar-face suggestions. False negatives are acceptable; manual selection remains available. Indoor photos support controlled matching evaluation, not an outdoor-use claim; actual Android/outdoor capture-to-save encounters separately prove the product loop.

Evaluation size revised explicitly by the learner during technical planning; this strengthens evidence without expanding product features.

This small trial supports a PoC, not a general recognition-accuracy claim. If separation is inadequate, the pipeline may work technically but familiar-face matching is not proven. Revisit or reduce matching with the learner rather than presenting it as successful.

## The POC Boundary
- Target: the learner's Android phone/current Chrome. Windows Chrome supports debugging and profiling; broad browser support is not a release gate.
- Real camera/photo input, local cat detection and crop, local embedding and comparison using the current model choices: onnx-community/yolov10n and Xenova/dinov2-small.
- Human-confirmed identity, manual existing-cat selection, manual naming, optional notes and opt-in private location.
- Local persistence, scrapbook, encounter count, and encounter history.
- Visible initial model download/loading, usable no-cat/retry/failure states, and relevant-cat selection when several are detected. No silent identity assignment or photo upload.
- Validate a practical fallback when WebGPU is unavailable; do not claim untested hardware support. Exact fallback and performance acceptance criteria belong in the technical plan.
- Budget: roughly 12–16 focused hours before October 11, 2026. Sequence: real-device detector/crop/embedding/similarity trial → complete saved-encounter loop → mobile usability, failures, privacy checks, and outdoor testing → optional polish.
- If inference is impractical or matching fails, revisit the approach early with the learner. Existing model decisions are not silently replaced.
- Prepare evidence of the real outdoor loop for the Hacktoberfest DEV submission. The curriculum's 2–4-hour estimate and Devpost shipping requirements do not replace this project's stated event target.

## Later
Other browser validation, installable PWA/offline shell, private maps, export/import, achievements, and decorative polish. These do not establish the core proof and must not displace feasibility or outdoor testing.

## Explicitly Cut
- Accounts, social features, and cloud backend/inference: unnecessary for a private local scrapbook and its learning goal.
- Public exact-location maps: incompatible with the project's private sighting boundary.
- Automatic identity assignment, AI naming, and fictional biographies: the human owns identity and attachment.
- Other animals and broader game mechanics: distract from proving the cat encounter loop.

## Relationship to Existing Plans
This draft narrows validation to Android Chrome and the stated time budget. It makes manual existing-cat selection required, where docs/MVP.md currently describes it as optional. Existing planning files remain reference material; approval here should carry this refinement into downstream requirements. Detailed performance limits and a reproducible similarity evaluation procedure remain for PRD/spec work, not invented scope metrics.
