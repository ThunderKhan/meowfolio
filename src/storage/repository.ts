import { MODEL_MANIFEST } from '../ai/shared';
import {
  asFloat32Embedding,
  embeddingSpacesEqual,
  firstReference,
  updateCompatibleReference,
} from './reference';
import { createSaveFingerprint } from './fingerprint';
import type {
  CatRecord,
  CatSummary,
  EncounterRecord,
  SaveEncounterInput,
  SaveEncounterResult,
} from './types';

const DB_NAME = 'meowfolio';
const DB_VERSION = 1;
const CATS = 'cats';
const ENCOUNTERS = 'encounters';

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

function cloneCat(cat: CatRecord): CatRecord {
  return {
    ...cat,
    referenceEmbeddingSum: Float64Array.from(cat.referenceEmbeddingSum),
    referenceEmbedding: Float32Array.from(cat.referenceEmbedding),
  };
}

export class EncounterConflictError extends Error {
  constructor() {
    super('This encounter ID is already committed with different data.');
    this.name = 'EncounterConflictError';
  }
}

export class CatNotFoundError extends Error {
  constructor(catId: string) {
    super('The selected saved cat no longer exists: ' + catId);
    this.name = 'CatNotFoundError';
  }
}

export class MeowfolioRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly dbName = DB_NAME) {}

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const opening = indexedDB.open(this.dbName, DB_VERSION);

      opening.onupgradeneeded = () => {
        const db = opening.result;

        if (!db.objectStoreNames.contains(CATS)) {
          db.createObjectStore(CATS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(ENCOUNTERS)) {
          const encounters = db.createObjectStore(ENCOUNTERS, { keyPath: 'id' });
          encounters.createIndex('catId', 'catId', { unique: false });
          encounters.createIndex('catId_timestamp', ['catId', 'timestamp'], { unique: false });
        }
      };

      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error ?? new Error('Could not open local scrapbook.'));
      opening.onblocked = () => reject(new Error('A previous Meowfolio tab is blocking storage setup.'));
    });

    return this.dbPromise;
  }

  async listCats(): Promise<CatRecord[]> {
    const db = await this.open();
    const tx = db.transaction(CATS, 'readonly');
    const cats = (await request(tx.objectStore(CATS).getAll())) as CatRecord[];
    await transactionDone(tx);
    return cats.sort((left, right) => right.lastSeenAt - left.lastSeenAt).map(cloneCat);
  }

  async getCat(id: string): Promise<CatRecord | undefined> {
    const db = await this.open();
    const tx = db.transaction(CATS, 'readonly');
    const cat = (await request(tx.objectStore(CATS).get(id))) as CatRecord | undefined;
    await transactionDone(tx);
    return cat ? cloneCat(cat) : undefined;
  }

  async getEncounter(id: string): Promise<EncounterRecord | undefined> {
    const db = await this.open();
    const tx = db.transaction(ENCOUNTERS, 'readonly');
    const encounter = (await request(tx.objectStore(ENCOUNTERS).get(id))) as
      | EncounterRecord
      | undefined;
    await transactionDone(tx);
    return encounter;
  }

  async getCatSummaries(): Promise<CatSummary[]> {
    const cats = await this.listCats();
    const db = await this.open();
    const tx = db.transaction(ENCOUNTERS, 'readonly');
    const store = tx.objectStore(ENCOUNTERS);
    const summaries: CatSummary[] = [];

    for (const cat of cats) {
      const cover = (await request(store.get(cat.coverEncounterId))) as EncounterRecord | undefined;
      if (cover) summaries.push({ cat, coverPhoto: cover.crop ?? cover.photo });
    }

    await transactionDone(tx);
    return summaries;
  }

  async listEncountersForCat(catId: string): Promise<EncounterRecord[]> {
    const db = await this.open();
    const tx = db.transaction(ENCOUNTERS, 'readonly');
    const index = tx.objectStore(ENCOUNTERS).index('catId_timestamp');
    const records = (await request(
      index.getAll(IDBKeyRange.bound([catId, 0], [catId, Number.MAX_SAFE_INTEGER])),
    )) as EncounterRecord[];
    await transactionDone(tx);
    return records.sort((left, right) => left.timestamp - right.timestamp);
  }

  async saveEncounter(input: SaveEncounterInput): Promise<SaveEncounterResult> {
    const embedding = asFloat32Embedding(input.embedding, input.embeddingSpace.dimension);
    const fingerprint = await createSaveFingerprint(input);
    const db = await this.open();

    const tx = db.transaction([CATS, ENCOUNTERS], 'readwrite');
    const cats = tx.objectStore(CATS);
    const encounters = tx.objectStore(ENCOUNTERS);

    try {
      const existingEncounter = (await request(encounters.get(input.encounterId))) as
        | EncounterRecord
        | undefined;

      if (existingEncounter) {
        if (existingEncounter.saveFingerprint !== fingerprint) {
          throw new EncounterConflictError();
        }

        const existingCat = (await request(cats.get(existingEncounter.catId))) as
          | CatRecord
          | undefined;
        if (!existingCat) throw new CatNotFoundError(existingEncounter.catId);

        await transactionDone(tx);
        return {
          cat: cloneCat(existingCat),
          encounter: existingEncounter,
          duplicate: true,
        };
      }

      const now = Date.now();
      let cat: CatRecord;

      if (input.identity.kind === 'new') {
        const name = input.identity.name.trim();
        if (!name) throw new Error('A new cat requires a name.');

        const reference = firstReference(embedding);
        cat = {
          id: input.identity.catId,
          name,
          createdAt: now,
          updatedAt: now,
          firstSeenAt: input.timestamp,
          lastSeenAt: input.timestamp,
          encounterCount: 1,
          coverEncounterId: input.encounterId,
          ...reference,
          embeddingSpace: input.embeddingSpace,
        };

        await request(cats.add(cat));
      } else {
        const stored = (await request(cats.get(input.identity.catId))) as CatRecord | undefined;
        if (!stored) throw new CatNotFoundError(input.identity.catId);

        const compatible = embeddingSpacesEqual(stored.embeddingSpace, input.embeddingSpace);
        const reference = compatible ? updateCompatibleReference(stored, embedding) : null;

        cat = {
          ...stored,
          updatedAt: now,
          firstSeenAt: Math.min(stored.firstSeenAt, input.timestamp),
          lastSeenAt: Math.max(stored.lastSeenAt, input.timestamp),
          encounterCount: stored.encounterCount + 1,
          ...(reference ?? {}),
        };

        await request(cats.put(cat));
      }

      const encounter: EncounterRecord = {
        id: input.encounterId,
        catId: cat.id,
        timestamp: input.timestamp,
        savedAt: now,
        photo: input.photo,
        crop: input.crop,
        embedding,
        embeddingSpace: input.embeddingSpace,
        detection: input.detection,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        ...(input.location ? { location: input.location } : {}),
        saveFingerprint: fingerprint,
      };

      await request(encounters.add(encounter));
      await transactionDone(tx);

      return {
        cat: cloneCat(cat),
        encounter,
        duplicate: false,
      };
    } catch (error) {
      if (tx.readyState !== 'done') {
        try {
          tx.abort();
        } catch {
          // Already completing/aborted.
        }
      }
      try {
        await transactionDone(tx);
      } catch {
        // Preserve the original domain/storage error below.
      }
      throw error;
    }
  }

  close(): void {
    if (!this.dbPromise) return;
    void this.dbPromise.then((db) => db.close());
    this.dbPromise = null;
  }
}

export function detectionRecordFor(
  box: { xmin: number; ymin: number; xmax: number; ymax: number },
  score: number,
  label: string,
  sourceWidth: number,
  sourceHeight: number,
) {
  return {
    box,
    score,
    label,
    detectorModelId: MODEL_MANIFEST.detector.id,
    detectorRevision: MODEL_MANIFEST.detector.revision,
    detectorDtype: MODEL_MANIFEST.detector.dtype.wasm,
    sourceWidth,
    sourceHeight,
  };
}

export async function deleteMeowfolioDatabase(dbName = DB_NAME): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase(dbName);
    deletion.onsuccess = () => resolve();
    deletion.onerror = () => reject(deletion.error ?? new Error('Could not delete test database.'));
    deletion.onblocked = () => reject(new Error('Database deletion was blocked.'));
  });
}
