# Hacktoberfest 2026 · Week 1: Touch Grass

**Correct event:** [Hacktoberfest Open-Source AI Challenge, Week 1](https://dev.to/challenges/hacktoberfest-week1-2026-10-05), theme **Touch Grass**. This is a **DEV Community writing submission**, *not* a Devpost entry. It is also distinct from the separate in-person Hack Day submission route.

- **Submission:** publish a post on DEV using the event's **official Touch Grass submission template** and challenge tags.
- **Deadline:** October 11, 2026 at **11:59 PM PDT**, per the [official contest rules](https://dev.to/page/hacktoberfest-week1-2026-10-05-contest-rules).
- **No mandatory public demo video** is specified for this DEV challenge. The official prompt asks participants to show their build and explain how open-source AI helps; the optional DevRelay session is not required.
- **Judging:** writing quality (most heavily weighted), relevance to open-source AI and getting outdoors, creativity, technical execution, and optional partner technology.
- **Submission state:** DEV article intentionally **not yet written or published** here. The author will write and publish that separately.

## Project description (factual, ready to reuse)

**Meowfolio — Little cats, big memories.** A private, playful, early-2000s-inspired scrapbook for the neighborhood cats you meet outside. Take or select a cat photo, let real open-weight models detect and describe the cat locally in your browser, choose whether it is a new cat or a familiar one, and keep its sightings, photographs and notes together. Meowfolio is designed to get you walking, observing and remembering — not endlessly scrolling.

Meowfolio uses pinned YOLOS-tiny for cat detection and DINOv2-small for image embeddings, both through Transformers.js in a browser Web Worker using WASM. Cat photographs, embeddings, names, notes and optional coordinates remain in local IndexedDB rather than a hosted database. On first use, network access and explicit consent are required to download model/runtime assets; this is **not an unconditional offline-first claim**.

The most important integrity decision is human-confirmed identification: automatic familiar-cat suggestions were **disabled** after an evaluation found a false positive. A user can still manually link a new sighting to a cat already in their scrapbook.

**Live:** https://mymeowfolio.vercel.app

**Source:** https://github.com/ThunderKhan/meowfolio

**License:** MPL-2.0.

## What the DEV article should demonstrate

Explain *why outside*: the walk and the animals are the goal; the screen is for a quick photo and recording a memory. Show the product's welcome/scan/consent, new-cat save, photo history, optional offline-friendly pending-photo inbox, and story card. Explain why open-weight local inference matters for privacy, running costs and inspectability, and be candid about downloading model assets on first use.

Tell the specific engineering story: YOLOv10 incompatibility → verified YOLOS, DINOv2 embeddings → held-out false match → manually confirmed identity, IndexedDB persistence → mobile storage upgrade recovery. These are meaningful, independently supported decisions; don't invent outdoor timings or a perfect accuracy score.

**Real Android observation is the author's responsibility.** After field-testing, add actual handset/Chrome version, cold/warm load timing, saved-photo/reopen outcome, and any limitations observed. Do not claim Android field performance based only on desktop CI.

## Quick project verification

1. Visit https://mymeowfolio.vercel.app in a supported Chromium browser.
2. Open your scrapbook; start a scan with a cat photograph.
3. On an uncached profile, explicitly consent to download model assets.
4. Let cat detection/embedding complete. If the photo has multiple cats, choose the correct crop.
5. Name a new cat and save; reopen the collection and verify the photo and encounter.
6. Reload the **same origin** and reopen the cat. Optionally scan another photo and manually choose the existing cat.
7. Try **Save photo for later** when mobile model preparation is inconvenient. Backup/restore is available at the bottom of the scrapbook.

Because the user has not completed the final Android field protocol, full real-device release confidence remains **pending**. See [ANDROID_FIELD_TEST.md](ANDROID_FIELD_TEST.md).

## Publish checklist

- [ ] Complete and record a real Android save → reload → repeat flow.
- [ ] Write the DEV post with the official Week 1 template, required tags and honest measured evidence.
- [ ] Include the public live app, repository and license links.
- [ ] Explain local inference, first-download consent, and the disabled automatic re-identification gate.
- [ ] Publish **before** the official deadline and verify the post is public.

**No Devpost upload or public YouTube/Vimeo video is required for this entry.**
