# Meowfolio backend audit III: restore integrity and AI worker queue lifecycle

Date: 9 October 2026. Base: b308da9.

## Scope

Meowfolio's authoritative backend state resides in browser IndexedDB, not an external server. This pass examined backup parsing and transaction guarantees, queued/cancelled worker requests, asset transport restrictions and storage recovery.

## Confirmed issue: incomplete nested backup validation (high)

The v1 JSON backup parser validated record IDs and vector lengths, but only required a detection object and did not validate optional location/note fields. A malformed backup could import successfully and later break consumers that expect valid detector geometry or numeric coordinates.

Fix: validate finite detection boxes, non-inverted geometry, confidence in [0,1], positive source dimensions and detector metadata; validate optional location coordinates and accuracy, note types, cat temporal ordering and reference counters, and supported embedding metadata. The backup schema/version and all existing saved records are unchanged. Validation runs before opening an IndexedDB write transaction.

## Confirmed issue: cancellation marker accumulation (medium)

The Web Worker added IDs from every cancellation message to a Set, including completed requests, and only cleared it on worker disposal. Long-lived sessions could accumulate stale IDs.

Fix: WorkerRequestTracker remembers cancellation only for queued/active work and removes the marker when a request finishes. Existing sequential worker queue, immediate cancellation behavior and model-download consent revocation remain intact.

## Regression coverage

- Valid legacy-format backup round trip remains accepted.
- Invalid geometry, confidence, coordinates, note types, reference counters and embedding metadata are rejected before writes.
- Cancellation before execution, during execution, after completion and after dispose.
- The complete TypeScript, unit, production browser and real-model Chromium test suite must pass before release.

## Reviewed and intentionally deferred

1. Model downloads can follow HTTPS redirects to supporting CDNs. Enforcing redirect-chain restrictions needs an explicit provider-compatible test; changing fetch redirects without it may prevent any first-time model installation.
2. The current v1 JSON backup is not streaming or encrypted. A streaming v2 format must preserve compatibility and restore semantics.
3. Collections still read full cover-image Blobs per cat. Lazy/persisted thumbnails may eventually require a new database schema and migration.
4. Duplicate pending-photo IDs currently return the stored record. Proving identical byte content requires a stronger contract than filename/type/size comparison and separate tests.
5. Real Android camera, slow-device performance, storage quota, private browsing, and reload-after-upgrade remain field tests.
6. Automatic cat re-identification remains disabled by the existing evidence gate.

## Release discipline

No IndexedDB migration, no photo deletion, no model or policy changes, no new server, no data uploads. Merge only after all CI checks pass, then verify that the production Vercel alias points to the exact merge commit.