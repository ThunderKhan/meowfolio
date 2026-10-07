export function l2Norm(values: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const value = Number(values[i]);
    if (!Number.isFinite(value)) {
      throw new Error('Embedding contains a non-finite value.');
    }
    sum += value * value;
  }
  return Math.sqrt(sum);
}

export function normalizeEmbedding(values: ArrayLike<number>): Float32Array {
  if (values.length === 0) {
    throw new Error('Embedding cannot be empty.');
  }

  const norm = l2Norm(values);
  if (!Number.isFinite(norm) || norm <= Number.EPSILON) {
    throw new Error('Embedding norm is zero or invalid.');
  }

  const normalized = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    normalized[i] = Number(values[i]) / norm;
  }
  return normalized;
}

export function cosineSimilarity(left: ArrayLike<number>, right: ArrayLike<number>): number {
  if (left.length !== right.length || left.length === 0) {
    throw new Error('Embeddings must have the same non-zero dimension.');
  }

  let dot = 0;
  let leftSq = 0;
  let rightSq = 0;

  for (let i = 0; i < left.length; i += 1) {
    const a = Number(left[i]);
    const b = Number(right[i]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error('Embedding contains a non-finite value.');
    }
    dot += a * b;
    leftSq += a * a;
    rightSq += b * b;
  }

  const denominator = Math.sqrt(leftSq) * Math.sqrt(rightSq);
  if (denominator <= Number.EPSILON) {
    throw new Error('Cannot compare a zero-norm embedding.');
  }
  return dot / denominator;
}
