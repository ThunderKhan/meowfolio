# Meowfolio frontend and visual-system audit — 9 October 2026

## Purpose

Preserve the **early-2000s pink pixel scrapbook** aesthetic (square window borders, chunky shadows, monospaced headlines, sticker illustrations, gradients, nostalgic filenames), while applying contemporary ergonomics to real browser interactions. Do not replace the identity with generic Apple glass, modern SaaS cards, plain monochrome icons, or rounded dashboards.

## Guidance researched

- [UI UX Pro Max — published skill and quick reference](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/templates/base/quick-reference.md): apply observable, domain-specific accessibility and interface advice; prioritize keyboard access, interaction feedback, spacing, responsive layout, text legibility, and consistent tokens. The skill is guidance, not permission to erase this project's style.
- [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout): clear content hierarchy, nearby relevant controls, grouping, and adaptability across small/large viewports. Borrow usability principles, **not** Apple's visual skin.
- [Apple UI Design Tips](https://developer.apple.com/design/tips/): 44pt native touch guidance, sufficient contrast, content that fits screens without horizontal scrolling, clear alignment.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): keyboard operability, visible focus, heading relationships, text contrast, reflow, non-obscured focus and target size.
- [NN/g Ten Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): clear feedback, user control, consistency, error prevention.
- [Vercel React best practices](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js): prefer semantic native controls and targeted component maintenance instead of broad re-renders or speculative rewrites. Also consulted the connected react-best-practices skill.
- [Microsoft classic Windows design lineage](https://learn.microsoft.com/en-us/windows/apps/design/guidelines-overview): its historical UX resources give context for meaningful window chrome and a retro desk motif; do not add decorative fake minimize/close actions.

## Findings and implemented fixes

| Priority | Evidence in code | Correction |
| --- | --- | --- |
| High | Primary welcome/Home camera and gallery controls were `<label>` elements styled as buttons. Labels are not normally keyboard focus stops, making main capture actions inaccessible to Tab/Enter. | Use real native `<button type="button">` controls invoking existing hidden file inputs through React refs; keep the input IDs, file handlers, and nostalgic styling. |
| High | Home header's displayed page title used a `<p>` while collection/empty content supplied standalone `h1` headings; an inbox heading could appear ahead of the first page heading. | Use responsive home `h1` in header; subordinate section headings become `h2`, preserving visual size and the existing mobile/desktop content. |
| Medium | Keyboard users had no skip-to-content route past the welcome and scrapbook chrome. | Add off-screen-until-focused skip link, target `#main-content` in welcome, home, scan, and story studio. |
| Medium | Retro metadata sizes included 9px/10px labels; header hints sometimes wrapped awkwardly on small viewports. | Raise meaningful metadata toward 12px, allow long header labels to wrap, preserve dark raspberry text and original styling. |
| Medium | Profile shortcut, full-photo controls, reset control, and location/story disclosures were smaller than preferred finger targets. | Provide 44px+ hit heights while respecting the desktop/mobile layout and 320px reflow. |
| Medium | Backup `<summary>` had native triangles hidden by global CSS but no replacement, making its behavior easy to miss. | Add restrained pixel +/− affordance, native `<details>` semantics, and visible focus. |
| Medium | The timeline's date badge and 'View full photo' overlay both occupied its bottom corners; narrow Polaroids could visually collide. | Move the photo control to the upper-right for timeline cards, keeping the date in the lower-right. Add collision regression across viewport sizes. |
| Medium | Invalid local-profile names surfaced an alert but did not programmatically associate the error or return focus to the field. | `aria-invalid`, `aria-describedby`, inline alert ID and focus on failing field. |

## Deliberate aesthetic decisions

- Keep Courier-like chunky headings and Y2K pink windows: historical styling is a brand decision, not inherently an accessibility defect.
- Keep sticker/emoji artwork as **decorative personality**, while all functional controls retain clear text names and native button semantics.
- Avoid adding unfamiliar animations, gradients, hover-only affordances, or nonfunctional window action icons.
- Avoid replacing the current design token scheme wholesale. New fixes reuse existing pixel border, shadow, ink, and pink variables.

## Verification gates

- TypeScript, unit tests and Vite production build, plus production asset audit.
- Production-mode Playwright: first-Tab skip, focused main, file chooser from keyboard, responsive heading hierarchy, tap heights and cross-width overflow (320, 390, 760, 1280), backup +/- open/close, profile error focus.
- Mock-AI browser E2E: timeline photo overlay must not collide with date label at 320, 390, 1280.
- Existing real YOLOS and DINOv2 Chromium end-to-end suite must pass.
- CI visual screenshots can aid future manual comparisons; physical Android screenshot/touch testing and 200%-zoom screen-reader inspection are still outstanding.

## Not changed / follow-ups

1. No IndexedDB schema, AI worker, recognition policy, backup format, or photo data changes.
2. Existing visual style has many hardcoded hex colors across a 2,000+ line stylesheet. A **separate audited token-consolidation PR** could reduce drift without a high-risk cascade rewrite.
3. More rigorous automated axe-style semantic contrast and screen-reader testing should be added only after evaluating dependency bundle and stable CI setup.
4. A native Android manual QA run should verify file picker interaction, safe-area behavior, color contrast under sunlight, and text scaling. Automated desktop Chromium is not physical-device sign-off.
5. Future aesthetic improvements should be measured in screenshots at 320, 390, tablet, and desktop, with a no-layout-regression baseline before changing decorative chrome.

## Shipping discipline

Changes must pass CI on the exact PR head. Merge via squash, check Vercel READY for the exact merge SHA, and preserve existing local cat memories.