# Contributing to Meowfolio

Thanks for helping the neighborhood-cat scrapbook feel more reliable, accessible and fun. 🐈

## Before opening a PR

Please open an issue to discuss substantial changes to the models, browser storage schema, privacy policy, or identity-matching behavior. Small documentation, accessibility and tested bug fixes can go straight to a PR.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run audit:production
npm run test:e2e:production
```

For changes to camera, local inference, IndexedDB, matching, or story exports, also run `npm run test:e2e`, which exercises real YOLOS/DINOv2 in Chromium. Browser setup: `npx playwright install chromium`.

### Engineering rules

- Do not upload cat photos, embeddings, precise coordinates or backups to any server. The scrapbook should remain browser-local.
- Do not silently modify, migrate, compress or discard existing saved photos. Any schema migration must be tested against old data.
- Never enable automatic familiar-cat suggestions without **new, preregistered evaluation evidence** demonstrating acceptable false-positive behavior. The old holdout cannot be retuned after inspection.
- Preserve the early-2000s pink/pixel aesthetic. Keep keyboard support, visible focus, small-screen usability and reduced-motion preferences.
- Avoid adding analytics, unrelated dependencies, fake window controls, or a custom server for a static client-side app.
- Add tests for changed failure and recovery paths. Mark Android field validation as pending if you have only desktop evidence.

## Licensing

By contributing code to this repository, you agree that your contributions may be distributed under the [Mozilla Public License 2.0](LICENSE). Only submit code, artwork or data you have the right to contribute. Model weights, third-party source and other licenses are described in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Do not commit private cat photographs, raw animal-location datasets, tokens or personal backup JSON files. Public review/test images must have clear redistributable rights and their attribution must be recorded.
