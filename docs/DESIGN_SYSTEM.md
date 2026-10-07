# Meowfolio Design System

Status: Visual baseline for MVP  
Theme: **field notebook + modern scrapbook**

The system exists to keep implementation coherent. Do not invent new arbitrary colors, radii, shadows, or spacing inside individual components.

## 1. Visual direction

Keywords:
- warm,
- outdoorsy,
- tactile,
- personal,
- quiet,
- contemporary,
- slightly handmade.

Avoid:
- neon AI gradients,
- cyberpunk,
- glassmorphism-heavy surfaces,
- childish cartoon UI,
- Pokémon-derived visual language,
- enterprise dashboard chrome.

## 2. Color tokens

Use semantic tokens in code rather than raw hex values inside components.

### Core

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#FAF7F0` | warm page background |
| `--color-surface` | `#FFFFFF` | cards/dialogs |
| `--color-ink` | `#1F1A17` | primary text |
| `--color-muted` | `#6D625A` | secondary text |
| `--color-border` | `#DED7CD` | dividers/borders |
| `--color-primary` | `#2F6B4F` | primary actions |
| `--color-primary-hover` | `#285A43` | primary hover |
| `--color-primary-soft` | `#E3EEE8` | selected/soft state |
| `--color-accent` | `#C96B4B` | decorative terracotta |
| `--color-accent-text` | `#8B4D37` | accessible accent text |
| `--color-warning` | `#8A6F2C` | warning emphasis |
| `--color-error` | `#8B3A3A` | errors |
| `--color-success` | `#2F6B4F` | success |

Normal text must meet WCAG AA contrast. The base ink, muted, primary, accent-text, and error values are selected to work as readable dark text on the warm/light surfaces; still test actual component combinations.

Use `--color-accent` mainly for non-text decoration because its contrast against light backgrounds is not sufficient for ordinary body text.

## 3. Typography

Prefer a zero-network-font baseline for the hackathon.

### Display
```css
font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
```

Use for:
- wordmark,
- page title,
- cat name at detail scale.

### UI/body
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", sans-serif;
```

Use for:
- controls,
- body,
- metadata,
- status.

### Type scale

| Token | Size | Line height |
|---|---:|---:|
| xs | 12px | 16px |
| sm | 14px | 20px |
| base | 16px | 24px |
| lg | 18px | 26px |
| xl | 22px | 30px |
| 2xl | 28px | 34px |
| 3xl | 36px | 42px |

Do not use body copy smaller than 14px. Default to 16px.

## 4. Spacing

Base unit: 4px.

Tokens:
- 1 = 4px
- 2 = 8px
- 3 = 12px
- 4 = 16px
- 5 = 20px
- 6 = 24px
- 8 = 32px
- 10 = 40px
- 12 = 48px
- 16 = 64px

Most mobile page gutters:
- 16px at narrow widths,
- 24px when space permits.

## 5. Radius

| Token | Value | Use |
|---|---:|---|
| sm | 8px | small inputs/chips |
| md | 12px | buttons/forms |
| lg | 18px | cards |
| xl | 24px | hero image/dialog |
| pill | 999px | compact badges only |

Avoid rounding every object into pills.

## 6. Shadow

Scrapbook surfaces should mostly use borders and subtle elevation.

### Card
```css
box-shadow: 0 1px 2px rgba(31, 26, 23, 0.06),
            0 6px 18px rgba(31, 26, 23, 0.05);
```

### Raised dialog
```css
box-shadow: 0 18px 50px rgba(31, 26, 23, 0.16);
```

No glowing shadows.

## 7. Icons

Use a consistent icon set if a dependency is selected; otherwise simple project-owned SVGs.

Rules:
- 20–24px common size,
- icons supplement labels on important actions,
- do not use icon-only buttons for ambiguous actions,
- paw/cat decorative icons are fine in moderation.

## 8. Buttons

### Primary
- green fill,
- white label,
- minimum visual height 48px for mobile primary actions,
- radius md,
- clear focus ring.

### Secondary
- surface or transparent,
- ink text,
- visible border.

### Tertiary
- text action,
- adequate touch target despite visually minimal treatment.

### Destructive
- reserved error styling,
- never use accent terracotta merely because it is red-ish.

States:
- default,
- hover,
- active,
- focus-visible,
- disabled,
- loading.

Disabled must not be the only way to explain why an action is unavailable.

## 9. Inputs

- 48px preferred mobile control height.
- Visible label above input.
- Placeholder is not the label.
- Error message directly associated with input.
- Name field supports normal punctuation and Unicode.
- No unnecessary validation while typing.

## 10. Cards

### Cat card
- image-first,
- aspect ratio approximately 4:5 or square depending on test photos,
- name strong,
- encounter metadata quiet,
- entire card may be clickable if semantic link behavior is preserved.

### Detection choice card
- cropped animal image,
- selection affordance,
- strong focus/selected state.

## 11. Images

The cat photo should be the dominant visual asset.

Rules:
- use `object-fit: cover`,
- avoid filters that alter the animal materially,
- retain natural color,
- loading placeholders should preserve aspect ratio,
- meaningful images require contextual alt text when displayed as content.

## 12. Scrapbook motifs

Permitted sparingly:
- slight card rotation of at most ~1° for decorative static cards,
- paper edge,
- tape/sticker accent,
- tiny date stamp,
- hand-drawn divider SVG.

Never allow decoration to:
- reduce contrast,
- make cards harder to scan,
- create layout instability,
- imply false functionality.

## 13. Focus

Use a visible 2–3px focus ring with sufficient contrast and offset.

Never remove outline without a replacement.

## 14. State language

Success:
- calm, short.

Warning:
- explain consequence.

Error:
- say what failed + what to do.

AI uncertainty:
- neutral language, no alarming color unless there is an actual error.

## 15. Design-token implementation

Prefer CSS custom properties exposed at root and consumed through Tailwind theme configuration or utility mappings.

Components should use semantic names:
- `bg-canvas`,
- `text-ink`,
- `text-muted`,
- `bg-primary`,
- `border-default`.

Do not scatter literal `#2F6B4F` through JSX.

## 16. Dark mode

Not required for hackathon MVP.

Do not spend submission time implementing dark mode unless the core loop and accessibility checks are complete.

## 17. Design quality gate

A screen is ready when:
- hierarchy is obvious at a glance,
- one primary action dominates,
- photos are given visual priority,
- no critical information relies only on color,
- interactive states exist,
- loading/error/empty states exist,
- mobile layout works at 320px,
- focus and contrast are testable.
