---
doc: prd
status: approved
---

# Meowfolio — Product Requirements

A private scrapbook for the real cats the learner meets outside, first on their Android phone in current Chrome. Local AI suggests familiar faces; the person names cats and confirms identity.

Source: `scope.md > The Unique Kernel`, `Who It's For`, and `The POC Boundary` (approved).

## The Core Journey
1. First use opens a single brief welcome explaining on-device AI, the first-scan model download, and optional location. Choose **Start my Meowfolio**.
2. The empty scrapbook invites the first encounter. Choose **Spot a cat**, take or select a photo, inspect the preview, and replace it if needed.
3. Choose **Find the cat**. If required models are unavailable, read the preparation explanation before choosing **Download models & continue**. Otherwise proceed directly into local processing.
4. Detect the cat. If several cats are detected, choose the intended crop; if none are detected, choose another photo. Create the visual representation and compare with saved cats locally.
5. Review a possible familiar face, or a normal no-suggestion state. Confirm the suggestion, manually choose an existing cat, or add a new cat.
6. For a new cat, enter a name. For either path, optionally add an encounter note and location. Explicitly save.
7. Only after the encounter has been saved locally, show success with **View [name]** and **Back to collection**.
8. Put the phone away. On returning, the scrapbook retains the cat, encounter count, and sighting history. Repeat the loop on a later walk.

Source: `scope.md > The Core Loop` and `What "Working" Looks Like`.

## Screens and Layout
These are user-facing surfaces/states, not a requirement for separate pages or routes.

| Surface | Main content and actions |
| --- | --- |
| Welcome | One short explanation and **Start my Meowfolio**; no tutorial carousel. |
| Collection | Image-first cat cards; easy-to-reach **Spot a cat**; inviting empty state. |
| Capture / preview | Take or choose a photo, inspect it, replace it, then **Find the cat**. |
| Preparation / processing | Explanation before consent; the same preparation screen becomes progress/status after consent. Clear local-processing status. |
| Detected-cat selection | Selectable crops when multiple cats are detected. |
| Identity decision | New crop and, when suggested, saved cover photo, name, and encounter count; clear identity choices. |
| Existing-cat picker | Photos, names, and useful encounter counts; select and confirm the intended cat. |
| Encounter save | Selected photo and identity, name for new cats, optional encounter note/location, explicit save, and recoverable errors. |
| Save success | Confirmation with **View [name]** and **Back to collection**. |
| Cat detail | Cover photo and name above dates/count; sighting photos, timestamps, notes, and saved location in the history below. |

Source: `scope.md > The Core Loop` and `The POC Boundary`.

## Look and Feel
- Feel like opening a personal scrapbook: “these are the cats you’ve met,” not a dashboard of stored data.
- Use a **late-1990s/2000s pink pixel-scrapbook** visual language: candy-pink/checkerboard canvas, pale-pink/cream surfaces, deep plum text, hot-pink primary actions, square/beveled controls, chunky 2px borders, pixel-offset shadows, faux desktop-window chrome, tiny stickers/hearts/stars, and system monospace/bitmap-adjacent typography without a network font.
- Large cat photography remains the strongest visual element. The retro chrome frames the memories rather than competing with them; navigation stays minimal and mobile controls remain large and readable.
- Modern and clean, personal and handmade without becoming childish or overly cute. Exact typefaces are not yet chosen; prioritize readability.
- Avoid generic AI gradients, neon/cyberpunk styling, pervasive glassmorphism, admin-dashboard layouts, Pokémon-like visual language/trade dress, excessive animation, and decoration that obscures the cat photos or interaction hierarchy.

Source: `scope.md > Inspiration & Identity`; refined by the learner’s collection/detail direction.

## Features and Behavior

### F1 — Welcome and Photo Preview
The one-screen welcome explains on-device detection and visual matching, noticeable first-download time/data use, and that location is requested only when explicitly added. It does not start model downloads or request location. There are no account, notification, or tutorial gates.

