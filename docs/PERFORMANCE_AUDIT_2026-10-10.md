# Performance optimization audit — 10 October 2026

## Architecture and baseline

Meowfolio is a static Vite/React app served by Vercel's edge CDN. The cat database is browser IndexedDB, and Hugging Face models run in a local Web Worker. There is no remote application server, custom JSON API, SQL database, or server session that can benefit from a load balancer or DB connection pool.

## Improvements in this PR

| Requested optimization | Actual action |
| --- | --- |
| Split JavaScript into chunks | React.lazy + Suspense for ScanFlow, Story Studio, Scrapbook, and dev-only Matching Lab. Vite emits named hashed chunks and the production artifact audit verifies them. Welcome can render without waiting for heavy route code. |
| Defer non-critical scripts | Vite's module entry script is deferred by the browser; optional feature modules are now downloaded on demand. No unnecessary inline scripts or tracking SDKs added. |
| Lazy-load images | Offscreen saved cat covers, pending photos, thumbnails and timeline photographs use native `loading=lazy` and `decoding=async`. Visible first two covers load eagerly. |
| Paginate large lists | Initial collection reads a page of up to 12 cover photos, then offers Show more. Each additional page remains opt-in; cat records are lightweight metadata and do not require an IndexedDB schema migration. |
| Cache expensive computed results | Reuse Intl.DateTimeFormat instances in history rendering; existing long-lived AI worker/model cache is preserved. |
| CDN / server caching | Existing Vercel CDN and immutable hashed JS/CSS/worker headers retained. Additional bounded shared-image caching for favicon and Open Graph image and revalidation for Studio HTML. |
| Database indexes / N+1 | Existing v2 IndexedDB `catId` and `catId_timestamp` indexes retained. Page covers are fetched by indexed primary keys inside a single read transaction. Not remote N+1 queries. |
| API response caching | The preexisting 15-minute session cache for GitHub stars and pinned local model Cache Storage remain active; no bespoke service introduced. |
| Loading skeleton | Accessible minimal CSS-only placeholder for slow feature module downloads. |
| Minification | Existing production Vite build minifies JS/CSS. No competing minification pipeline or extra dependency added. |
| Lighthouse | Added mobile and desktop Lighthouse lab workflow on the actual Vite production build, with downloadable JSON reports and a printed metrics summary. Scores are lab-only and intentionally not fabricated or enforced as a flaky deployment gate. |

## Out-of-scope or inappropriate requests

- **Compress all images:** Existing original cat photographs are private, potentially irreplaceable user data. The app already creates smaller JPEG crops for inference; changing originals, JPEG quality or existing IndexedDB Blobs silently would be a data-loss regression. Native lazy image decoding and paged cover reads reduce memory pressure without recompressing or replacing originals. A future separately-tested thumbnail store could be added with an opt-in migration. The user-provided icon and social artwork are also left unaltered.
- **Database connection pooling:** IndexedDB is a same-browser transactional database, not a server database. One reused browser connection and atomic transactions are the appropriate pattern.
- **Load balancer:** Vercel already operates the static CDN; there are no app servers to balance.
- **Fix N+1 remote database queries:** No remote database exists. IndexedDB covers use keyed requests in one transaction and fetching is bounded by a UI page.
- **Compress API payloads:** No custom API response bodies are produced. GitHub's external API controls its own content negotiation and compression. Vercel handles transport compression for its assets.
- **Server-side caching:** No custom server rendering or API endpoints exist. Immutable static asset headers and CDN cache are used instead.
- **Debounce input handlers:** No expensive search-as-you-type remote queries exist. Delaying camera selection, sliders, or name typing would hurt usability; do not debounce arbitrary controls just to check a box.
- **Remove unused dependencies:** Runtime dependencies are React, React DOM, and Transformers.js, all required. Build/test dependencies remain deliberately installed; removing any would break the current CI.

## Release tests and limitations

- Existing production E2E, browser ML tests, unit/typecheck, and artifact audit must pass on the PR head.
- New browser test seeds 14 distinct cats, confirms 12 covers initially, loads the other two on demand, and opens a later cat.
- Lighthouse report is reproducible in GitHub Actions but does not validate physical Android latency, storage eviction, or network conditions.
- Paged loading still reads all *cat metadata* to preserve last-seen sorting without upgrading IndexedDB v2. For thousands of cats, a future indexed `lastSeenAt` migration and cursor pagination could lower metadata read cost.
- Loading a second page recreates visible cover object URLs; it trades some repeated cover reads for a simple, rollback-friendly schema-free first release. Streaming/permanent thumbnails and virtualization warrant their own benchmarks.
- Every original photo, encounter embedding, backup format, and automatic matching release policy is unchanged.

## Verify

Run the `Verify Meowfolio` PR workflow, download the `meowfolio-lighthouse` artifact from `Lighthouse performance baseline`, inspect the printed mobile and desktop categories/FCP/LCP/TBT/CLS and test on an actual Android device before concluding that production speed is satisfactory.