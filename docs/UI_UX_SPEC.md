# Meowfolio UI/UX Specification

Status: Implementation-ready baseline  
Audience: designers, frontend engineers, AI coding assistants

## 1. Experience goal

Meowfolio should feel like a **2000s personal homepage crossed with a pixel scrapbook**: pink, nostalgic, tactile, playful, and still quick to use outdoors. Cat photos remain the memory itself; the retro UI is framing, not the subject.

The interface must not feel like:
- an admin dashboard,
- an AI chatbot,
- a game clone,
- a scientific animal database,
- or a social media feed.

The emotional center is the saved cat and its history.

## 2. Primary UX principle

> **The screen should be the shortest part of the experience.**

The primary capture flow should minimize decisions and text entry while the user is outside.

Target interaction:
1. open,
2. tap Spot a cat,
3. capture/select,
4. wait for local processing,
5. confirm familiar/new,
6. name if new,
7. save,
8. return to the real world.

## 3. Information architecture

### Primary destinations

#### Collection
Default home.
- saved cats,
- empty state,
- primary “Spot a cat” action.

#### Scan
A focused transient flow:
- choose/take photo,
- local processing,
- cat selection if multiple,
- possible-match decision,
- save.

#### Cat detail
- cover image,
- user-given name,
- first/last seen,
- encounter count,
- optional note,
- encounter timeline.

#### About / Privacy
Lightweight page or sheet:
- what local AI means,
- what is stored locally,
- optional location behavior,
- model credits.

Settings is not a required top-level destination for MVP.

## 4. Navigation

### Mobile
Use a minimal bottom or top navigation only if needed.

Preferred MVP:
- Collection header with brand,
- persistent/floating “Spot a cat” primary action,
- browser/back navigation for details,
- no five-tab app shell.

### Desktop
Centered app shell, max content width approximately 1100–1200px.
Collection grid expands; capture flow stays narrow.

## 5. Screen specifications

### 5.1 First-run welcome

Purpose:
Explain the product without delaying first use.

Content:
- Meowfolio name,
- one-line value proposition,
- three short facts:
  - AI runs on this device,
  - first scan may download models,
  - location is optional.
- CTA: **Start my Meowfolio**

Avoid:
- multi-page onboarding carousel,
- mandatory account creation,
- permission prompts before they are needed.

### 5.2 Empty collection

Hero:
> Your Meowfolio is empty.

Support:
> The next cat you meet can be the first page.

Primary CTA:
> Spot a cat

Secondary explanatory link:
> How local AI works

Use a restrained empty-state illustration or paper/sticker motif, not a giant mascot that dominates the page.

### 5.3 Collection

Header:
- Meowfolio wordmark,
- count such as “5 cats · 11 encounters” if available.

Grid:
- 2 columns on typical mobile when comfortable,
- 3–4 columns tablet/desktop,
- cards remain large enough to show the animal clearly.

Card:
- cover image,
- name,
- encounter count,
- first seen or last seen,
- no confidence scores.

Primary capture action remains easy to reach.

### 5.4 Capture / choose photo

Header:
> Spot a cat

Primary action:
> Take a photo

Secondary:
> Choose from photos

Explain:
> Your photo is processed on this device.

After image selection:
- large preview,
- Change photo,
- CTA: **Find the cat**

Do not automatically start expensive inference before the user sees the selected photo unless testing shows that is clearly better.

### 5.5 Model preparation

This is a real product state, not a spinner.

First load:
> Preparing local AI

Then specific phase:
> Downloading the cat detector…
> Preparing visual matching…

Explain:
> First use can take longer. The browser can reuse cached model files later.

Where runtime exposes progress:
- determinate progress bar,
- otherwise phase-based progress.

Allow:
- cancel/back when safe,
- retry on failure.

Do not display technical filenames to normal users.

### 5.6 Detecting

Show the photo and lightweight status:
> Looking for a cat on your device…

Use an accessible status region.

No fake scanning laser animation.

### 5.7 No cat found

Headline:
> I couldn’t find a cat in this photo.

Support:
> Try a clearer photo where the cat takes up more of the frame.

Actions:
- Try another photo
- Use this photo again only if a retry path makes sense