After entering the scrapbook, **Spot a cat** leads to taking or choosing a photo. Preview and replacement precede expensive processing.

Acceptance criteria:
- A new user can reach preview through the stated welcome → scrapbook → capture path.
- Opening the app, passing the welcome, and previewing a photo do not start model downloads or inference.
- Replacing a photo updates the preview; **Find the cat** acts on the selected photo.
- Returning users can access their saved scrapbook without being forced through model preparation.

Source: `scope.md > The Core Loop` and `The POC Boundary`.

### F2 — Model Preparation and Local Processing
When required model files are unavailable, **Find the cat** opens **Preparing local AI** without beginning their download. Explain detector and visual-matching model preparation, noticeable first-use data/time, possible cache reuse without promising permanence, and that the photo is not sent to a hosted inference service.

**Download models & continue** authorizes download and immediately transitions that same screen into progress/status. Show an approximate size only when grounded in the actual required files. Going back from the explanation preserves the selected photo. If files are available, **Find the cat** proceeds to local processing without download consent again; if cached files disappear, show the explanation again before redownloading.

Acceptance criteria:
- With models absent, no model file download starts before explicit download confirmation.
- Declining preparation returns to the selected photo without a download.
- Confirming starts preparation, shows truthful progress/current phase, and continues the selected photo into detection when ready.
- Model-ready scans bypass download confirmation. Download size and progress are not fabricated.
- A preparation failure offers retry or return to collection; retry retains the selected photo.
- Back during download/preparation or detection/embedding/comparison stops the active work where possible and returns to photo preview with the selected photo retained. Already cached model files need not be deleted. Processing may restart on the next attempt; a cancelled result must not advance the flow.
- Processing remains visibly active and the interface responsive. A practical WebGPU-unavailable fallback is validated on the target device; untested browser support is not claimed.
- Photos and inference remain on-device; model downloads are distinguished from photo uploads.

Source: `scope.md > The POC Boundary`. Failure/retry behavior carried from `docs/USER_FLOWS.md > Flow F — Model first-use`.

### F3 — Detection and Cat Selection
One detected cat proceeds using its crop. Multiple detected cats produce a selection of crops and the user chooses one intended subject. No detected cat produces a clear **No cat found** state with the original photo and an option to try another photo, not a save-as-cat bypass.

Acceptance criteria:
- With one detected cat, that subject feeds the identity decision.
- With multiple detected cats, no identity decision is made until the user selects a crop; only the selected subject is used.
- A no-cat result gives an understandable recovery action and does not create a scrapbook entry.

Source: `scope.md > The POC Boundary`; existing `docs/USER_FLOWS.md > Flow D — Multiple cats in one photo` and `Flow E — No cat detected`.

### F4 — Identity Decision and Manual Selection
Show a single plausible candidate as **Possible familiar face**, with “This cat looks visually similar to **[name]**. Is it the same cat?” Show the new crop, saved cover photo, name, and **Met N times**. Do not show a raw similarity score or invented probability.

Actions:
- **Yes, it’s [name]** → encounter save for that cat.
- **No, this is a new cat** → new-cat naming/save.
- **Choose another saved cat** → picker, then explicit selection confirmation and encounter save.

When saved cats exist but there is no useful suggestion, show **No familiar cat suggested** as an ordinary outcome with **Choose an existing cat** and **Add as a new cat**.

When the collection is empty, skip saved-cat comparison and familiar-face language. Show the detected crop with **This looks like a new cat** and **Name this cat**, leading to naming, optional note/location, and explicit save. An optional explanation may say: “Your Meowfolio is empty, so there are no saved cats to compare with yet.” Do not show **Choose an existing cat**, **No match found**, or an error/fallback presentation. Local detection and embedding still run for this first encounter.

