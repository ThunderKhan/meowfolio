# ADR-0002 — Human-Confirmed Cat Identity

Status: **Accepted**  
Date: 7 October 2026

## Context

Meowfolio wants to help answer:
> “Have I met this cat before?”

The planned embedding model is a general visual representation model, not a validated individual-cat biometric system.

Visual similarity can be misleading because:
- different cats can share coat colors/patterns,
- the same cat changes with pose/light/distance,
- backgrounds can influence representation,
- the MVP has no identity-calibrated training set.

We need to decide whether the app should:
1. automatically assign an encounter to a cat,
2. show a probability and auto-assign above a threshold,
3. retrieve a possible familiar cat and ask the user.

## Options considered

### A. Automatic identity

Rejected.

Reason:
not supported by current model evidence and creates false certainty.

### B. Threshold probability language

Rejected.

Reason:
cosine similarity is not a calibrated probability that two images depict the same individual cat.

### C. Candidate retrieval + human confirmation

Pros:
- honest,
- useful,
- robust to imperfect embeddings,
- user may know contextual details the model cannot see.

Cons:
- adds one decision step,
- less “magical” demo.

## Decision

**AI only suggests visually similar saved cats. The user is the final authority on identity.**

Approved wording:
- “Possible familiar face”
- “Looks visually similar to Mochi”
- “Is this Mochi again?”

Disallowed wording:
- “AI identified Mochi”
- “92% probability this is Mochi”
unless a future validated model produces a defensible calibrated probability.

## Consequences

### Positive
- lower trust risk,
- no false biometric claim,
- allows general embeddings to provide value,
- makes evaluation goal candidate precision rather than identity accuracy.

### Negative / trade-offs
- one extra tap,
- user can make mistakes,
- product cannot advertise autonomous recognition.

## Revisit when

Only revisit if a purpose-built individual-cat identification method is introduced and validated on appropriate data.

A model upgrade alone is not sufficient; evidence is required.
