# Meowfolio Data Model

Status: MVP storage contract  
Persistence: browser IndexedDB

## 1. Goals

The data model must support:
- cats,
- repeated encounters,
- image blobs,
- visual embeddings,
- optional notes,
- optional location,
- future schema migration.

It must not assume:
- accounts,
- cloud sync,
- public profiles,
- server-generated IDs.

## 2. Database

Name:
`meowfolio`

Initial version:
`1`

Object stores:
- `cats`
- `encounters`
- `settings`

Use explicit integer schema versions.

## 3. ID format

Generate IDs with:
`crypto.randomUUID()`

IDs are opaque strings.

Do not encode:
- cat name,
- timestamp,
- location,
- model version
inside IDs.

## 4. Cat record

```ts
type CatRecord = {
  id: string
  name: string

  createdAt: number
  updatedAt: number
  firstSeenAt: number
  lastSeenAt: number

  encounterCount: number
  coverEncounterId: string

  referenceEmbedding: Float32Array
  referenceEmbeddingCount: number

  note?: string

  model: {
    embeddingModelId: string
    embeddingModelRevision?: string
    embeddingDimension: number
  }
}
```

### Invariants
- `name.trim().length > 0`
- `encounterCount >= 1`
- `firstSeenAt <= lastSeenAt`
- `coverEncounterId` must reference an encounter belonging to this cat.
- embedding dimension must match the model metadata.
- reference embedding must be normalized before persistence.

## 5. Encounter record

```ts
type EncounterRecord = {
  id: string
  catId: string

  timestamp: number

  imageBlob: Blob
  image: {
    mimeType: string
    width: number
    height: number
  }

  embedding: Float32Array

  detection: {
    modelId: string
    modelRevision?: string
    confidence: number
    sourceBox: {
      x: number
      y: number
      width: number
      height: number
    }
  }

  note?: string

  location?: {
    latitude: number
    longitude: number
    accuracy: number
  }
}
```

### Invariants
- `catId` references a Cat.
- timestamp is a finite epoch millisecond value.
- image is a stored local Blob.
- detection confidence is recorded as detector output, not user-facing identity confidence.
- embedding dimension matches Cat model metadata.

## 6. Settings record

Use key/value records.

Examples:
- `onboardingCompleted`
- `schemaVersion`
- `lastKnownRuntime`
- optional local diagnostics preferences.

Do not store secrets; the MVP has none.

## 7. Indexes

### cats
- primary key: `id`
- index: `createdAt`
- index: `lastSeenAt`

Optional later:
- normalized name.

### encounters
- primary key: `id`
- index: `catId`
- index: `timestamp`

A compound `[catId, timestamp]` index can be added if measurement shows it meaningfully simplifies timeline reads.

Do not add indexes “just in case.”

## 8. Relationships

```text
Cat 1 ──────────── N Encounter
 │
 ├─ coverEncounterId ───────┐
 │                          │
 └──────────────────────────┘
```

IndexedDB does not enforce foreign keys.

The repository layer is responsible for relationship consistency.

## 9. Creation transaction

Creating a new cat:

1. build Cat record,
2. build first Encounter record,
3. open read-write transaction over `cats` and `encounters`,
4. insert encounter,
5. insert cat,
6. complete transaction,
7. only then report success.

Failure must not surface as a saved cat.

## 10. Repeat transaction

Confirming an existing cat:

1. load Cat,
2. create Encounter,
3. calculate updated reference embedding,
4. increment count,
5. update lastSeenAt/updatedAt,
6. write Encounter + Cat in one transaction.

## 11. Reference embedding update

MVP strategy:
- every **human-confirmed** encounter may contribute to the reference.
- rejected AI suggestions never contribute.

Preferred stable formulation:
- keep a normalized reference plus count for MVP,
- update with weighted average,
- normalize result.

If numerical quality becomes a concern, migrate to storing a running vector sum.

## 12. Model versioning

Embeddings from different models or incompatible revisions may not be comparable.

Therefore:
- persist embedding model ID,
- persist embedding dimension,
- optionally model revision/hash if runtime exposes a useful stable value.

If the embedding model changes incompatibly:
- do not compare old and new embeddings blindly,
- either re-embed stored images locally or start a versioned embedding field.

This is a migration decision, not a silent implementation detail.

## 13. Image storage

Store a resized display-quality cat crop or processed image, not necessarily the full original camera image.

Goals:
- good scrapbook quality,
- lower storage use,
- less accidental background/privacy data.

Do not retain original EXIF metadata unless explicitly needed.

## 14. Location

Location is part of an Encounter, not a Cat.

Reason:
a cat can move and repeated sightings can occur in different places.

No location is represented by field absence, not fake `0,0`.

## 15. Deletion

Deletion UI is optional for MVP.

If implemented:

### Delete encounter
- update Cat counts/reference if reference calculation depends on it,
- handle cover encounter,
- avoid leaving dangling `coverEncounterId`.

### Delete cat
- delete its encounters in the same logical operation/transaction.

No soft-delete is required for MVP.

## 16. Migration policy

All schema changes:
1. increment IndexedDB version,
2. implement migration in `onupgradeneeded`,
3. preserve user data when practical,
4. document destructive migrations.

Never clear the whole database as a routine schema-upgrade strategy.

## 17. Storage quota behavior

Images and cached models can consume significant browser storage.

The app should eventually inspect:
`navigator.storage.estimate()`

MVP behavior:
- handle failed writes,
- never claim success after quota failure.

Optional:
- show local storage usage in diagnostics/settings.

## 18. Data ownership

The browser profile/origin owns the data.

Consequences:
- clearing site data removes the scrapbook,
- another browser/device will not share it,
- incognito/private mode may behave differently,
- cloud backup does not exist.

Communicate this honestly if needed in About/Privacy.

## 19. Export future-proofing

Not MVP, but records should be structured so future export can represent:
- cat metadata,
- encounter metadata,
- images,
- embeddings/model metadata.

Do not design a proprietary binary archive during the hackathon.
