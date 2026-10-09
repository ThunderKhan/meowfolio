# Meowfolio: project description and verification guide

This guide is for someone reviewing the [Hacktoberfest Week 1 · Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05) build. It is **not** a Devpost submission.

## Project in one paragraph

**Meowfolio** is a private, Y2K pixel-art scrapbook for real cats encountered outdoors. Users take/select a picture, let two open-weight computer-vision models find and describe a cat on-device, manually decide whether the sighting belongs to a new or saved cat, and keep a photo history in browser-local storage. The purpose is to make an ordinary walk more memorable. Source code is MPL-2.0 licensed. Cat photographs are not uploaded for inference.

- **Live app:** https://mymeowfolio.vercel.app
- **Source:** https://github.com/ThunderKhan/meowfolio
- **Models:** [YOLOS-tiny](https://huggingface.co/Xenova/yolos-tiny) and [DINOv2-small](https://huggingface.co/Xenova/dinov2-small) with fixed revisions
- **Evaluation disclosure:** automatic familiar-cat suggestions are **disabled** after an observed false positive. Manual identity assignment is functional.
- **No account:** there is no sign-in, hosted photo database, or multi-device sync.

## Five-minute reviewer route

1. Open the live site in a recent Chrome desktop or Android Chrome browser and enter the scrapbook.
2. Tap **Spot a cat**, **Camera**, or **Add photo**; choose a clear cat photo. On the first run, model consent is required before downloading model/runtime assets. The first download may take time.
3. Press **Find the cat**. After detection and embedding, follow the manual identity screen. For multiple cats, select the relevant crop.
4. Enter a new cat name and save. The encounter should appear in the local scrapbook.
5. Return to the collection, open the cat profile, inspect its image and chronological history. Reload the **same** origin: the cat should remain.
6. Optional: create a story card, or process a photo from **Save photo for later**.

If model downloads cannot complete on a reviewer's network, the app supports saving the photo to a browser-local inbox and processing it later. A reviewer must not confuse this graceful fallback with verified offline inference.

## Longer technical verification

| Concern | How to check | Important boundary |
| --- | --- | --- |
| First-use model consent | New browser profile, start scan, observe explicit Download models & continue | Downloads model/runtime assets from external CDNs; it does not upload photo bytes |
| Real local inference | Clear cat photo → YOLOS detection → DINOv2 embedding in worker | Not an external photo-classification API |
| Distinct cats | Scan a photo and name a new cat | No automatic identity assertion |
| Repeat sightings | Process another photo and manually select an existing cat | Duplicate-safe IndexedDB encounter transaction |
| Persistence | Save → reload same production origin → reopen | Browser profile and origin scoped, not cloud backup |
| Photo inbox | Save for later → reload → process | Pending original remains until a successful confirmed save or user deletion |
| Backup | Export JSON; restore to a separate **empty** profile | Contains photos, embeddings, notes and optional precise location; keep private |
| Geo privacy | Deny location permission and save normally | Geolocation is optional and collapsed in history |
| Story Studio | Create a card with a saved cat | Export happens in browser; no upload |

Do not assess auto-matching accuracy by pretending the optional matching feature is enabled. The experimental policy has been evaluated and rejected. See [evidence](evaluation-results/2026-10-08-cat-individuals.md).

## Run the same source build

```bash
git clone https://github.com/ThunderKhan/meowfolio.git
cd meowfolio
npm ci
npm run typecheck
npm test
npm run build
npm run audit:production
npx playwright install chromium
npm run test:e2e:production
npm run test:e2e
```

- The production browser tests exercise release-mode UI and network consent.
- The standard E2E suite includes real Chromium/WASM model execution and additional tests for IndexedDB, photo selection and recovery.
- The [GitHub Actions verify workflow](../.github/workflows/ci.yml) is the authoritative automated release gate.
- [Lighthouse CI](../.github/workflows/lighthouse.yml) reports synthetic performance scores, **not** guaranteed field speed.
- The [Android field test](ANDROID_FIELD_TEST.md) is a separate **manual author checkpoint** that the code CI cannot complete.

## Local deployment and data boundaries

- Static React/Vite assets are served from Vercel CDN; AI processing is browser-local.
- Hugging Face model weights may be downloaded on demand and cached. Fresh installs need network and explicit user consent.
- Photos, embedding vectors, optional notes and optional coordinates live in local IndexedDB; saved names/avatars are in origin-local storage.
- No account, synchronization, paid API key, backend SQL pool, hosted inference or analytics is required.
- Do not clear the reviewer's site data to troubleshoot a failed save: that may permanently discard unsynced memories. Try other tabs/refresh/retry first.

## What has not been proven

No real Android pass/fail report has yet been entered in the repository, and automatic familiar-cat recognition is not approved. Do not claim a field-tested recognition service, unconditional offline model startup or always-persistent browser storage. The project was built as an honest, working proof of concept.
