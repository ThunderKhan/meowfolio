# Meowfolio Component Specification

Purpose: define reusable UI behavior before implementation so components do not diverge across screens.

## 1. AppShell

Responsibilities:
- page background,
- max width,
- safe-area padding,
- header placement,
- global model/error notifications if used.

Must not:
- own business logic,
- initialize AI models automatically without an explicit product decision.

## 2. BrandHeader

Contains:
- Meowfolio wordmark,
- optional small collection count,
- optional About/Privacy action.

Mobile:
- compact.

Do not add a crowded desktop nav for a three-screen MVP.

## 3. PrimaryCaptureButton

Label:
> Spot a cat

Behavior:
- opens capture flow.

Requirements:
- large touch target,
- visible in collection empty/populated states,
- keyboard accessible,
- not icon-only.

## 4. CatCard

Props conceptually:
- cat id,
- cover image URL,
- name,
- encounter count,
- first/last seen.

Interaction:
- semantic link/button to detail.

States:
- image loading,
- loaded,
- missing/corrupt image.

Do not show AI scores.

## 5. PhotoPicker

Supports:
- camera hint on mobile,
- file selection,
- image preview,
- replace image.

Validation:
- supported image MIME/type where reliably available,
- decode failure handled.

Never upload by itself.

## 6. ProcessingStatus

Used for:
- model download,
- model initialization,
- detecting,
- embedding,
- comparing,
- saving.

Inputs:
- phase,
- human-readable label,
- optional numeric progress,
- optional detail.

Accessibility:
- `role="status"` / appropriate live region,
- avoid announcing every tiny percentage change.

## 7. DetectionOverlay

Displays:
- image,
- one or more detector boxes.

For multiple cats:
- boxes/crops are selectable,
- active selection has border/check/text label.

Coordinates must map correctly after responsive image scaling.

## 8. DetectionChoiceCard

Shows one crop.

States:
- default,
- selected,
- focus,
- disabled only if justified.

Label:
- “Cat 1”, “Cat 2” is acceptable for selection,
- do not infer personality/breed.

## 9. PossibleMatchCard

Shows:
- current crop,
- saved cat image,
- saved cat name,
- encounter count,
- cautious similarity copy.

Must not:
- show score as probability,
- auto-confirm after timeout,
- visually make “same cat” the only plausible answer.

Actions have equal clarity.

## 10. CatNameForm

Fields:
- name required,
- note optional.

Name:
- trim surrounding whitespace,
- preserve internal spaces and Unicode,
- max ~40 characters unless implementation evidence suggests otherwise.

Validation messages:
- inline and programmatically associated.

## 11. LocationPrompt

Purpose:
explicit opt-in.

States:
- not requested,
- requesting,
- granted,
- denied,
- unavailable.

Must always provide a continue-without-location path.

## 12. EncounterTimeline

Displays saved encounters.

Each item:
- thumbnail,
- date/time,
- note,
- optional private place/location summary.

Image is not necessarily interactive in MVP.

## 13. EmptyState

Used for:
- no cats,
- no encounters where logically possible.

Contains:
- concise explanation,
- direct next action.

Avoid generic “No data available.”

## 14. ErrorState

Contains:
- plain-language title,
- short reason when known,
- recovery action,
- optional technical detail behind a disclosure in development builds.

Never expose raw exception text as the only UI.

## 15. ModelPreparationCard

Contains:
- local-AI explanation,
- phase,
- progress,
- first-use note.

Should reassure through facts, not vague privacy marketing.

Preferred phrase:
> Models are being prepared in your browser. Your selected cat photo is not being sent to a hosted AI service.

Only use this phrasing after network verification.

## 16. PrivacyBadge

Optional lightweight element:
> Processed on your device

Use near scan/result, not on every component.

Click/tap may open About/Privacy explanation.

## 17. Modal/sheet policy

Prefer normal navigation for important multi-step flows.

Use modal/bottom sheet only for:
- small confirmations,
- short help,
- location explanation.

Do not put the entire scan process inside nested modals.

## 18. Toast policy

Toasts are supplementary.

Never use a disappearing toast as the only place to communicate:
- save failure,
- privacy consequence,
- model failure,
- required action.

## 19. Skeletons

Use only where layout is already known:
- collection cards while IndexedDB loads.

For model inference:
- explicit status is better than anonymous skeletons.

## 20. Component accessibility contract

Every interactive component must define:
- semantic element,
- accessible name,
- focus behavior,
- keyboard interaction,
- disabled behavior,
- error/status announcement where needed,
- touch target.

## 21. Component implementation rule

Before adding a new generic component, ask:
1. Is it used twice?
2. Does reuse reduce inconsistency?
3. Is it actually a product primitive?

Do not build a large generic design-system library for a four-day hackathon.