Acceptance criteria:
- The crop and saved candidate photo can be compared before choosing identity.
- Manual existing-cat selection is available even when AI makes no suggestion; photos and names make the picker recognizable.
- Accepting, rejecting, or manually overriding a suggestion does not itself save anything.
- No identity is automatically assigned or merged. All paths require the person’s decision and a later explicit save.
- Lack of a suggestion never prevents saving to a manually chosen existing cat.
- With no saved cats, processing leads to the welcoming new-cat state with the crop and **Name this cat**; no familiar-face, failed-match, or existing-cat action appears.

Source: `scope.md > The Unique Kernel`, `The Core Loop`, and `Relationship to Existing Plans`.

### F5 — Encounter Save and Optional Location
The photo and encounter timestamp are already present. New cats require a manually entered name; existing cats retain their chosen identity. A note belongs only to this encounter. Location is requested only through an explicit add-location action.

Names are required, trimmed of leading/trailing whitespace, non-empty after trimming, and at most 40 characters. Support Unicode, including non-English names, accents, symbols, and normal punctuation. Do not add a profanity filter or unrelated character restrictions. Different cats may share the same name; each cat has a distinct internal identity independent of its name. Never automatically append suffixes such as “2”, “(1)”, or “_02”. For same-name cats, use their photos, encounter counts, and first/last-seen dates to help the person distinguish them, including in the existing-cat picker.

Location denied/unavailable: **Location wasn’t added. You can still save this encounter.** If waiting is too long, **Save without location** lets the user proceed. Location never blocks saving indefinitely. Preserve identity, photo, name, note, and timestamp across location failure.

Save only on explicit confirmation. On failure, stay on the save screen and preserve the complete pending encounter, including any successfully obtained location. Show **We couldn’t save this encounter. Your details are still here.** Offer **Try saving again** and deliberate Back/Cancel. A specific storage explanation may replace the generic message when supported; raw exception text is not the main message.

Acceptance criteria:
- New-cat saving rejects blank/whitespace-only names and names longer than 40 characters after trimming. Valid Unicode names retain their content apart from outer whitespace trimming.
- Two different cats can be saved with the exact same name without overwriting, merging, or renaming either. Their photos, counts, and first/last-seen dates distinguish them in identity-selection UI, and encounters attach to the selected cat rather than to a name match.
- Notes are stored and shown with their individual encounters; there is no cat-level note input or description.
- Declined, failed, or slow location does not require abandoning the encounter; saving without it works.
- Save failure preserves all entered details and shows no success or inflated encounter count.
- Retrying a failed or uncertain save results in one encounter, not duplicate cats or sightings.
- Success appears only after the local save completes. New: **[name] is in your Meowfolio.** Repeat: **Another [name] encounter saved.**
- Success offers **View [name]** and **Back to collection** and both reflect the saved record.

Source: `scope.md > The Core Loop`, `What "Working" Looks Like`, and `The POC Boundary`.

### F5a — Back, Discard, and Scan-Session Recovery
Distinguish going back within the scan from abandoning the encounter. Normal Back returns to the previous step while retaining the selected photo and entered name, encounter note, and captured location in memory for that scan session. Returning from identity decision to details restores those inputs. Processing results do not need to survive backing out; processing can restart from the selected photo.

**Cancel scan**, or leaving the scan for the collection, abandons the unsaved encounter. If meaningful unsaved work would be lost, ask:
> **Discard this encounter?**
> Your photo and unsaved details will be lost.

Actions: **Keep editing** retains the scan; **Discard encounter** clears the unsaved session and returns to the collection. Already cached model files may remain.

Acceptance criteria:
- Back from active preparation/processing returns to preview and preserves the photo; stop active work where possible and do not let late results move the user forward.
- Back from save details to identity decision and then returning to details preserves entered values within the same scan session.
- Abandoning a scan with a selected photo or entered details asks for discard confirmation; Keep editing loses nothing, while Discard encounter returns to collection without creating a saved record.
- No unfinished encounter is persisted as a draft. Closing/reloading before save may lose it; successfully saved encounters remain persistent.

