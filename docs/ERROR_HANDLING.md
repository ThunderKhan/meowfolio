# Meowfolio Error Handling Specification

Goal: every failure should be honest, recoverable where possible, and never fabricate a successful AI or save result.

## 1. Error taxonomy

### E1 — User input
Examples:
- unreadable image,
- empty name.

### E2 — Model acquisition
Examples:
- download failure,
- cache failure,
- corrupt asset.

### E3 — Model runtime
Examples:
- provider initialization,
- inference exception,
- tensor/image processing failure.

### E4 — Product result
Examples:
- no cat detected,
- multiple cats.

These are often normal states, not “errors.”

### E5 — Storage
Examples:
- IndexedDB open failure,
- transaction abort,
- quota exceeded.

### E6 — Permission/capability
Examples:
- geolocation denied,
- unsupported runtime.

### E7 — Internal invariant
Examples:
- encounter references missing cat,
- embedding dimension mismatch.

These should be logged in development and surfaced safely.

## 2. Error object

Project-owned error shape:

```ts
type AppErrorCode =
  | "IMAGE_DECODE_FAILED"
  | "MODEL_DOWNLOAD_FAILED"
  | "MODEL_INIT_FAILED"
  | "INFERENCE_FAILED"
  | "NO_CAT_FOUND"
  | "STORAGE_OPEN_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_QUOTA"
  | "GEOLOCATION_DENIED"
  | "GEOLOCATION_UNAVAILABLE"
  | "UNSUPPORTED_RUNTIME"
  | "EMBEDDING_DIMENSION_MISMATCH"
  | "UNKNOWN"

type AppError = {
  code: AppErrorCode
  userMessage: string
  retryable: boolean
  cause?: unknown
}
```

UI should consume stable codes, not parse exception strings.

## 3. User-message formula

Good error copy answers:
1. what happened?
2. what can I do?

Example:
> **I couldn’t prepare the cat detector.** Check your connection and try again.

Not:
> RuntimeError: failed to fetch model.onnx

## 4. Model download failure

Preserve:
- current route,
- selected image if possible.

Actions:
- Retry,
- Back to collection.

Do not automatically fall back to a cloud AI API.

## 5. Model inference failure

Actions:
- retry once manually,
- choose another photo,
- if provider-specific and supported, attempt known fallback through model manager.

Never substitute a random result.

## 6. No cat detected

This is a product state, not red-alert failure.

Tone:
> I couldn’t find a cat in this photo.

Then guidance.

## 7. Storage failure

Critical rule:
**do not show success until the transaction completes.**

If write fails:
- keep unsaved form/image in memory if practical,
- show retry,
- explain if storage appears full.

Do not create duplicate cats on retry; operations should be idempotent enough or state-aware.

## 8. Geolocation failure

Never block save.

Denied:
> Location wasn’t added. You can still save this encounter.

Unavailable/timeout:
same principle.

## 9. Embedding mismatch

If stored embedding dimensions/model version are incompatible:
- do not compute similarity,
- skip candidate matching for incompatible records,
- log clear development diagnostic,
- consider migration/re-embedding path.

Never coerce/truncate vectors.

## 10. Global error boundary

React-level error boundary may protect against unexpected render crashes.

Fallback should:
- keep brand,
- explain something went wrong,
- offer reload/return.

It does not replace local recoverable error handling.

## 11. Logging

MVP:
- console diagnostics in development,
- no third-party error telemetry required.

Never log:
- raw image data,
- precise coordinates,
- full embeddings
to remote systems.

## 12. Retry policy

User-triggered retry is preferred for visible model/network operations.

Avoid aggressive automatic retries that:
- repeat large downloads,
- burn mobile data,
- hide failure.

If fetch/runtime already retries internally, document behavior rather than stacking retry loops.

## 13. Accessibility

Errors:
- visible text,
- associated with fields when relevant,
- announced via appropriate alert/live region,
- not color-only.

## 14. Error test table

| Failure | Must recover? | Must preserve selected photo? |
|---|---|---|
| No cat | Yes | Yes |
| Model download | Yes | Prefer yes |
| Inference | Yes | Yes |
| Geolocation denied | Flow continues | Yes |
| Storage write | Retry | Yes |
| Unsupported runtime | Explain/exit scan | N/A |
| Corrupt IndexedDB record | Skip/report gracefully | N/A |

## 15. Submission rule

Do not hide known model/browser failures in the article.

An honest limitation with a graceful UI is stronger than a misleading “works everywhere” claim.
