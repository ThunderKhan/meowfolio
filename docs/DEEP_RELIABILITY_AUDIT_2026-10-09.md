# Deep reliability and maintainability audit — 9 October 2026

## Scope and method

Second-pass source review of the production main branch after PR #18. Inspected the AI worker/client protocol, React scan state and model readiness, concurrent catalog refreshes, the IndexedDB repository, backup codec/import, browser photo decoding, Vercel release constraints, and existing core/Playwright tests.

This app is **browser-local**: there is no server-side API or central database. The IndexedDB schema is v2, and saved photos, location and embeddings are local to one origin/browser profile. The changes in this PR do not migrate, delete or overwrite saved records.

## Confirmed findings and changes

| Priority | Finding | Root cause | Change |
| --- | --- | --- | --- |
| High | A worker crash left the AI client sending future messages to a terminated or broken worker. | AiClient rejected in-flight requests on `onerror`, but never invalidated/recreated its Worker. | Terminate and invalidate failed workers, reject all pending operations, respawn lazily on the next request; handle `messageerror`, send failures, duplicate request IDs, disposal, and late messages. |
| High | Retry after an inference worker crash could skip model initialization. | ScanFlow retained `modelsReady=true` even though a new worker has no initialized models. | Reset readiness on failed detection/embedding; retries recheck cached assets and follow the existing consent gate. |
| Medium | Older catalog reads could publish after newer reads, potentially revoking currently referenced image URLs. | App had no ordering check around overlapping `refreshScanCats()` promises. | Monotonic refresh generation; stale responses release only their own URLs. Invalidated on app cleanup. |
| Medium | Two overlapping scan starts could load the first selected photo after a later user action. | `startScan()` awaited an async refresh without a last-request check. | Monotonic scan-start token, invalidated on exit/cleanup. |
| Medium | Partially failing cat-reference reads leaked Blob URLs. | `loadRuntimeCatalog()` allocated URLs incrementally without rolling them back on error. | Revoke every allocated URL when a later catalog step fails. |
| Medium | Large backup export could allocate huge buffers before discovering it exceeded the JSON size cap. | Size was checked only after base64 encoding and JSON construction. | Estimate base64 size from Blob sizes before calling `arrayBuffer()`, while retaining the final exact cap check. |

## Test strategy

- `src/ai/client.test.ts`: normal response, multi-request crash rejection, lazy recreation, unreadable messages, postMessage failure, duplicate IDs, disposed client.
- `src/scan/referenceCatalog.test.ts`: no matching-reference work with matching disabled, cleanup of partial URLs on later IndexedDB failure and on URL allocation failure.
- `src/storage/backup.test.ts`: reject oversized photo before reading it.
- Existing TypeScript, Vitest, production artifact audit, Playwright production smoke, and real-model Chromium suite must all pass on the exact PR head.

## Remaining risks and intentionally deferred changes

1. **Not a streaming backup:** Entire JSON/base64 archives remain memory-intensive below 200 MB; real streaming archives should be a separately versioned, cross-browser design with migration/restore fixtures.
2. **Photo collection scaling:** One original cover Blob per cat still loads at collection startup. Persisted thumbnails, lazy loading or pagination require a separately measured threshold and migration plan.
3. **Crash handling is fail-and-retry, not transparent replay:** The currently failing AI request is rejected; users retain the selected photo and can retry. Workers recover on the next operation. This avoids unexpected repeated network downloads or saving partial results.
4. **Browser-controlled asset redirects:** The model allowlist checks input URLs and HTTPS, but redirected responses and third-party runtime distribution warrant a dedicated network/privacy review with deployed-host captures.
5. **Single-browser storage:** Data can be evicted or cleared. Export files are unencrypted and include potentially sensitive locations; they must be kept private.
6. **Automated testing is not a field test:** Real Android camera, storage upgrade/blocking, offline reload, large library performance, swipe behavior and import/export remain to be validated physically.
7. **Manual matching remains required:** Automatic familiar-cat identification stays disabled because held-out false-positive evidence failed release criteria.
8. **Future refactor:** Split large `ScanFlow.tsx` into stateful controller + presentation only alongside an expanded interaction test matrix. A cosmetic split now could create regressions without user-visible value.

## Triage guidance

On a local AI crash: retry the same photo (no record is committed until Save succeeds). If model files were evicted, consent is required before re-downloading. On IndexedDB issues: do not clear site data; close stale tabs, retry, and export an archive when accessible. To debug URL leaks: measure `createObjectURL` / `revokeObjectURL` on refresh and navigation. If backup export hits its limit, use a smaller library or wait for versioned streaming support; do not reduce validation limits without tests.

## Release discipline

Deploy only after CI is green and production Vercel points at the exact merge SHA. Preserve schema v2 and photo Blobs, and do not toggle auto-matching. Evaluate future improvements in isolated PRs with rollback expectations and saved-user data fixtures.