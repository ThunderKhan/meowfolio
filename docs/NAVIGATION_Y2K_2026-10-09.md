# Navigation and GitHub stars — Y2K design note

## Reference and intent

Reference inspected: `ThunderKhan/hactoberfest-static-site` (`src/App.tsx` and `src/styles/06-navbar-glass.css`). Its useful structural pattern is brand → real navigation destinations → primary CTA, with accessible mobile navigation. This app intentionally does **not** copy its floating glass, rounded pill, animation, dark theme or mobile dialog: Meowfolio is a playful early-2000s pink scrapbook.

## Decisions

- Place a small native `<nav>` inside Meowfolio's existing pixel-window titlebar instead of creating a separate tall floating bar. The existing first-screen mobile layout must remain compact at 320px.
- Desktop: Home, Cats, + Add cat, GitHub ★ count. Mobile: Home, Cats, GitHub ★ count. Phone Camera and Add Photo remain the preferred creation controls immediately below.
- Home returns to the top of the scrapbook and exits open cat detail; Cats exits open detail and scrolls to the saved-cat collection/empty state. The Story Studio navbar returns to scrapbook; the existing Back to scrapbook button remains available. No navbar is inserted into an active scan because sudden navigation could discard an unsaved image; ScanFlow already has explicit exit safeguards.
- Use actual buttons for local in-app actions and a real external link for GitHub, `target=_blank` and `rel=noopener noreferrer`.
- Github link goes to `https://github.com/ThunderKhan/meowfolio`, because stars belong to repositories. Footer creator attribution goes to `https://github.com/ThunderKhan` (profile).
- Request ONLY public metadata from `https://api.github.com/repos/ThunderKhan/meowfolio`, parse a non-negative integer `stargazers_count` and cache for 15 minutes in sessionStorage. If the API is unavailable/rate-limited, show the GitHub link and star symbol **without inventing a 0 count**. The request never includes photos, saved cats, embeddings or coordinates.
- Keep focus rings, minimum 44px navigation targets, tab order, narrow-screen single-row layout, original square pink windows and the existing expressive type.

## Tests

- Production browser: GitHub count fetch and session cache, creator profile link, 403 fallback without fake count, navigation hit areas and reflow at 320/390/760/1024/1728 widths.
- Mock-AI browser: after saving a real cat, Cats leaves the detail page and Home returns to the header; Story Studio Cats link exits the studio.
- Existing TypeScript, unit tests, Vite production build, production artifact audit, production Playwright browser tests, and real YOLOS/DINOv2 Chromium browser tests.

## Remaining limitations

- GitHub may throttle or block unauthenticated API reads; stars are best-effort, not a live guaranteed streaming counter.
- This feature deliberately adds a public metadata request to GitHub, distinct from the app's photo pipeline. Browser-local photos never get sent to GitHub.
- Android touch testing and independent screen-reader audits should still be done before a broader release.