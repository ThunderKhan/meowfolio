# Meowfolio Design System

Status: Visual baseline for MVP  
Theme: **pink Y2K pixel scrapbook**

This system is intentionally nostalgic without copying any game, console, social network, or other brand trade dress. The UI should feel like a personal 1999–2005 web scrapbook wrapped around real cat photography.

## 1. Visual direction

Keywords:
- pink,
- pixelated,
- nostalgic,
- personal-homepage,
- scrapbook,
- playful,
- tactile,
- local/personal,
- readable.

Core rule:
**the cat photo is still the memory; the retro chrome only frames it.**

Avoid:
- Pokémon-derived visual language,
- modern AI gradients,
- glassmorphism,
- enterprise dashboards,
- tiny unreadable bitmap text,
- flashing/blinking UI,
- decoration that hides hierarchy,
- external font requests for the MVP.

## 2. Color tokens

| Token | Value | Use |
|---|---|---|
| `--pink-canvas` | `#FFD7EC` | checkerboard page background |
| `--pink-panel` | `#FFF6FB` | windows/cards |
| `--pink-soft` | `#FFE8F4` | soft state |
| `--pink-mid` | `#F7A8D1` | decorative fill |
| `--pink-strong` | `#D63384` | primary actions |
| `--pink-deep` | `#9F1F62` | strong readable accent text |
| `--ink` | `#4A1834` | primary text |
| `--muted` | `#7F4B67` | secondary text |
| `--pixel-border` | `#7B3157` | chunky borders |
| `--pixel-shadow` | `#B64F86` | hard pixel-offset shadows |

Normal text must still meet WCAG AA contrast on the actual surface used.

## 3. Typography

Zero-network-font baseline:

```css
font-family: "Courier New", "Lucida Console", Monaco, ui-monospace, monospace;
```

Use bold monospace for headings, window chrome, buttons, labels, and metadata. Body text may use the same family for consistency.

Rules:
- body text ≥14px,
- primary body copy normally 16px,
- tiny pixel labels are decorative/metadata only,
- no external Google Fonts or font CDN for the MVP.

## 4. Pixel chrome

Allowed:
- square/beveled buttons,
- 2px hard borders,
- 2–6px non-blurred offset shadows,
- faux desktop window title bars,
- checkerboards,
- tiny hearts/stars/stickers,
- filename/date-stamp labels,
- slight static card rotation ≤1°.

Avoid:
- actual blinking,
- marquees that move continuously,
- animated GIF clutter,
- layout shifts,
- illegible dithering.

## 5. Buttons

Primary:
- hot-pink gradient/fill,
- white label,
- 2px dark border,
- hard offset shadow,
- minimum 48px mobile height.

Secondary:
- pale-pink/cream fill,
- dark plum text,
- same chunky border/shadow.

Pressed:
- translate by ~2px and shorten shadow to imitate a physical pixel button.

Important actions keep text labels; no ambiguous icon-only controls.

## 6. Inputs

- visible labels,
- 2px pink/plum border,
- light surface,
- minimum ~48px touch height where practical,
- strong dashed or solid focus ring,
- placeholder never substitutes for a label.

## 7. Cat cards

Photo-first:
- square/near-square photo,
- dark 2px frame,
- small filename/date label,
- name strong,
- encounter count visible,
- last-seen quiet,
- whole card may be the semantic button/link.

Duplicate names are valid; photo, count, and dates provide disambiguation.

## 8. Cat detail

Required:
- cover image,
- name,
- encounter count,
- first seen,
- last seen,
- chronological encounter log.

Each encounter:
- full saved encounter photo,
- date/time,
- optional encounter note,
- optional collapsed **Location saved** disclosure.

Do not display:
- cosine similarity,
- detector confidence,
- embedding/model details,
- raw coordinates until the location disclosure is deliberately opened.

## 9. Images

- natural color,
- `object-fit: cover` where cropped cards need it,
- no visual filters that change the cat materially,
- contextual alt text for meaningful images,
- revoke generated object URLs when views unload/change.

Do not force `image-rendering: pixelated` on the actual cat photos. Pixelate the chrome, not the memory.

## 10. Accessibility and mobile

- 44×44px absolute minimum important touch target; 48px preferred,
- visible focus on every interactive element,
- no information conveyed only by pink shade,
- readable contrast,
- responsive from 320px,
- reduced-motion mode removes decorative transitions/rotation,
- no hover-only behavior.

## 11. Motion

Keep motion tiny:
- pressed-button shift,
- mild hover lift where useful,
- normal loading animation.

Respect `prefers-reduced-motion`. No flashing or rapid repetitive animation.

## 12. Navigation

Minimal:
- scrapbook,
- cat detail,
- scan flow.

**Spot a cat** stays obvious from collection and detail. Browsing saved cats must not initialize/download AI models.

## 13. Design quality gate

A screen is ready when:
- it unmistakably reads as pink Y2K/pixel scrapbook,
- cat photography still dominates,
- the primary action is obvious,
- text remains comfortably readable,
- mobile controls are large,
- focus/reduced-motion states work,
- decoration never changes or obscures product truth.
