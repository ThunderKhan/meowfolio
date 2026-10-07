# Meowfolio Documentation

This directory contains the working product and engineering documents for **Meowfolio**.

Start with the repository-level [context.md](../context.md). It is the authoritative context pack for humans and AI assistants. The documents here break that context into execution artifacts.

## Documents

| Document | Purpose |
|---|---|
| [MVP.md](./MVP.md) | Defines exactly what must ship for the Hacktoberfest Week 1 submission and what is out of scope. |
| [PRD.md](./PRD.md) | Product requirements, user flows, functional requirements, non-functional requirements, and success criteria. |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Ordered engineering plan from feasibility spike to submission-ready build. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Browser architecture, AI pipeline, storage model, module boundaries, and technical decisions. |
| [TEST_PLAN.md](./TEST_PLAN.md) | Functional, AI, privacy, performance, browser, and field-test coverage. |
| [SUBMISSION_PLAN.md](./SUBMISSION_PLAN.md) | Hacktoberfest judging strategy, evidence checklist, demo plan, and DEV article outline. |

## Working rule

When documents disagree, use this priority:

1. Official Hacktoberfest challenge rules
2. `context.md`
3. PRD
4. MVP
5. Architecture / implementation / testing documents
6. Current code

If code intentionally changes a locked product decision, update the relevant documents in the same change.

## Current product thesis

> **Meowfolio — your personal scrapbook of the cats you meet outside.**

The product is a mobile-first web app that uses **local browser AI** to detect cats and create visual embeddings for similarity suggestions. Users name cats themselves and build a private, local-first encounter scrapbook.

## Hackathon constraint

The submission should optimize for one polished end-to-end experience:

**go outside → photograph cat → local detection → local similarity check → name/confirm → save encounter → revisit scrapbook**

Do not trade this loop for a larger but shallower feature set.
