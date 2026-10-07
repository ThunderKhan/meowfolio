import { normalizeEmbedding } from '../domain/embeddings';
import type { CatRecord, EmbeddingSpace } from './types';

export function embeddingSpaceKey(space: EmbeddingSpace): string {
  return [
    space.modelId,
    space.revision,
    space.dtype,
    String(space.preprocessingVersion),
    String(space.dimension),
    space.pooling,
  ].join('|');
}

export function embeddingSpacesEqual(left: EmbeddingSpace, right: EmbeddingSpace): boolean {
  return embeddingSpaceKey(left) === embeddingSpaceKey(right);
}

export function asFloat32Embedding(values: number[], dimension: number): Float32Array {
  if (values.length !== dimension) {
    throw new Error('Embedding dimension does not match its embedding space.');
  }
  if (!values.every(Number.isFinite)) {
    throw new Error('Embedding contains non-finite values.');
  }

  const normalized = normalizeEmbedding(values);
  return Float32Array.from(normalized);
}

export function firstReference(
  embedding: Float32Array,
): Pick<
  CatRecord,
  'referenceEmbeddingSum' | 'referenceEmbeddingCount' | 'referenceEmbedding'
> {
  return {
    referenceEmbeddingSum: Float64Array.from(embedding),
    referenceEmbeddingCount: 1,
    referenceEmbedding: Float32Array.from(embedding),
  };
}

export function updateCompatibleReference(
  cat: CatRecord,
  embedding: Float32Array,
): Pick<
  CatRecord,
  'referenceEmbeddingSum' | 'referenceEmbeddingCount' | 'referenceEmbedding'
> {
  if (cat.referenceEmbeddingSum.length !== embedding.length) {
    throw new Error('Stored reference sum has an incompatible dimension.');
  }

  const sum = Float64Array.from(cat.referenceEmbeddingSum);
  for (let index = 0; index < sum.length; index += 1) {
    sum[index] += embedding[index];
  }

  const reference = normalizeEmbedding(Array.from(sum));
  return {
    referenceEmbeddingSum: sum,
    referenceEmbeddingCount: cat.referenceEmbeddingCount + 1,
    referenceEmbedding: Float32Array.from(reference),
  };
}
