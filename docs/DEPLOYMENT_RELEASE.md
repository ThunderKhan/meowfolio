# Meowfolio Deployment & Release Plan

Status: MVP operational guide

## 1. Deployment model

Meowfolio should deploy as a **static web application**.

No server application is required for the hackathon MVP.

Required:
- HTTPS,
- static asset hosting,
- SPA navigation support if client routing is used,
- adequate asset limits for app bundle.

AI model files may be fetched from Hugging Face or later self-hosted.

## 2. Chosen host: Vercel

The MVP host is **Vercel**, using the static Vite output from this repository's `vercel.json`.

- Production branch: `main`.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Output directory: `dist`.
- No Vercel Functions, runtime server, auth, or cloud database.
- Verify the final HTTPS URL manually: a configuration file is **not** proof of a live deployment.
- Do not change the production origin once users have recorded cats; IndexedDB is bound to the origin.

Preview deployments are optional testing aids; their local storage is **not** shared with the production domain.

## 3. Environments

Minimum:
- local development,
- production deployment.

A separate staging environment is optional and likely unnecessary for a solo four-day hackathon.

Preview deployments from branches/PRs are useful if the selected host provides them automatically.

## 4. Build

Expected:
```bash
npm ci
npm run build
```

Production output should be reproducible enough for static deployment.

Exact scripts are set during scaffold.

## 5. Environment variables

MVP should need few or none.

If model host/config is environment-driven:
- only public configuration belongs in client-side env variables.

Never place secrets in frontend environment variables.

## 6. Routing

If React Router/browser history routing is used:
- configure host fallback to `index.html`.

Alternatively:
- keep routing simple enough for GitHub Pages constraints if that host is selected.

Do not discover broken deep links on submission day.

## 7. Model hosting decision

### Option A — Hugging Face runtime fetch
Pros:
- fast setup,
- no huge repo,
- standard Transformers.js path.

Cons:
- first-use dependency on external host,
- CORS/network availability,
- remote revision drift unless pinned.

### Option B — self-host model assets
Pros:
- one controlled origin,
- easier deployment reproducibility.

Cons:
- large deployment artifact,
- host limits,
- bandwidth.

Start with A unless testing/deployment reliability gives a reason to change.

Pin model revision when practical once stable.

## 8. Headers

The checked-in `vercel.json` applies:
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
- same-origin geolocation/camera permission policy and disabled microphone,
- HTML root revalidation,
- immutable hashed Vite assets.

It deliberately does **not** add unverified restrictive CSP, COOP or COEP headers because the first-use flow fetches pinned model assets from Hugging Face and may fetch WASM runtime assets from its supported CDN. Audit network behaviour on the deployed origin before introducing tighter cross-origin restrictions.

## 9. Caching

App hashed assets:
- long cache lifetime.

HTML:
- update-friendly/no immutable cache.

Model assets:
- runtime/browser cache behavior plus upstream headers.

Do not manually build complex service-worker cache logic unless PWA work is promoted into scope.

## 10. Release workflow

Before production release:

### Code
- [ ] build passes,
- [ ] core automated tests pass,
- [ ] no secrets,
- [ ] dependency lockfile committed,
- [ ] docs reflect current architecture.

### AI
- [ ] detector real-photo test,
- [ ] embedding/similarity test,
- [ ] mobile provider test,
- [ ] model revisions/license recorded.

### UX
- [ ] new-cat flow,
- [ ] repeat flow,
- [ ] no-cat flow,
- [ ] location denied flow,
- [ ] model first-use state.

### Storage
- [ ] save/reload,
- [ ] existing data survives deployed update where schema unchanged.

### Privacy
- [ ] Network panel inspected,
- [ ] no image/location upload by product code.

### Accessibility
- [ ] keyboard smoke,
- [ ] focus,
- [ ] contrast,
- [ ] status announcements,
- [ ] mobile touch.

## 11. Release freeze

By 11 October:
- stop discretionary feature work,
- fix P0/P1,
- avoid dependency/model upgrades,
- record final demo against exact deployed build.

Do not “improve” core architecture after demo recording unless a blocker forces it.

## 12. Rollback

Static host must make it easy to redeploy/revert to a known commit.

Before risky late changes:
- record known-good commit SHA.

If production breaks:
- revert deploy,
- fix on branch,
- redeploy.

## 13. Release version

Hackathon release:
`v0.1.0`

Tag only when:
- deployed build is final enough,
- README/submission links point to the intended state.

## 14. Production smoke test

CI now runs `npm run audit:production` and `npm run test:e2e:production` against the **ordinary** Vite output before running the E2E-only fixture build. That checks static artifacts, production-only route isolation, pixel theme and the explicit model-download consent boundary.

These CI checks do not substitute for the real Android and Vercel tests documented in [ANDROID_FIELD_TEST.md](ANDROID_FIELD_TEST.md).

From a fresh/incognito browser profile where practical:
1. open production URL,
2. first-run onboarding,
3. start scan,
4. model load,
5. process image,
6. save cat,
7. reload,
8. inspect collection,
9. deny location in a separate run,
10. test deep-link navigation if used.

## 15. Submission stability

Once DEV article is published:
- avoid breaking URLs,
- preserve live demo,
- preserve tagged release,
- keep model references usable.

The hackathon artifact should remain reviewable after the deadline.
