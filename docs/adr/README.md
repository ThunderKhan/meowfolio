# Meowfolio Architecture Decision Records

ADRs record architecturally significant decisions and the reasons behind them.

Once an ADR is **Accepted**, do not rewrite its decision because the project changed. Create a new ADR that supersedes it so the history remains understandable.

## Status values
- Proposed
- Accepted
- Rejected
- Superseded

## Current decisions

| ADR | Decision | Status |
|---|---|---|
| [0001](./0001-local-first-browser-architecture.md) | Use a local-first, browser-only MVP architecture | Accepted |
| [0002](./0002-human-confirmed-cat-identity.md) | AI suggests similarity; users decide cat identity | Accepted |
| [0003](./0003-two-stage-local-vision-pipeline.md) | Use detection + visual embedding as separate stages | Accepted |
| [0004](./0004-indexeddb-local-persistence.md) | Use IndexedDB as the MVP source of truth | Accepted |

## ADR template

```md
# ADR-XXXX — Title

Status: Proposed
Date: YYYY-MM-DD

## Context

What problem or decision are we facing?

## Options considered

1. ...
2. ...

## Decision

We use ...

## Consequences

### Positive
- ...

### Negative / trade-offs
- ...

## Revisit when

- ...
```
