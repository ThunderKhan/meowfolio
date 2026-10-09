import type { CatRecord, EncounterRecord } from './types';
import type { PendingPhoto } from './repository';

/**
 * Portable, local-only backup. The user downloads this document explicitly;
 * no photos, embeddings or coordinates are sent to a server.
 */
const FORMAT = 'meowfolio-backup';
const VERSION = 1;
export const MAX_BACKUP_FILE_BYTES = 200 * 1024 * 1024;

type EncodedBlob = { type: string; base64: string };
type EncodedCat = Omit<CatRecord, 'referenceEmbeddingSum' | 'referenceEmbedding'> & {
  referenceEmbeddingSum: number[];
  referenceEmbedding: number[];
};
type EncodedEncounter = Omit<EncounterRecord, 'photo' | 'crop' | 'embedding'> & {
  photo: EncodedBlob;
  crop: EncodedBlob;
  embedding: number[];
};
type EncodedPending = Omit<PendingPhoto, 'photo'> & { photo: EncodedBlob };

export interface BackupContents {
  cats: CatRecord[];
  encounters: EncounterRecord[];
  pendingPhotos: PendingPhoto[];
}

interface BackupDocument {
  format: typeof FORMAT;
  version: typeof VERSION;
  exportedAt: string;
  cats: EncodedCat[];
  encounters: EncodedEncounter[];
  pendingPhotos: EncodedPending[];
}

async function encodeBlob(blob: Blob): Promise<EncodedBlob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  // Apply in bounded chunks to avoid max-argument limits for camera photos.
  for (let start = 0; start < bytes.length; start += 16384) {
    chunks.push(String.fromCharCode(...bytes.subarray(start, start + 16384)));
  }
  return { type: blob.type, base64: btoa(chunks.join('')) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validDetection(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.box) ||
      !finite(value.score) || value.score < 0 || value.score > 1 ||
      !nonempty(value.label) || !nonempty(value.detectorModelId) ||
      !nonempty(value.detectorRevision) || !nonempty(value.detectorDtype) ||
      !finite(value.sourceWidth) || value.sourceWidth <= 0 ||
      !finite(value.sourceHeight) || value.sourceHeight <= 0) return false;
  const box = value.box;
  return finite(box.xmin) && finite(box.xmax) &&
    finite(box.ymin) && finite(box.ymax) &&
    box.xmin < box.xmax && box.ymin < box.ymax;
}

function validLocation(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return finite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 &&
    finite(value.longitude) && value.longitude >= -180 && value.longitude <= 180 &&
    finite(value.accuracy) && value.accuracy >= 0 &&
    finite(value.timestamp);
}

function arrayOfNumbers(value: unknown, expected: number): number[] {
  if (!Array.isArray(value) || value.length !== expected ||
      !value.every((entry: unknown) => finite(entry))) {
    throw new Error('Backup contains invalid AI vectors.');
  }
  return value as number[];
}

function dimensionFor(space: unknown): number {
  if (!isRecord(space) ||
      !nonempty(space.modelId) ||
      !nonempty(space.revision) ||
      !nonempty(space.dtype) ||
      !Number.isInteger(space.preprocessingVersion) ||
      (space.preprocessingVersion as number) < 0 ||
      !Number.isInteger(space.dimension) ||
      (space.dimension as number) < 1 ||
      (space.dimension as number) > 4096 ||
      space.pooling !== 'cls-token') {
    throw new Error('Backup contains an invalid embedding format.');
  }
  return space.dimension as number;
}

function decodeBlob(raw: unknown): Blob {
  if (!isRecord(raw) || typeof raw.base64 !== 'string' ||
      typeof raw.type !== 'string' ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw.base64)) {
    throw new Error('Backup has a missing or damaged photo.');
  }
  let binary: string;
  try {
    binary = atob(raw.base64);
  } catch {
    throw new Error('Backup contains a photo that cannot be decoded.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: raw.type });
}

/**
 * Reject obviously oversized archives before reading camera-sized Blobs into
 * JS memory. Base64 alone has a known 4/3 expansion; the final JSON size
 * check below still protects against metadata exceeding the limit.
 */
function assertBackupCanFit(contents: BackupContents): void {
  let base64Bytes = 0;
  const accountFor = (blob: Blob) => {
    if (!Number.isSafeInteger(blob.size) || blob.size < 0) {
      throw new Error('Backup contains a photo with an invalid size.');
    }
    base64Bytes += Math.ceil(blob.size / 3) * 4;
    if (base64Bytes > MAX_BACKUP_FILE_BYTES) {
      throw new Error(
        'The backup exceeds the 200 MB mobile import limit. Try exporting on a computer.',
      );
    }
  };
  for (const record of contents.encounters) {
    accountFor(record.photo);
    accountFor(record.crop);
  }
  for (const pending of contents.pendingPhotos) accountFor(pending.photo);
}

export async function createBackupDocument(contents: BackupContents): Promise<string> {
  assertBackupCanFit(contents);
  const cats: EncodedCat[] = contents.cats.map((cat) => ({
    ...cat,
    referenceEmbeddingSum: Array.from(cat.referenceEmbeddingSum),
    referenceEmbedding: Array.from(cat.referenceEmbedding),
  }));
  const encounters: EncodedEncounter[] = [];
  for (const encounter of contents.encounters) {
    encounters.push({
      ...encounter,
      embedding: Array.from(encounter.embedding),
      photo: await encodeBlob(encounter.photo),
      crop: await encodeBlob(encounter.crop),
    });
  }
  const pendingPhotos: EncodedPending[] = [];
  for (const item of contents.pendingPhotos) {
    pendingPhotos.push({ ...item, photo: await encodeBlob(item.photo) });
  }

  const document: BackupDocument = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    cats,
    encounters,
    pendingPhotos,
  };
  const json = JSON.stringify(document);
  if (new Blob([json]).size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('The backup exceeds the 200 MB mobile import limit. Try exporting on a computer.');
  }
  return json;
}

