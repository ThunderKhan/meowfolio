import { describe, expect, it } from 'vitest';
import { createBackupDocument, parseBackupDocument } from './backup';
import type { CatRecord, EncounterRecord } from './types';
import type { PendingPhoto } from './repository';

function fixture() {
  const space = {
    modelId: 'fixture-model', revision: 'fixed-revision', dtype: 'uint8',
    preprocessingVersion: 1, dimension: 2, pooling: 'cls-token',
  } as CatRecord['embeddingSpace'];
  const cat: CatRecord = {
    id: 'cat-001', name: 'Mochi', createdAt: 100, updatedAt: 200,
    firstSeenAt: 100, lastSeenAt: 200, encounterCount: 1,
    coverEncounterId: 'enc-001', referenceEmbeddingSum: new Float64Array([1, 0]),
    referenceEmbeddingCount: 1, referenceEmbedding: new Float32Array([1, 0]),
    embeddingSpace: space,
  };
  const encounter: EncounterRecord = {
    id: 'enc-001', catId: 'cat-001', timestamp: 200, savedAt: 200,
    photo: new Blob(['original cat bytes'], { type: 'image/jpeg' }),
    crop: new Blob(['crop bytes'], { type: 'image/png' }),
    embedding: new Float32Array([1, 0]), embeddingSpace: space,
    detection: {
      box: { xmin: 0, ymin: 0, xmax: 10, ymax: 10 },
      label: 'cat', score: 0.91,
      sourceWidth: 10, sourceHeight: 10,
      detectorModelId: 'fixture-detector', detectorRevision: 'rev',
      detectorDtype: 'uint8',
    },
    note: 'At the garden', saveFingerprint: 'test-fingerprint',
    location: { latitude: 20, longitude: 80, accuracy: 5, timestamp: 200 },
  };
  const pendingPhoto: PendingPhoto = {
    id: 'pending-001', photo: new Blob(['waiting image'], { type: 'image/png' }),
    filename: 'waiting.png', savedAt: 300,
  };
  return { cats: [cat], encounters: [encounter], pendingPhotos: [pendingPhoto] };
}

describe('private Meowfolio portable backup', () => {
  it('round-trips original photos, crops, vectors, locations and pending inbox', async () => {
    const source = fixture();
    const archive = await createBackupDocument(source);
    expect(archive).toContain('"format":"meowfolio-backup"');
    const restored = parseBackupDocument(archive);
    expect(restored.cats[0].name).toBe('Mochi');
    expect(restored.cats[0].referenceEmbeddingSum).toBeInstanceOf(Float64Array);
    expect(Array.from(restored.cats[0].referenceEmbedding)).toEqual([1, 0]);
    expect(restored.encounters[0].embedding).toBeInstanceOf(Float32Array);
    expect(await restored.encounters[0].photo.text()).toBe('original cat bytes');
    expect(await restored.encounters[0].crop.text()).toBe('crop bytes');
    expect(restored.encounters[0].photo.type).toBe('image/jpeg');
    expect(restored.encounters[0].location?.latitude).toBe(20);
    expect(await restored.pendingPhotos[0].photo.text()).toBe('waiting image');
  });

  it('rejects an oversized photo before attempting to allocate or read its bytes', async () => {
    const contents = fixture();
    let readAttempts = 0;
    // Simulate a very large camera Blob without allocating a giant test file.
    const oversized = {
      size: 200 * 1024 * 1024,
      type: 'image/jpeg',
      arrayBuffer: async () => {
        readAttempts += 1;
        throw new Error('Must not read the oversized photo');
      },
    } as unknown as Blob;
    contents.encounters[0].photo = oversized;
    await expect(createBackupDocument(contents)).rejects.toThrow(/exceeds the 200 MB/);
    expect(readAttempts).toBe(0);
  });

  it('can create an empty archive without inventing cat records', async () => {
    const archive = await createBackupDocument({ cats: [], encounters: [], pendingPhotos: [] });
    const parsed = parseBackupDocument(archive);
    expect(parsed).toEqual({ cats: [], encounters: [], pendingPhotos: [] });
  });

  it('rejects unrecognized formats and invalid JSON', () => {
    expect(() => parseBackupDocument('not json')).toThrow(/valid Meowfolio backup/i);
    expect(() => parseBackupDocument('{"format":"meowfolio-backup","version":2,"cats":[],"encounters":[],"pendingPhotos":[]}'))
      .toThrow(/unsupported/i);
  });

  it('rejects a damaged photo before any database import', async () => {
    const archive = JSON.parse(await createBackupDocument(fixture()));
    archive.encounters[0].photo.base64 = '_bad_';
    expect(() => parseBackupDocument(JSON.stringify(archive))).toThrow(/photo/i);
  });

  it('rejects duplicate cat IDs and orphan encounters', async () => {
    const archive = JSON.parse(await createBackupDocument(fixture()));
    archive.cats.push({ ...archive.cats[0] });
    expect(() => parseBackupDocument(JSON.stringify(archive))).toThrow(/duplicate/i);
    archive.cats.pop();
    archive.encounters[0].catId = 'not-a-cat';
    expect(() => parseBackupDocument(JSON.stringify(archive))).toThrow(/without its cat/i);
  });


  it('rejects invalid geographic coordinates and inaccurate location types', async () => {
    const base = JSON.parse(await createBackupDocument(fixture()));
    base.encounters[0].location.latitude = 91;
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid encounter/i);
    base.encounters[0].location.latitude = 20;
    base.encounters[0].location.accuracy = -1;
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid encounter/i);
    base.encounters[0].location = 'somewhere';
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid encounter/i);
  });

  it('rejects broken detection geometry, scores and optional notes', async () => {
    const base = JSON.parse(await createBackupDocument(fixture()));
    base.encounters[0].detection.box.xmin = 12;
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid encounter/i);
    base.encounters[0].detection.box.xmin = 0;
    base.encounters[0].detection.score = 4;
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid encounter/i);
    base.encounters[0].detection.score = 0.9;
    base.encounters[0].note = { invalid: true };
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid encounter/i);
  });

  it('rejects inconsistent cat counters and broken embedding metadata', async () => {
    const base = JSON.parse(await createBackupDocument(fixture()));
    base.cats[0].referenceEmbeddingCount = 9;
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid cat/i);
    base.cats[0].referenceEmbeddingCount = 1;
    base.cats[0].embeddingSpace.dimension = 2.5;
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/embedding format/i);
    base.cats[0].embeddingSpace.dimension = 2;
    base.cats[0].embeddingSpace.pooling = 'unknown';
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/embedding format/i);
    base.cats[0].embeddingSpace.pooling = 'cls-token';
    base.cats[0].firstSeenAt = 500;
    expect(() => parseBackupDocument(JSON.stringify(base))).toThrow(/invalid cat/i);
  });

  it('rejects a history count mismatch', async () => {
    const archive = JSON.parse(await createBackupDocument(fixture()));
    archive.cats[0].encounterCount = 99;
    expect(() => parseBackupDocument(JSON.stringify(archive))).toThrow(/inconsistent/i);
  });
});
