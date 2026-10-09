# Meowfolio core-code audit — 9 October 2026

Scope: main commit 5732449 plus corrections in PR #18. Source-reviewed: browser-local IndexedDB, portable backup parser, scan reducer/orchestration, photo preparation, model network policy and worker, AI client, matching policy, encounter history, release tests.

## Architecture

Meowfolio has no conventional remote backend. IndexedDB at the current origin stores cat photos and embeddings. Models and runtime assets are downloaded only after explicit consent; Vercel serves static frontend assets. Backups are explicit local JSON downloads, not sync.

## Confirmed issues addressed

| Severity | Finding | Correction |
| --- | --- | --- |
| High — integrity | Replacing a saved pending photo before save could reuse or delete its original inbox ID, losing the original pending item. | Use pending ID only when the saved File is exactly the initial pending File; pass the committed pending ID to cleanup explicitly. |
| Medium — performance | Collection loaded every encounter Blob to render one cover per cat. | Read cat metadata plus only cover encounters in a single readonly transaction. |
| Medium — concurrency | An older asynchronous photo validation could overwrite a newer selection. | Last-selection-wins validation token, invalidated on unmount. |
| Low — transport | Approved AI asset hosts were matched without enforcing HTTPS. | Require HTTPS for off-origin model/runtime requests. |

## Regression gates

- TypeScript, unit tests, production build and browser smoke suite.
- Real YOLOS/DINOv2 Chromium E2E.
- Switching a queued photo to a replacement and saving must leave the original inbox item.
- Saving the replacement for later must create a distinct pending record.
- Loading collection covers must not perform encounters.getAll().
- Insecure HTTP model/runtime requests must be rejected.

## Remaining risks (not fixed)

1. Physical Android camera, latency, IndexedDB upgrade and redeploy-persistence tests remain necessary; browser CI cannot prove these.
2. Browser storage can be cleared or evicted. Backups contain sensitive photos, AI vectors, notes, and optional locations without file encryption. Whole-file base64/JSON exports can consume considerable memory, even with the 200 MB cap.
3. Worker crash recovery is incomplete: AI requests reject on worker.onerror, but AiClient does not recreate the worker. Test crash and retry behavior explicitly before claiming automatic recovery.
4. Automatic familiar-cat recognition remains disabled after failing the previous false-positive release gate.
5. External dependency/model licensing, deployed-host privacy/network captures, and supply-chain review remain release checks.
6. The collection still loads one cover Blob per cat; future large archives may need thumbnails/pagination.
7. The optional profile is stored separately in LocalStorage and is not part of the portable backup.

## Release discipline

Merge only after the PR head CI passes; verify Vercel is READY on the exact merge commit. Do not delete user storage, change the IndexedDB schema, enable automatic matching or rewrite existing memories as part of these fixes.