/**
 * Validate the complete archive BEFORE opening a write transaction.
 * Unknown versions are rejected rather than trying a lossy migration.
 */
export function parseBackupDocument(text: string): BackupContents {
  if (new Blob([text]).size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('This backup is too large for mobile import (200 MB limit).');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not a valid Meowfolio backup.');
  }
  if (!isRecord(raw) || raw.format !== FORMAT || raw.version !== VERSION ||
      !Array.isArray(raw.cats) || !Array.isArray(raw.encounters) ||
      !Array.isArray(raw.pendingPhotos) ||
      raw.cats.length > 10000 || raw.encounters.length > 100000 ||
      raw.pendingPhotos.length > 10000) {
    throw new Error('Unrecognized or unsupported Meowfolio backup format.');
  }

  const cats = raw.cats.map((item: unknown) => {
    if (!isRecord(item) || !nonempty(item.id) || !nonempty(item.name) ||
        !nonempty(item.coverEncounterId) || !finite(item.firstSeenAt) ||
        !finite(item.lastSeenAt) || !finite(item.createdAt) ||
        !finite(item.updatedAt) || !Number.isInteger(item.encounterCount) ||
        (item.encounterCount as number) < 1 ||
        !Number.isInteger(item.referenceEmbeddingCount) ||
        (item.referenceEmbeddingCount as number) < 1 ||
        (item.referenceEmbeddingCount as number) > (item.encounterCount as number) ||
        (item.firstSeenAt as number) > (item.lastSeenAt as number) ||
        (item.createdAt as number) > (item.updatedAt as number)) {
      throw new Error('Backup contains an invalid cat record.');
    }
    const length = dimensionFor(item.embeddingSpace);
    const sum = arrayOfNumbers(item.referenceEmbeddingSum, length);
    const reference = arrayOfNumbers(item.referenceEmbedding, length);
    return {
      ...item,
      referenceEmbeddingSum: Float64Array.from(sum),
      referenceEmbedding: Float32Array.from(reference),
    } as unknown as CatRecord;
  });

  const encounters = raw.encounters.map((item: unknown) => {
    if (!isRecord(item) || !nonempty(item.id) || !nonempty(item.catId) ||
        !nonempty(item.saveFingerprint) || !finite(item.timestamp) ||
        !finite(item.savedAt) || !validDetection(item.detection) ||
        (item.note !== undefined && typeof item.note !== 'string') ||
        (item.location !== undefined && !validLocation(item.location))) {
      throw new Error('Backup contains an invalid encounter.');
    }
    const length = dimensionFor(item.embeddingSpace);
    const embedding = arrayOfNumbers(item.embedding, length);
    return {
      ...item,
      photo: decodeBlob(item.photo),
      crop: decodeBlob(item.crop),
      embedding: Float32Array.from(embedding),
    } as unknown as EncounterRecord;
  });

  const pendingPhotos = raw.pendingPhotos.map((item: unknown) => {
    if (!isRecord(item) || !nonempty(item.id) ||
        !nonempty(item.filename) || !finite(item.savedAt)) {
      throw new Error('Backup contains an invalid inbox photo.');
    }
    return { ...item, photo: decodeBlob(item.photo) } as unknown as PendingPhoto;
  });

  const idsUnique = (ids: string[]) => new Set(ids).size === ids.length;
  if (!idsUnique(cats.map((cat) => cat.id)) ||
      !idsUnique(encounters.map((item) => item.id)) ||
      !idsUnique(pendingPhotos.map((item) => item.id))) {
    throw new Error('Backup contains duplicate record IDs.');
  }

  const byId = new Map(cats.map((cat) => [cat.id, cat]));
  const encounterById = new Map(encounters.map((item) => [item.id, item]));
  const counts = new Map<string, number>();
  for (const encounter of encounters) {
    if (!byId.has(encounter.catId)) {
      throw new Error('Backup contains an encounter without its cat.');
    }
    counts.set(encounter.catId, (counts.get(encounter.catId) ?? 0) + 1);
  }
  for (const cat of cats) {
    if (encounterById.get(cat.coverEncounterId)?.catId !== cat.id ||
        (counts.get(cat.id) ?? 0) !== cat.encounterCount) {
      throw new Error('Backup contains inconsistent cat history.');
    }
  }
  return { cats, encounters, pendingPhotos };
}
