# Meowfolio Accessibility Specification

Target: **WCAG 2.2 AA** where practical for the hackathon MVP.

Accessibility is part of implementation, not a final audit task.

## 1. Outdoor accessibility matters

Meowfolio is used on phones, potentially:
- one-handed,
- in bright light,
- while walking/standing,
- with coarse touch input.

Accessible interaction also improves the core outdoor experience.

## 2. Semantic structure

Use:
- real headings in logical order,
- `button` for actions,
- links for navigation,
- labels for form controls,
- lists for repeated semantic items where appropriate.

Avoid clickable generic `div` elements.

## 3. Touch targets

WCAG 2.2 AA minimum target sizing is 24×24 CSS px with specified spacing exceptions.

Meowfolio product target:
- **44×44 CSS px minimum** for important/frequent mobile controls,
- 48px preferred primary control height.

This exceeds the WCAG AA floor and better fits outdoor one-handed use.

## 4. Text contrast

Normal text:
- minimum 4.5:1.

Large text:
- minimum 3:1 under WCAG criteria.

Do not rely on visual inspection.

The design-system tokens must be tested in actual state combinations:
- default,
- hover,
- disabled,
- focus,
- error,
- selected.

## 5. Color independence

Color must not be the only indicator of:
- selected cat crop,
- error,
- success,
- possible match,
- focus.

Use:
- text,
- icon,
- border,
- checkmark,
- shape.

## 6. Keyboard

Desktop keyboard flow must cover:
- capture/file choose,
- cat cards,
- detected-cat selection,
- possible-match choices,
- naming form,
- dialogs/sheets,
- back/navigation controls.

No keyboard traps.

## 7. Focus

All interactive elements:
- visible `:focus-visible`,
- logical order.

When opening a dialog:
- move focus appropriately,
- restore when closed.

For normal routed screens:
- manage focus/page title where needed so route changes are perceivable.

## 8. Status messages

AI processing changes without page navigation.

Use appropriate live regions:
- `role="status"` for normal progress/result status,
- `role="alert"` for important errors.

Do not force focus to every progress update.

Avoid announcing percentages every 1%.

## 9. Loading

A spinner alone is insufficient.

Provide text:
- Preparing local AI,
- Looking for a cat,
- Comparing with your Meowfolio,
- Saving encounter.

## 10. Images and alt text

### Cat card
Meaningful image:
- alt can identify context using user-given name, e.g. “Mochi”.

Avoid describing visual traits unless needed.

### Decorative scrapbook imagery
Use empty alt or CSS decoration.

### Detection preview
The original image may have descriptive alt such as:
- “Selected photo for cat detection.”

Bounding boxes are functional, so selection must be keyboard/programmatically accessible, not conveyed only as canvas pixels.

## 11. Canvas

If detection boxes are rendered on canvas:
- do not make the canvas the sole interaction surface,
- provide corresponding DOM controls/cards for each detected cat.

## 12. Forms

Every input:
- persistent visible label,
- programmatic label association,
- errors linked with `aria-describedby` when appropriate.

Do not use placeholder-only forms.

## 13. Error handling

Errors should:
- be specific,
- be announced,
- remain visible until addressed/dismissed,
- include recovery action.

Avoid red-only borders.

## 14. Motion

Respect:
`prefers-reduced-motion: reduce`

When active:
- remove nonessential transforms/entrance animations,
- preserve essential state changes without motion dependence.

No flashing content.

## 15. Zoom and reflow

Test:
- browser zoom to 200% on desktop,
- narrow 320px CSS width,
- increased browser text size where available.

Core flows should not require horizontal page scrolling.

## 16. Orientation

Do not lock orientation.

Portrait is primary, landscape should remain usable.

## 17. Naming field

Do not impose ASCII-only validation.

Allow:
- Unicode,
- accents,
- non-Latin scripts,
- emoji only if product decides it is acceptable.

Name requirement should be based on meaningful non-whitespace content.

## 18. Accessible model uncertainty

Possible-match wording must be understandable without visual confidence cues.

Good:
> This cat looks visually similar to Mochi. Is it the same cat?

Bad:
> 0.91 match

## 19. Manual test checklist

- [ ] keyboard-only full flow on desktop,
- [ ] visible focus,
- [ ] screen-reader smoke test on one available platform,
- [ ] 200% zoom,
- [ ] 320px reflow,
- [ ] touch-only mobile test,
- [ ] model status announced,
- [ ] error announced,
- [ ] multiple-cat selection operable without relying on canvas,
- [ ] reduced motion,
- [ ] contrast check.

## 20. Automated checks

Use automated accessibility tooling only as a supplement.

Automated tools cannot prove:
- useful focus flow,
- good alt text,
- understandable uncertainty,
- outdoor usability.

## 21. Release blocker examples

P0/P1 accessibility blockers:
- primary action unreachable by keyboard,
- invisible focus,
- naming field unlabeled,
- processing status invisible to assistive technology,
- contrast makes core text unreadable,
- detected-cat selection requires precise mouse-only canvas clicking.
