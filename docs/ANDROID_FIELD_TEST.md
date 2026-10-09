# Slice 6 — Android / Production Field Verification

Status: **Pending real-device execution; not satisfied by desktop CI**  
Host: one stable Vercel HTTPS production origin, imported from `main`  
Client: Android Chrome (record actual version/device before testing)  
Models: pinned YOLOS-tiny + DINOv2-small; current release scan uses WASM

## Keep the experiment honest

- Current real-photo open-set matching gate **failed**. Automatic suggestions remain disabled. Verify manual existing-cat selection instead.
- Do not publish cat photos, EXIF, individual coordinates, complete raw manifests, IndexedDB contents or private browser logs.
- Kaggle images in Slice 5 are not outdoor performance measurements.
- Desktop CI and production-mode browser smoke prove mechanics, not Android latency, installation or deployed-host behavior.
- The first successful HTTPS origin is the storage identity. Moving to a different domain does **not** migrate existing cats.
- Browser storage can be cleared/evicted; there is currently no backup/export facility.

## Release preconditions

- [ ] Static Vercel deployment is confirmed and its final URL is recorded.
- [ ] GitHub Actions on the **actual deployed commit** is green: typecheck, units, build, production audit, production-mode smoke, ordinary E2E.
- [ ] Browser network checks confirm no cat photo, blob, embeddings, name, note or location data goes to a server in app-initiated requests.
- [ ] Model/runtime asset host availability, legal notices and repo license decision reviewed.
- [ ] A full new-cat and manually confirmed repeat-cat flow passes on a real Android Chrome device.
- [ ] Existing scrapbook contents survive a **same-origin redeploy**.
- [ ] Private Download backup JSON is valid; restore on an empty browser profile recovers photos, counts, history and pending inbox. A repeated import must reject with no data overwritten.
- [ ] Frontend test/dev-only routes are inaccessible in the production build.

## Hands-on protocol — one Android phone

### A. Consent and first start

1. Open the final production HTTPS URL in a normal Chrome profile (not incognito). Record date, device, Chrome version, Android version, network type, final URL and commit SHA.
2. Open the scrapbook and confirm the pink pixel theme and no unwanted model downloads.
3. Tap **Spot a cat**, capture a suitable photo, then **Find the cat**.
4. Confirm **Download models & continue** appears before any uncached model file download; the photo stays visible/preserved on Back.
5. Tap Download, then time from consent to model-ready and first identity decision.
6. If network is slow/unavailable, record whether the interface still offers Back/retry and retains the photo. **Do not claim progress timers or model sizes that were not observed.**

### B. Warm model timing (after the worker is initialized)

Record separately: detection latency, embedding latency if observable, total time from Find the cat to identity screen. Multiple-cat human selection time must not count as model inference time.

Target from approved spec:
- ≤6 seconds: target.
- 6–10 seconds: tolerable PoC.
- At 10 seconds: visible slow/wait/recovery feedback.
- Updated following Android reports: at 90 seconds, invalidate the request, reset the worker, and offer recovery. The original 20-second limit caused false timeouts on mobile; the ≤6s target is unchanged.

### C. Save now, process later (Android failure fallback)

1. Before running AI, take a camera photo and choose **Save photo for later**.
2. Verify a local PHOTO_INBOX.DAT card appears; reload the same production origin; photo remains.
3. Use **Process photo** on the saved item. If inference fails, confirm the saved pending item still exists and the original photo was not modified.
4. After a successful confirmed encounter, verify the corresponding pending photo disappears and the saved cat has exactly one new encounter.
5. Check the second scan in the same page session reuses initialized models without showing unnecessary download consent.
6. On an oversized camera image, ensure detected boxes map to the original full-resolution image, or record the failure.
7. If Android scans still regularly exceed 10s, mark the performance gate as unproven even if the new 90-second recovery avoids total loss.

### D. Actual scrapbook loop

1. Name a new cat and write a short **encounter-specific** note.
2. Save, wait until confirmation, return to the collection; reopen history and verify the photo, name, timestamp, and note.
3. Close Chrome/reopen the same origin: verify all records still exist.
4. Scan a second photo of that **same cat**. If the AI abstains (expected with release matching off), manually choose the existing cat.
5. Save; assert exactly two encounters, not duplicates; reload and verify both photos.
6. Deny optional geolocation: verify Save still succeeds. If granted, verify coordinates stay collapsed until tapped.
7. Press Back and Discard during an unfinished scan; ensure no phantom encounter is created.

### E. Same-origin frontend redeploy

1. Before deploying again, record cat count, encounter count and a recognizable note on the **existing** stable production URL.
2. Redeploy new frontend to **the same origin** (without purging browser storage).
3. Reopen app and check name, photos, counts and notes still exist, including after hard refresh.
4. Record whether a model download was required again (model caches may be evicted independently of IndexedDB).
5. Do not claim that persistence across changing Vercel preview URLs is guaranteed.

### F. Accessibility and failures

Test 320px viewport, large controls, visible focus, reduced motion, a no-cat photo, offline/network-denied model preparation, a corrupted photo and location denied/timeout.

## Observation log (fill with measured evidence)

| Field | Actual value |
| --- | --- |
| Production HTTPS origin | PENDING |
| Exact deployed commit | PENDING |
| Android handset + RAM | PENDING |
| Android / Chrome versions | PENDING |
| Connection (Wi-Fi/mobile) | PENDING |
| WASM or WebGPU provider observed | WASM expected; verify |
| First model transfer size | NOT MEASURED |
| First download + initialization | NOT MEASURED |
| Reopened cold cached initialization | NOT MEASURED |
| Warm scan detection | NOT MEASURED |
| Warm embedding | NOT MEASURED |
| Warm total to identity | NOT MEASURED |
| 10s warning observed | NOT TESTED |
| 90s recovery observed | NOT TESTED |
| New-cat save/reopen | NOT TESTED |
| Repeat-cat manual association/reopen | NOT TESTED |
| Same-origin redeploy persistence | NOT TESTED |
| Host/network privacy inspection | NOT TESTED |
| Backup export/import with real saved photos | NOT TESTED |

## Decision

A passing CI build is **not** sufficient to close Slice 6. Record the actual Android/outdoor findings, fix any blockers, retest, and only then mark the final hands-on checkpoint complete.

## Android model reliability follow-up (8 Oct 2026)
The mobile WASM kernel remains unverified on the user's phone. Retained worker memory, local-only cache fallback, 960px detector input and 90-second upper bound are implemented mitigations, **not evidence of passing real-device inference**. Record whether detection or embedding takes most time and whether a second warm scan avoids model consent.

## October 8 mobile storage recovery follow-up

A real Android browser test reached the naming/details screen in approximately **5–7 seconds** but the final save displayed “A previous Meowfolio tab is blocking storage setup.” This message is consistent with a blocked IndexedDB v1→v2 upgrade. The previous implementation rejected instantly in `onblocked` and permanently cached the rejected open promise. The corrective change waits for the upgrade to complete, closes current database connections on `versionchange`, and permits retry if a blocked open eventually times out. It does **not** delete or reset user records.

Validate after the new deploy:
- First v1→v2 app upgrade on Android, with and without another tab.
- Confirm full-size original cat photo, name and encounter note are saved; reopen after browser refresh.
- Confirm a transient blocker self-recovers, or that a Save retry works after other tabs release storage.
- Verify mobile detail text contrast and adjacent Save/Change buttons at widths 320px and 390px.
- Record first and second warm scan times separately; 5–7s is tolerable for this PoC but not proof of reaching the ≤6s target consistently.
