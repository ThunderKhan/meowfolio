import { MODEL_MANIFEST } from '../ai/shared';
import {
  asFloat32Embedding,
  embeddingSpacesEqual,
  firstReference,
  updateCompatibleReference,
} from './reference';
import { createSaveFingerprint } from './fingerprint';
import { createBackupDocument, parseBackupDocument } from './backup';
import type {
  CatRecord,
  CatSummary,
  EncounterRecord,
  SaveEncounterInput,
  SaveEncounterResult,
} from './types';

const DB_NAME = 'meowfolio';
const DB_VERSION = 2;
const CATS = 'cats';
const ENCOUNTERS = 'encounters';
const PENDING_PHOTOS = 'pendingPhotos';

export interface PendingPhoto {
  id: string;
  photo: Blob;
  savedAt: number;
  filename: string;
}

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

    // An upgrade from schema v1 to v2 can emit "blocked" briefly while an
    // older document releases its connection. IDB still completes that open
    // automatically; rejecting in onblocked poisoned dbPromise permanently.
    // Wait for onsuccess, and permit a fresh retry if an old tab truly stays open.
    const attempt = new Promise<IDBDatabase>((resolve, reject) => {
      let finished = false;
      let blockedTimer: ReturnType<typeof setTimeout> | null = null;
      const opening = indexedDB.open(this.dbName, DB_VERSION);

      const finish = (reason?: Error, database?: IDBDatabase) => {
        if (finished) {
          database?.close();
          return;
        }
        finished = true;
        if (blockedTimer !== null) clearTimeout(blockedTimer);
        if (reason) reject(reason);
        else if (database) resolve(database);
      };

      opening.onupgradeneeded = () => {
        const db = opening.result;

        if (!db.objectStoreNames.contains(CATS)) {
          db.createObjectStore(CATS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(PENDING_PHOTOS)) {
          db.createObjectStore(PENDING_PHOTOS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(ENCOUNTERS)) {
          const encounters = db.createObjectStore(ENCOUNTERS, { keyPath: 'id' });
          encounters.createIndex('catId', 'catId', { unique: false });
          encounters.createIndex('catId_timestamp', ['catId', 'timestamp'], { unique: false });
        }
      };

      opening.onsuccess = () => {
        const db = opening.result;
        if (finished) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          // Another tab or an updated release needs a newer schema. Release
          // our connection promptly without deleting any user records.
          db.close();
          if (this.dbPromise === attempt) this.dbPromise = null;
        };
        finish(undefined, db);
      };

      opening.onerror = () => finish(
        opening.error ?? new Error('Could not open local scrapbook. Please try saving again.'),
      );

      opening.onblocked = () => {
        if (blockedTimer !== null) return;
        blockedTimer = setTimeout(() => {
          finish(new Error(
            'The browser is still waiting for an older Meowfolio storage connection to close. ' +
            'Close other Meowfolio tabs (including background tabs), then try Save again. ' +
            'Your photo, name and note are still here. Do not clear site data.',
          ));
        }, 12_000);
      };
    });

    this.dbPromise = attempt;
    // Crucially, a failed/blocked upgrade must not remain cached forever.
    // This lets Save retry without deleting IndexedDB or refreshing the form.
    void attempt.catch(() => {
      if (this.dbPromise === attempt) this.dbPromise = null;
    });
    return attempt;
  }

  async savePendingPhoto(photo: Blob, id: string = crypto.randomUUID(), filename = 'cat-photo.jpg'): Promise<PendingPhoto> {
    const db = await this.open();
    const tx = db.transaction(PENDING_PHOTOS, 'readwrite');
    const done = transactionDone(tx);
    const store = tx.objectStore(PENDING_PHOTOS);
    const existing = (await request(store.get(id))) as PendingPhoto | undefined;
    if (existing) {
      await done;
      return existing;
    }
    const record: PendingPhoto = { id, photo, filename, savedAt: Date.now() };
    await request(store.add(record));
    await done;
    return record;
  }

  async listPendingPhotos(): Promise<PendingPhoto[]> {
    const db = await this.open();
    const tx = db.transaction(PENDING_PHOTOS, 'readonly');
    const records = (await request(tx.objectStore(PENDING_PHOTOS).getAll())) as PendingPhoto[];
    await transactionDone(tx);
    return records.sort((a, b) => b.savedAt - a.savedAt);
  }

  async deletePendingPhoto(id: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(PENDING_PHOTOS, 'readwrite');
    const done = transactionDone(tx);
    await request(tx.objectStore(PENDING_PHOTOS).delete(id));
    await done;
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
    const db = await this.open();
    // Read cat metadata and only the nominated cover encounter for each cat.
    // Loading every encounter's original photo just to display the collection
    // makes both startup time and peak memory grow with the entire archive.
    // One readonly transaction also gives cats and their covers a consistent snapshot.
    const tx = db.transaction([CATS, ENCOUNTERS], 'readonly');
    const done = transactionDone(tx);
    try {
      const cats = (await request(tx.objectStore(CATS).getAll())) as CatRecord[];
      const encounters = tx.objectStore(ENCOUNTERS);
      const covers = await Promise.all(cats.map((cat) =>
        request(encounters.get(cat.coverEncounterId)) as Promise<EncounterRecord | undefined>,
      ));
      await done;
      return cats
        .map((cat, index) => ({ cat, cover: covers[index] }))
        .filter((item) => item.cover?.catId === item.cat.id)
        .sort((left, right) => right.cat.lastSeenAt - left.cat.lastSeenAt)
        .map(({ cat, cover }) => ({
          cat: cloneCat(cat),
          coverPhoto: (cover as EncounterRecord).photo ?? (cover as EncounterRecord).crop,
        }));
    } catch (error) {
      try { await done; } catch { /* Preserve the original read error. */ }
      throw error;
    }
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
    const done = transactionDone(tx);
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

        await done;
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
      await done;

      return {
        cat: cloneCat(cat),
        encounter,
        duplicate: false,
      };
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // The transaction may already be aborting/completing.
      }
      try {
        await done;
      } catch {
        // Preserve the original domain/storage error below.
      }
      throw error;
    }
  }

  /**
   * Snapshot all three stores in one readonly transaction so a backup contains
   * a consistent cat/history/inbox set. Encoding runs after that transaction.
   */
  async exportBackupJson(): Promise<string> {
    const db = await this.open();
    const tx = db.transaction([CATS, ENCOUNTERS, PENDING_PHOTOS], 'readonly');
    const done = transactionDone(tx);
    const [cats, encounters, pendingPhotos] = await Promise.all([
      request(tx.objectStore(CATS).getAll()) as Promise<CatRecord[]>,
      request(tx.objectStore(ENCOUNTERS).getAll()) as Promise<EncounterRecord[]>,
      request(tx.objectStore(PENDING_PHOTOS).getAll()) as Promise<PendingPhoto[]>,
    ]);
    await done;
    return createBackupDocument({ cats, encounters, pendingPhotos });
  }

  /**
   * Additive, all-or-nothing restore. Existing IDs are never replaced, and a
   * conflicting record aborts the entire transaction including earlier adds.
   */
  async importBackupJson(text: string): Promise<{
    cats: number; encounters: number; pendingPhotos: number;
  }> {
    const contents = parseBackupDocument(text);
    const db = await this.open();
    const tx = db.transaction([CATS, ENCOUNTERS, PENDING_PHOTOS], 'readwrite');
    const done = transactionDone(tx);
    try {
      for (const cat of contents.cats) await request(tx.objectStore(CATS).add(cat));
      for (const encounter of contents.encounters) {
        await request(tx.objectStore(ENCOUNTERS).add(encounter));
      }
      for (const item of contents.pendingPhotos) {
        await request(tx.objectStore(PENDING_PHOTOS).add(item));
      }
      await done;
      return {
        cats: contents.cats.length,
        encounters: contents.encounters.length,
        pendingPhotos: contents.pendingPhotos.length,
      };
    } catch (reason) {
      try { tx.abort(); } catch { /* An add failure may already have aborted it. */ }
      try { await done; } catch { /* Preserve the original error. */ }
      if (reason instanceof DOMException && reason.name === 'ConstraintError') {
        throw new Error(
          'This backup contains cats or photos already saved here. ' +
          'Nothing was imported. Use an empty scrapbook for a full restore.',
        );
      }
      throw reason;
    }
  }

  close(): void {
    const active = this.dbPromise;
    this.dbPromise = null;
    if (!active) return;
    void active.then((db) => db.close(), () => {});
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
