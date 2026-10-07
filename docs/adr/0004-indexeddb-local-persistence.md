# ADR-0004 — IndexedDB as Local Persistence

Status: **Accepted**  
Date: 7 October 2026

## Context

The MVP must persist:
- structured cat records,
- encounter records,
- image blobs,
- Float32Array embeddings,
- optional coordinates.

Possible browser storage choices:
1. localStorage,
2. IndexedDB,
3. OPFS/File System APIs,
4. remote database.

## Options considered

### A. localStorage

Rejected.

Reason:
- string-oriented,
- unsuitable for significant structured/binary data,
- synchronous API,
- poor fit for images and embeddings.

### B. IndexedDB

Pros:
- structured objects,
- Blob support,
- typed/binary data support,
- transactions,
- indexes,
- broadly available,
- works without a network.

Cons:
- low-level API is verbose,
- schema migrations require care,
- browser site data can be evicted/cleared.

### C. OPFS / file APIs

Pros:
- strong file-oriented use cases.

Cons:
- unnecessary complexity for MVP object queries,
- less natural for Cat/Encounter records.

### D. Cloud database

Rejected for MVP under ADR-0001.

## Decision

**Use IndexedDB as the local source of truth for Meowfolio MVP data.**

Stores:
- cats,
- encounters,
- settings.

Images are persisted as Blobs.
Embeddings are persisted in structured-clone-compatible binary/typed form.

## Consequences

### Positive
- no backend,
- transactions for cat + encounter consistency,
- appropriate for blobs/structured records,
- offline collection reads.

### Negative / trade-offs
- not encrypted by default,
- users can clear/inspect site storage,
- data is browser/origin-specific,
- migration code is necessary.

## Revisit when

Create a new ADR if:
- cloud sync becomes required,
- IndexedDB performance/storage limits become a measured issue,
- export/import changes the persistence model materially.

Do not replace IndexedDB with localStorage for implementation convenience.
