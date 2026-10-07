# Research Basis & Reference Notes

This file records the external engineering/design guidance that influenced the Meowfolio documentation set. It is not a substitute for the official Hacktoberfest rules or project requirements.

Last reviewed: 7 October 2026

## 1. Architecture Decision Records

AWS Prescriptive Guidance recommends ADRs for architecturally significant decisions affecting:
- structure,
- non-functional requirements,
- dependencies,
- interfaces,
- construction techniques.

It describes the minimum ADR contents as:
- context,
- decision,
- consequences,
and recommends preserving accepted ADR history rather than silently rewriting it.

References:
- https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/best-practices.html

Applied in:
- `docs/adr/`

## 2. Design systems and tokens

The U.S. Web Design System documents design tokens as shared constrained values for:
- color,
- typography,
- spacing,
- layout/style choices,

and treats components/patterns/tokens as a shared design-development language.

References:
- https://designsystem.digital.gov/
- https://designsystem.digital.gov/design-tokens/

Applied in:
- `DESIGN_SYSTEM.md`
- `COMPONENT_SPEC.md`

## 3. Accessibility

WCAG 2.2 AA includes:
- minimum target-size requirements with exceptions,
- 4.5:1 normal-text contrast requirement,
- programmatically determinable status messages.

Meowfolio intentionally targets larger 44px-class controls for frequent mobile actions because outdoor/touch use benefits from larger targets.

References:
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

Applied in:
- `ACCESSIBILITY.md`
- `DESIGN_SYSTEM.md`
- `UI_UX_SPEC.md`

## 4. IndexedDB

MDN documents IndexedDB as:
- persistent browser storage,
- transactional,
- suitable for significant structured data,
- able to store complex structured values including blobs/files.

References:
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

Applied in:
- `DATA_MODEL.md`
- ADR-0004.

## 5. Browser storage security

OWASP’s browser-storage testing guidance emphasizes that client-side storage can be inspected/modified and should be reviewed for sensitive data and injection risks.

Reference:
- https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/11-Client-side/12-Browser_Storage/

Applied in:
- `PRIVACY_SECURITY.md`

## 6. Transformers.js / WebGPU

Hugging Face documents:
- browser CPU/WASM execution,
- optional WebGPU acceleration,
- browser support variability,
- quantized models as useful for resource-constrained browser environments.

References:
- https://huggingface.co/docs/transformers.js/
- https://huggingface.co/docs/transformers.js/guides/webgpu

Applied in:
- `ARCHITECTURE.md`
- `PERFORMANCE_BUDGET.md`
- `BROWSER_SUPPORT.md`

## 7. Model caching

Transformers.js exposes browser Cache API support and currently enables browser model caching when available.

Reference:
- https://huggingface.co/docs/transformers.js/api/env

Applied in:
- model-loading UX and performance documentation.

Important:
browser caches can be evicted, so Meowfolio does not promise a one-time permanent download.

## 8. Model licensing

Current model pages reviewed:

### onnx-community/yolov10n
- marked AGPL-3.0.
- https://huggingface.co/onnx-community/yolov10n

### facebook/dinov2-small
- marked Apache-2.0.
- https://huggingface.co/facebook/dinov2-small

### Transformers.js
- repository metadata/license: Apache-2.0.
- https://github.com/huggingface/transformers.js

Applied in:
- `DEPENDENCIES_LICENSES.md`

The detector license remains an explicit release decision.

## 9. PWA guidance

web.dev’s PWA guidance emphasizes:
- performance,
- installability,
- deliberate offline behavior.

Reference:
- https://web.dev/articles/pwa-checklist

Applied as:
- PWA is P2, not MVP.
- If added, it needs a meaningful offline experience rather than only a manifest.

## 10. Research principle

External best practice does not override the product.

For the hackathon:
- use documentation to remove ambiguity,
- do not implement process overhead merely because large teams use it,
- measure browser/model behavior on the actual target device.
