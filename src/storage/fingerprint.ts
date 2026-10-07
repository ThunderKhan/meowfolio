import type { SaveEncounterInput } from './types';

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
}

function canonicalMetadata(input: SaveEncounterInput): string {
  return JSON.stringify({
    encounterId: input.encounterId,
    timestamp: input.timestamp,
    identity: input.identity,
    embeddingSpace: input.embeddingSpace,
    detection: input.detection,
    note: input.note ?? null,
    location: input.location ?? null,
    photo: { type: input.photo.type, size: input.photo.size },
    crop: { type: input.crop.type, size: input.crop.size },
  });
}

export async function createSaveFingerprint(input: SaveEncounterInput): Promise<string> {
  if (!crypto.subtle) throw new Error('Web Crypto is unavailable.');

  const [photoBytes, cropBytes] = await Promise.all([
    input.photo.arrayBuffer(),
    input.crop.arrayBuffer(),
  ]);

  const embedding = Float32Array.from(input.embedding);
  const metadata = new TextEncoder().encode(canonicalMetadata(input));

  const total = new Uint8Array(
    metadata.byteLength + photoBytes.byteLength + cropBytes.byteLength + embedding.byteLength,
  );

  let offset = 0;
  total.set(metadata, offset);
  offset += metadata.byteLength;
  total.set(new Uint8Array(photoBytes), offset);
  offset += photoBytes.byteLength;
  total.set(new Uint8Array(cropBytes), offset);
  offset += cropBytes.byteLength;
  total.set(new Uint8Array(embedding.buffer), offset);

  return hex(await crypto.subtle.digest('SHA-256', total));
}
