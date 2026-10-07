# Meowfolio Privacy & Security Model

Status: MVP security/privacy contract

## 1. Privacy posture

Meowfolio is **local-first, not magically private**.

Precise claim:
> Captured photos, cat names, notes, embeddings, encounter history, and optional sighting coordinates are intended to be processed/stored locally and are not sent to a hosted AI inference service by default.

Do not claim:
- “nothing ever leaves the device”,
- “100% private”,
- “encrypted scrapbook”
unless those statements become technically true and verified.

The app still downloads:
- application assets,
- JavaScript dependencies/assets,
- AI model files,
- potentially deployment-host metadata.

## 2. Sensitive-ish data

Meowfolio may contain:
- photos of surroundings,
- accidental people/faces,
- homes/buildings,
- license plates,
- cat names associated with a location,
- timestamps,
- precise geolocation.

Although it is a cat scrapbook, this can reveal personal routines or addresses.

Treat location-linked images as privacy-sensitive.

## 3. Data flow

```text
Camera/file
  ↓
browser memory
  ↓
local detector
  ↓
local crop
  ↓
local embedding
  ↓
local similarity
  ↓
IndexedDB

Optional geolocation
  ↓
browser permission
  ↓
IndexedDB
```

No app backend is required.

## 4. External network boundary

Expected external requests:
- static deployment assets,
- model/runtime assets from configured hosts.

Unexpected and prohibited by default:
- image upload,
- embedding upload,
- note/name upload,
- coordinate upload.

Before release, inspect Network requests while completing the full scan flow.

## 5. Browser storage threat model

IndexedDB is not a secure vault.

Risks:
- anyone with access to the unlocked browser profile/device may inspect it,
- malicious same-origin script from an XSS vulnerability could access it,
- browser devtools can inspect/modify storage,
- clearing site data deletes it.

Therefore:
- do not market local storage as encryption,
- prevent script injection,
- minimize sensitive stored data.

## 6. XSS prevention

React's normal text escaping should be preserved.

Do not:
- render user notes with `dangerouslySetInnerHTML`,
- inject untrusted HTML,
- execute imported content,
- build HTML strings from cat names.

If Markdown notes are ever introduced, use a reviewed safe renderer and sanitization strategy.

## 7. Dependency risk

Every runtime dependency expands supply-chain surface.

Rules:
- keep dependency count small,
- pin through lockfile,
- review purpose and license,
- do not add a package for trivial browser-native behavior,
- remove unused dependencies.

AI model assets are dependencies too for practical security/licensing review.

## 8. Content Security Policy

If deployment supports headers, target a CSP compatible with:
- app scripts,
- model asset hosts,
- WebAssembly/WebGPU runtime requirements.

Do not paste an overly strict CSP without testing Transformers.js/ONNX behavior.

Document any `unsafe-eval` or similar requirement if a runtime unexpectedly needs it; prefer configurations that avoid it.

## 9. Geolocation

Rules:
- user gesture/explicit choice before request,
- optional,
- no background tracking,
- one-shot capture is sufficient for MVP,
- save `accuracy`,
- no public map.

Do not continuously watch location with `watchPosition` unless the product is deliberately redesigned.

## 10. EXIF/privacy minimization

Camera images can contain metadata.

Preferred MVP:
- decode and re-encode the selected/cropped image for scrapbook storage where practical,
- store only the needed visual result,
- do not deliberately preserve EXIF GPS metadata.

Verify actual browser behavior rather than assuming metadata stripping.

## 11. Image object URLs

When using `URL.createObjectURL`:
- revoke URLs when no longer needed,
- avoid unbounded object URL leaks across repeated scans.

## 12. Model integrity

For a hackathon static web app, models may be fetched from a model host.

Document:
- model ID,
- version/revision if pinned,
- license,
- source.

Prefer pinning a revision once the pipeline is stable so a remote model update cannot silently change demo behavior.

## 13. Local data deletion

Even if no full settings page exists, users should eventually have a way to:
- delete a cat,
- or clear the entire Meowfolio.

For MVP, browser site-data clearing is technically possible but poor product UX.

If a “Clear Meowfolio” action is added:
- destructive confirmation,
- explain permanence,
- clear IndexedDB records,
- decide separately whether model cache is cleared.

## 14. No analytics by default

Do not add third-party analytics during the hackathon unless there is a concrete need.

Reasons:
- privacy story,
- implementation overhead,
- little judging value.

If analytics are added:
- document exactly what is sent,
- never send image/location/note content.

## 15. Security test checklist

- [ ] user text renders escaped,
- [ ] no remote image upload during scan,
- [ ] no location upload,
- [ ] model source is known,
- [ ] dependencies reviewed,
- [ ] no committed secrets,
- [ ] HTTPS deployed,
- [ ] camera/geolocation secure-context behavior tested,
- [ ] IndexedDB failure handled,
- [ ] third-party scripts reviewed,
- [ ] Network panel inspected.

## 16. Privacy copy

Short:
> **Processed on your device**

Expanded:
> Meowfolio runs its cat-detection and visual-matching models in your browser. Your saved cat photos, names, notes, embeddings, and optional sighting location stay in this browser unless you deliberately export or share them in a future feature.

Only ship this expanded claim after verification.

## 17. Future cloud features

If sync/sharing is ever introduced:
- this document must be rewritten,
- consent and data-flow UI must change,
- exact location needs minimization/fuzzing,
- authentication/security requirements change materially.

Do not inherit the MVP privacy copy into a cloud version unchanged.
