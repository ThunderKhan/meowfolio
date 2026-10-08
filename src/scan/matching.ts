import { cosineSimilarity } from '../domain/embeddings';
import type { EmbeddingResult, FamiliarSuggestion } from './state';

export interface CatReference {
  id: string;
  name: string;
  encounterCount: number;
  coverUrl?: string;
  referenceEmbedding?: number[];
  embeddingSpace?: EmbeddingResult['space'];
}

export interface MatchingPolicy {
  enabled: boolean;
  strategy?: 'first-only' | 'centroid';
  threshold?: number;
  minimumMargin?: number;
  embeddingSpaceKey?: string;
}

export const DISABLED_MATCHING_POLICY: MatchingPolicy = {
  enabled: false,
};

export function embeddingSpaceKey(space: EmbeddingResult['space']): string {
  return [
    space.modelId,
    space.revision,
    space.dtype,
    String(space.preprocessingVersion),
    String(space.dimension),
    space.pooling,
  ].join('|');
}

export function findFamiliarSuggestion(
  query: EmbeddingResult,
  cats: CatReference[],
  policy: MatchingPolicy,
): FamiliarSuggestion | null {
  if (!policy.enabled || policy.threshold === undefined) return null;

  const querySpace = embeddingSpaceKey(query.space);
  if (policy.embeddingSpaceKey && policy.embeddingSpaceKey !== querySpace) return null;
  const compatible = cats
    .filter(
      (cat) =>
        cat.referenceEmbedding &&
        cat.embeddingSpace &&
        embeddingSpaceKey(cat.embeddingSpace) === querySpace,
    )
    .map((cat) => ({
      cat,
      similarity: cosineSimilarity(query.values, cat.referenceEmbedding!),
    }))
    .sort((left, right) => right.similarity - left.similarity);

  const best = compatible[0];
  if (!best || best.similarity < policy.threshold) return null;

  const runnerUp = compatible[1];
  const requiredMargin = policy.minimumMargin ?? 0;
  if (runnerUp && best.similarity - runnerUp.similarity < requiredMargin) return null;

  return {
    catId: best.cat.id,
    name: best.cat.name,
    encounterCount: best.cat.encounterCount,
    coverUrl: best.cat.coverUrl,
  };
}
