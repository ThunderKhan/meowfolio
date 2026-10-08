import { describe, expect, it } from 'vitest';
import { RELEASE_MATCHING_POLICY } from '../src/evaluation/releasePolicy';
import { findFamiliarSuggestion, type CatReference } from '../src/scan/matching';
import type { EmbeddingSpace } from '../src/storage/types';

const space: EmbeddingSpace = {
  modelId: 'Xenova/dinov2-small',
  revision: 'a5406bdfce9ac07eb3dc08dd05cbea034f4648d8',
  dtype: 'uint8',
  preprocessingVersion: 1,
  dimension: 384,
  pooling: 'cls-token',
};

const embedding = Array.from({ length: 384 }, (_, index) => (index === 0 ? 1 : 0));
const cat: CatReference = {
  id: 'fixture-cat',
  name: 'Fixture cat',
  encounterCount: 2,
  referenceEmbedding: embedding,
  embeddingSpace: space,
};

describe('reviewed real photo release policy', () => {
  it('stays disabled after a held-out unknown-cat false match', () => {
    expect(RELEASE_MATCHING_POLICY.enabled).toBe(false);
    expect(RELEASE_MATCHING_POLICY.evidenceStatus).toBe('evaluated-not-approved');
    expect(RELEASE_MATCHING_POLICY.evidenceReportId).toBe(
      'sha256:59f0cac5ddfa5a14c61033fe9d75679a9a6042a40ec7bb0d4d1e594a52142ef6',
    );
    expect(RELEASE_MATCHING_POLICY.threshold).toBeUndefined();
  });

  it('never suggests an existing cat despite an identical embedding', () => {
    expect(
      findFamiliarSuggestion({ values: embedding, space }, [cat], RELEASE_MATCHING_POLICY),
    ).toBeNull();
  });
});