Do not blame the user.

### 5.8 Multiple cats

Headline:
> Which cat are you adding?

Show detected crops as selectable cards.

Selection state:
- clear border/check,
- not color-only.

CTA:
> Continue with this cat

### 5.9 Possible familiar face

Headline:
> Possible familiar face

Show:
- new crop,
- saved candidate card side by side or stacked,
- cat name,
- previous encounter count.

Copy:
> This cat looks visually similar to **Mochi**. Is it the same cat?

Actions:
- **Yes, it’s Mochi**
- **No, this is a new cat**
- optional “Choose another saved cat” if required by testing.

Never show “92% same cat.”

### 5.10 New cat naming

Headline:
> New cat spotted 🐾

Prompt:
> What do you call them?

Name:
- required,
- sensible max length such as 40 characters,
- autofocus only if it does not create a poor mobile keyboard transition.

Optional:
- note,
- location toggle/action.

CTA:
> Add to Meowfolio

No AI name suggestions in MVP.

### 5.11 Location

Do not request permission until the user elects to save location.

UI:
> Add where you met them?
> Location stays in your local Meowfolio.

Actions:
- Add location
- Not now

If denied:
> No problem — this encounter can be saved without location.

### 5.12 Save success

Avoid a blocking celebration screen longer than necessary.

Example:
> Mochi is in your Meowfolio.

Show updated card.

Actions:
- View Mochi
- Back to collection

A brief sticker-like entrance animation is acceptable if reduced-motion preferences are respected.

### 5.13 Cat detail

Top:
- large cover image,
- name,
- “Met 3 times”,
- first seen date.

Secondary:
- note,
- private location summary if available.

Timeline:
- reverse chronological or chronological; choose one and stay consistent,
- encounter image,
- date/time,
- optional note,
- optional place label.

No AI-generated personality text.

## 6. Outdoor-use requirements

The interface will be used:
- one-handed,
- in sunlight,
- while standing,
- while the animal may move away.

Therefore:
- primary actions large,
- minimal text entry,
- high contrast,
- no tiny icon-only controls for important actions,
- no drag-only interactions,
- processing can continue without requiring constant attention,
- accidental back navigation should not silently destroy an already selected photo when preventable.

## 7. Interaction rules

### Primary CTA
Exactly one visually dominant action per state.

### Destructive actions
Not central to MVP. If delete is added:
- clear label,
- confirmation when data loss is meaningful,
- avoid placing beside the primary save action.

### Loading
Always say *what* is happening:
- preparing detector,
- analyzing photo,
- comparing with scrapbook,
- saving.

### Progress
Never fake precise percentages if the runtime does not provide them.

### Errors
Every error must offer a next action.

## 8. Motion

Allowed:
- 150–250ms card transitions,
- subtle sticker/card entrance,
- progress transitions.

Avoid:
- parallax,
- looping decorative motion,
- confetti,
- bouncing capture buttons,
- motion that competes with the cat photo.

Respect `prefers-reduced-motion`.

## 9. Responsive behavior

### Small mobile: 320–479px
- single-column flow screens,
- collection may use one or two columns depending on card readability,
- full-width primary CTAs,
- sticky safe-area-aware capture action if used.

### Mobile/tablet: 480–767px
- two-column collection,
- comfortable image previews.

### Tablet/small desktop: 768–1023px
- three-column collection,
- capture content max-width ~640px.

### Desktop: 1024px+
- collection up to four columns,
- max app width ~1152px,
- flow content remains narrow to prevent stretched forms.

## 10. Empty, loading, success, and failure states

Every data-driven component must define:
- empty,
- loading,
- populated,
- error.

Every model-dependent component additionally defines:
- model not requested,
- downloading,
- loading,
- ready,
- inference running,
- recoverable failure,
- unsupported runtime if applicable.

## 11. UX acceptance criteria

- A new user can understand the product from the first screen without reading README.
- A new cat can be saved with one required text field: name.
- Location denial never blocks the flow.
- A possible match never appears as a fact.
- No core action depends on hover.
- Critical actions are usable one-handed on a phone.
- A model download never looks like a frozen app.
- A user always knows whether their photo has been saved yet.
