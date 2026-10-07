import { describe, expect, it } from 'vitest';
import {
  asFloat32Embedding,
  embeddingSpacesEqual,
  firstReference,
  updateCompatibleReference,
} from '../src/storage/reference';
import type { CatRecord, EmbeddingSpace } from '../src/storage/types';

const space: EmbeddingSpace = {
  modelId: 'test/dino',
  revision: 'rev-a',
  dtype: 'uint8',
  preprocessingVersion: 1,
  dimension: 2,
  pooling: 'cls-token',
};

function catFrom(values: number[]): CatRecord {
  const embedding = asFloat32Embedding(values, 2);
  return {
    id: 'cat-1',
    name: 'Mochi',
    createdAt: 1,
    updatedAt: 1,
    firstSeenAt: 1,
    lastSeenAt: 1,
    encounterCount: 1,
    coverEncounterId: 'enc-1',
    ...firstReference(embedding),
    embeddingSpace: space,
  };
}

describe('reference embeddings', () => {
  it('stores an exact sum and normalized reference for the first encounter', () => {
    const embedding = asFloat32Embedding([3, 4], 2);
    const reference = firstReference(embedding);

    expect(Array.from(reference.referenceEmbeddingSum)).toEqual([0.6000000238418579, 0.800000011920929]);
    expect(reference.referenceEmbeddingCount).toBe(1);
    expect(reference.referenceEmbedding[0]).toBeCloseTo(0.6, 6);
    expect(reference.referenceEmbedding[1]).toBeCloseTo(0.8, 6);
  });

  it('gives later compatible confirmed encounters equal weight', () => {
    const cat = catFrom([1, 0]);
    const second = asFloat32Embedding([0, 1], 2);
    const updated = updateCompatibleReference(cat, second);

    expect(Array.from(updated.referenceEmbeddingSum)).toEqual([1, 1]);
    expect(updated.referenceEmbeddingCount).toBe(2);
    expect(updated.referenceEmbedding[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(updated.referenceEmbedding[1]).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('treats model/preprocessing changes as incompatible even at the same dimension', () => {
    expect(embeddingSpacesEqual(space, { ...space })).toBe(true);
    expect(embeddingSpacesEqual(space, { ...space, revision: 'rev-b' })).toBe(false);
    expect(embeddingSpacesEqual(space, { ...space, preprocessingVersion: 2 })).toBe(false);
  });

  it('rejects invalid vectors before storage', () => {
    expect(() => asFloat32Embedding([1], 2)).toThrow(/dimension/i);
    expect(() => asFloat32Embedding([Number.NaN, 1], 2)).toThrow(/non-finite/i);
    expect(() => asFloat32Embedding([0, 0], 2)).toThrow();
  });
});