Source: `scope.md > The Core Loop` and `The POC Boundary`; refined by the learner’s scan-session recovery decision.

### F6 — Collection and Cat History
Collection cards show cover photo, chosen name, encounter count (**Met N times**), and a quiet last-seen date. Keep **Spot a cat** easy to reach. No model details, detection confidence, similarity scores, or coordinates appear on collection cards.

Empty state:
> Your Meowfolio is empty.
> The next cat you meet can be the first page.

Cat detail shows cover photo, prominent name, count, first-seen and last-seen dates. Below, a chronological encounter history shows each sighting’s photo, date/time, optional encounter note, and optional saved private location. There is no separate top-of-page note. The history should make repeated sightings across days easy to recognize.

An encounter with saved location shows a subtle **Location saved** indicator beside its timestamp/metadata. Opening the indicator reveals the stored latitude, longitude, and accuracy (for example, coordinates in degrees and **Accuracy: ±18 m**). The detail is collapsed by default. Values come from the saved encounter, not invented place names; no map or external reverse-geocoding service is used.

Acceptance criteria:
- A new saved cat appears in the collection with its name and photo; a repeat updates the existing cat’s count and history without making a duplicate card.
- The detail view includes each saved encounter with its own photo and metadata, omitting absent optional values rather than treating them as errors.
- Only encounters with saved location show the indicator. Coordinates and accuracy stay hidden until deliberately expanded; viewing them uses local saved data without requests to map/geocoding services.
- Closing/reopening the app in the same browser retains successfully saved cats and histories, subject to browser data being retained; do not promise permanent storage.
- Browsing the scrapbook does not require a new scan or model download.
- Empty collection offers the capture action rather than technical empty-data messaging.

Source: `scope.md > The Core Loop` and `What "Working" Looks Like`.

### F7 — Real-World Proof and Conservative Matching
Complete the outdoor capture → decision → save → return loop on the learner’s Android phone/current Chrome, without developer-only steps. Use Windows Chrome for development checks, not as substitute evidence for the phone.

Controlled matching evaluation: roughly 8–12 known cats, 40–60 real photos, approximately 4–6 usable photos per cat. Include visually similar cats and varied poses, angles, distances, lighting and backgrounds. Separate development/reference photos from independent later held-out queries; fix strategy and a single conservative threshold before inspecting held-out results. The correct saved cat should usually rank among the strongest candidates. Prefer withholding a suggestion over presenting the wrong familiar cat; never imply reliable biometric identification. Indoor photos are valid controlled evaluation data, not evidence of outdoor usability.

This dataset expansion was explicitly requested by the learner during technical planning. A separate, smaller set of actual Android/outdoor encounters must still demonstrate capture, processing, identity decision, save and persistence.

Acceptance criteria:
- Record evidence of a real new-cat save, a repeat encounter, and persistence after reopening on the target phone.
- Document trial outcomes separately from proof that the models merely run. A manual repeat save alone does not prove useful similarity.
- If the trial lacks useful separation, report familiar-face matching as unproven and revisit it with the learner before claiming completion of that proof.
- Quantitative trial gates and useful processing-time limits still need definition; do not manufacture them from this qualitative intent.

Source: `scope.md > What "Working" Looks Like` and `The POC Boundary`.

