# Meowfolio Content & Microcopy Guide

Purpose: keep product language human, precise, and consistent—especially around AI uncertainty and privacy.

## 1. Voice

Meowfolio sounds:
- warm,
- curious,
- concise,
- observant,
- calm.

It does not sound:
- corporate,
- hyperactive,
- overly cute,
- scientifically overconfident,
- like an AI assistant.

## 2. Product language

Prefer:
- cat
- encounter
- met / seen / spotted
- scrapbook
- collection
- possible familiar face
- visually similar
- processed on your device

Avoid:
- specimen
- target
- subject
- biometric match
- identity probability
- capture target
- AI knows
- magical AI language

## 3. Core tagline

> **Your personal scrapbook of the cats you meet outside.**

Technical:
> A private, local-AI field scrapbook for real-world cat encounters.

## 4. AI uncertainty

Good:
> This cat looks visually similar to Mochi.

Good:
> Could this be Mochi again?

Bad:
> This is Mochi.

Bad:
> 93% chance this is Mochi.

Never translate cosine similarity into identity probability.

## 5. Local AI

Short:
> Processed on your device.

Long:
> Meowfolio runs its cat-detection and visual-matching models in your browser.

Do not say:
> Nothing ever leaves your device.

The app/model assets still require normal network requests unless fully self-hosted/cached.

## 6. Model download

First use:
> **Preparing local AI**
>
> Meowfolio needs to download its cat-detection and visual-matching models. This first scan can take longer; your browser can reuse cached model files later.

Do not promise:
> You only download this once.

Caches can be evicted.

## 7. No-cat state

Preferred:
> **I couldn’t find a cat in this photo.**
>
> Try a clearer photo where the cat takes up more of the frame.

Avoid:
> Detection failed.
> Invalid image.

## 8. Multiple cats

> **Which cat are you adding?**

Simple and direct.

## 9. New cat

> **New cat spotted 🐾**
>
> What do you call them?

Use “call them” rather than assuming ownership or official name.

## 10. Possible repeat

> **Possible familiar face**
>
> This cat looks visually similar to **Mochi**. Is it the same cat?

Actions:
- Yes, it’s Mochi
- No, this is a new cat

## 11. Location

Prompt:
> **Add where you met them?**
>
> Location is optional and stays in your local Meowfolio.

Denied:
> No problem — this encounter can be saved without location.

Avoid guilt or repeated permission prompts.

## 12. Save success

New:
> **Mochi is in your Meowfolio.**

Repeat:
> **Another Mochi encounter saved.**

Keep celebration brief.

## 13. Errors

Formula:
**what happened + next action**

Example:
> **I couldn’t prepare the cat detector.**
>
> Check your connection and try again.

Never show a raw runtime error as the primary message.

## 14. Empty collection

> **Your Meowfolio is empty.**
>
> The next cat you meet can be the first page.

CTA:
> Spot a cat

## 15. Privacy language

Be specific rather than absolute.

Good:
> Your saved photos and encounter details are stored in this browser.

Bad:
> Completely secure and private.

IndexedDB is local storage, not encrypted secure storage.

## 16. Accessibility language

Status text must make sense when heard without the visual UI.

Good:
> Looking for a cat in your photo.

Bad:
> Scanning…

Good:
> Saving Mochi’s encounter.

Bad:
> Processing…

## 17. Punctuation and emoji

Emoji:
- use sparingly,
- paw/cat allowed for celebratory moments,
- do not place emoji in every heading.

Avoid excessive exclamation marks.

## 18. Naming inclusivity

Use:
- they/them for unknown cats,
- user-chosen names afterward.

Do not infer sex/gender from appearance.

## 19. Claims review

Before shipping any statement about:
- privacy,
- model behavior,
- speed,
- offline use,
- browser support,

verify it against actual implementation/test evidence.
