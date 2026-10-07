# Meowfolio Backlog

This is an execution backlog, not a wishlist.

Priority:
- **P0** release blocker / core feasibility
- **P1** MVP required
- **P2** useful if core is stable
- **P3** post-hackathon

## P0 — Feasibility and release blockers

- [ ] Scaffold React + TypeScript + Vite app.
- [ ] Install/configure Transformers.js.
- [ ] Prove YOLOv10n loads in browser.
- [ ] Prove cat detection on real image.
- [ ] Prove correct detector crop.
- [ ] Prove DINOv2-small loads in browser.
- [ ] Extract stable embedding.
- [ ] Implement/test vector normalization.
- [ ] Implement/test cosine similarity.
- [ ] Benchmark intended demo phone.
- [ ] Resolve detector AGPL licensing decision.
- [ ] Confirm production deployment can load model assets.

## P1 — Core product

### Persistence
- [ ] IndexedDB v1.
- [ ] Cat repository.
- [ ] Encounter repository.
- [ ] create Cat + first Encounter transaction.
- [ ] repeat Encounter + Cat update transaction.
- [ ] model metadata stored with embeddings.

### Scan flow
- [ ] photo/camera input.
- [ ] preview/change photo.
- [ ] model preparation state.
- [ ] detection state.
- [ ] no-cat state.
- [ ] multiple-cat selection.
- [ ] crop pipeline.
- [ ] embedding pipeline.
- [ ] candidate ranking.
- [ ] possible familiar face UI.
- [ ] new-cat naming.
- [ ] repeat-cat confirmation.
- [ ] save progress/error.

### Scrapbook
- [ ] collection empty state.
- [ ] cat grid.
- [ ] cat card.
- [ ] cat detail.
- [ ] encounter timeline.
- [ ] persistence after reload.

### Privacy
- [ ] optional geolocation.
- [ ] permission denied path.
- [ ] local-processing copy.
- [ ] Network panel verification.

### Accessibility
- [ ] keyboard flow.
- [ ] focus-visible.
- [ ] live model/status messages.
- [ ] contrast.
- [ ] touch targets.
- [ ] multiple-cat DOM selection.

### Release
- [ ] production deploy.
- [ ] README.
- [ ] model/runtime attribution.
- [ ] outdoor field test.
- [ ] demo recording.
- [ ] DEV article.

## P2 — only after P0/P1 pass

- [ ] private map of encounters.
- [ ] approximate place labels.
- [ ] PWA manifest.
- [ ] offline shell.
- [ ] export/import.
- [ ] multiple reference embeddings / alternate similarity strategy if evaluation supports it.
- [ ] collection search.
- [ ] scrapbook micro-interactions.
- [ ] clear-all-data UI.
- [ ] storage usage diagnostics.

## P3 — post-hackathon

- [ ] other animals.
- [ ] optional cross-device sync with redesigned privacy model.
- [ ] privacy-preserving sharing.
- [ ] fuzzed public sightings.
- [ ] purpose-built cat re-identification research/model.
- [ ] collection statistics.
- [ ] richer map.
- [ ] localization.

## Won't do for MVP

- [ ] LLM cat naming.
- [ ] AI personality biographies.
- [ ] chatbot.
- [ ] social feed.
- [ ] likes/comments.
- [ ] public precise cat map.
- [ ] AR.
- [ ] multiplayer.
- [ ] leaderboard.
- [ ] cloud database.
- [ ] authentication.

## Backlog rule

Before starting a P2 item:
all P0 items and the user-visible P1 core loop must be working on the deployed build.

If not, work on the core.