## States and Boundaries
- **No saved cats:** inviting collection; after processing, show the crop, **This looks like a new cat**, and **Name this cat**, without familiar-face language or an existing-cat action.
- **Missing models:** download explanation and explicit consent before network download; preserve photo when going back.
- **Preparation failure:** retry or return; preserve photo for retry.
- **Back within scan:** retain photo and entered details in memory; from active processing return to preview, stopping work where possible.
- **Abandon scan:** confirm discard when a photo or entered details would be lost; Keep editing preserves the session, Discard encounter returns to collection.
- **No cat / several cats:** replacement photo / explicit subject selection, respectively.
- **No useful similarity:** normal identity decision with manual existing/new paths.
- **Location failure:** continue without location, preserving encounter details.
- **Save failure:** retain pending data on the save screen; retry safely; never claim success prematurely.
- **Reopened app:** saved collection persists. Unfinished encounters are not persisted as drafts and may be lost on close/reload.
- **Privacy:** no hosted photo inference, no required account, location opt-in, no public exact-location sharing.

## Product Decisions
- One lightweight welcome: enough context without delaying the walk.
- Explicit download consent only when files are unavailable: respect mobile data while keeping ready-model scans short.
- Human identity decision and manual fallback: useful even when visual similarity misses.
- An empty scrapbook gets an intentional first-cat naming state, not a failed-match or familiar-face state.
- Names are trimmed, required, Unicode-capable, and limited to 40 characters; duplicate names are allowed because a name is not a unique cat identity. No automatic suffixes or profanity filter.
- One candidate rather than raw model output: aid recognition without implying calibrated certainty.
- Optional location cannot block the main save; actual save failure preserves everything for retry.
- Saved location has a quiet indicator with collapsed coordinate/accuracy details: private, local, and independent of maps or geocoding.
- **Encounter-only notes:** specific observations belong to that sighting; cat-level descriptions imply profile editing and are deferred.
- Back preserves scan-session inputs in memory; abandoning meaningful unsaved work requires discard confirmation. Persistent unfinished drafts are excluded to avoid an additional recovery system.
- Image-first collection and history: memory and recognition are the product, not analytics.
- 12–16 focused hours, real-device AI proof first, then the complete loop, usability/failures/privacy/outdoor testing, then polish.

## What We're Building
F1–F7 together define the proof: informed capture and model preparation, local cat processing, human-confirmed new/repeat identity, a reliable local save, and a persistent personal scrapbook with evidence from the real target device. These are refinement of the approved scope, not additional feature tracks.

## Deferred From the POC
Other-browser validation, installability/offline shell, maps, export/import, achievements, decorative polish, profile/encounter editing tools, statistics/charts, complicated filtering, and persistent unfinished drafts. They do not prove the current loop. Broad browser support is not a release gate.

## Possible Later Enhancements
Editable cat profiles could deliberately introduce a separate persistent “About this cat” description. It is not inferred from encounter notes and has no PoC acceptance criteria.

## Non-Goals
Accounts, social networking, cloud backend/inference, public exact-location maps, automatic identity assignment, AI naming/biographies, other animals, and broader game mechanics. These either dilute the experiment or contradict its human-led, private, outdoor purpose.

## Relationship to Existing Documentation
This draft carries approved scope and interview decisions forward. Existing docs remain reference material; the following differences must not be silently lost in implementation:
- Manual existing-cat selection is required, unlike the optional path in `docs/MVP.md` and `docs/USER_FLOWS.md`.
- Model preparation now requires explicit download confirmation when model files are missing, refining the automatic preparation sequence in `docs/USER_FLOWS.md`.
- Cat-level notes/descriptions are excluded; only encounter notes are in this PoC, refining the conceptual cat notes in `context.md`.
- Scope narrows release validation to the learner’s Android Chrome and keeps the Hacktoberfest DEV target, rather than substituting curriculum timing/submission rules.

## Open Questions
The product questions raised during this review are resolved. The following measurement and implementation questions carry into technical planning:
- **Timing and evaluation:** define usable processing/download failure limits and reproducible trial gates before spec approval, informed by real-device measurements. No numeric success rate or latency is established yet.
- **Technical follow-through:** exact model sizes, availability detection, fallback feasibility, and safe save retries belong in the technical plan. Preserve the current models unless evidence supports a learner-approved change.
