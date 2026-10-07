import { describe, expect, it } from 'vitest';
import { evaluateMatching } from '../src/evaluation/evaluator';
import { createPublicMatchingEvidence } from '../src/evaluation/publicReport';
import type { EvaluationDataset, EvaluationSample } from '../src/evaluation/types';
import type { EmbeddingSpace } from '../src/storage/types';

const space: EmbeddingSpace = {
  modelId: 'test/dinov2',
  revision: 'rev-1',
  dtype: 'uint8',
  preprocessingVersion: 1,
  dimension: 3,
  pooling: 'cls-token',
};

function sample(
  assetId: string,
  catId: string,
  partition: EvaluationSample['partition'],
  order: number,
  embedding: number[],
): EvaluationSample {
  return { assetId, catId, partition, order, embedding, embeddingSpace: space };
}

function cleanDataset(): EvaluationDataset {
  return {
    version: 1,
    samples: [
      sample('a-ref-1', 'a', 'reference', 1, [1, 0, 0]),
      sample('a-ref-2', 'a', 'reference', 2, [0.98, 0.2, 0]),
      sample('b-ref-1', 'b', 'reference', 1, [0, 1, 0]),
      sample('b-ref-2', 'b', 'reference', 2, [0.2, 0.98, 0]),
      sample('c-ref-1', 'c', 'reference', 1, [0, 0, 1]),
      sample('c-ref-2', 'c', 'reference', 2, [0.1, 0, 0.99]),

      sample('a-dev', 'a', 'development-query', 3, [0.99, 0.1, 0]),
      sample('b-dev', 'b', 'development-query', 3, [0.1, 0.99, 0]),
      sample('c-dev', 'c', 'development-query', 3, [0.05, 0.05, 0.99]),

      sample('a-hold', 'a', 'holdout', 4, [0.97, 0.18, 0]),
      sample('b-hold', 'b', 'holdout', 4, [0.18, 0.97, 0]),
      sample('c-hold', 'c', 'holdout', 4, [0.08, 0.03, 0.99]),
    ],
  };
}

describe('matching evaluator', () => {
  it('freezes one development policy and keeps holdout out of threshold tuning', () => {
    const baseline = cleanDataset();
    const first = evaluateMatching(baseline);

    const changedHoldout: EvaluationDataset = {
      ...baseline,
      samples: baseline.samples.map((item) =>
        item.assetId === 'a-hold'
          ? { ...item, embedding: [0, 1, 0] }
          : item,
      ),
    };
    const second = evaluateMatching(changedHoldout);

    expect(second.selectedPolicy.strategy).toBe(first.selectedPolicy.strategy);
    expect(second.selectedPolicy.threshold).toBe(first.selectedPolicy.threshold);
    expect(second.strategyPolicies['first-only'].threshold).toBe(
      first.strategyPolicies['first-only'].threshold,
    );
    expect(second.strategyPolicies.centroid.threshold).toBe(
      first.strategyPolicies.centroid.threshold,
    );
  });

  it('reports enrolled-repeat results and absent-identity negatives separately', () => {
    const report = evaluateMatching(cleanDataset());
    const selected = report.holdoutByStrategy[report.selectedPolicy.strategy];

    expect(selected.results).toHaveLength(3);
    expect(selected.negativeResults).toHaveLength(3);
    expect(selected.results.every((result) => result.negativeGallery === false)).toBe(true);
    expect(selected.negativeResults.every((result) => result.negativeGallery === true)).toBe(true);
    expect(selected.results.every((result) => result.correctSimilarity !== null)).toBe(true);
    expect(
      selected.results.every(
        (result) =>
          result.highestWrongSimilarity !== null && result.highestWrongCatId !== null,
      ),
    ).toBe(true);
  });

  it('requires a single conservative threshold that abstains above development wrong similarities', () => {
    const report = evaluateMatching(cleanDataset());

    for (const policy of Object.values(report.strategyPolicies)) {
      expect(policy.development.wrongSuggestions).toBe(0);
      expect(policy.threshold).toBeGreaterThanOrEqual(-1);
      expect(policy.threshold).toBeLessThanOrEqual(1);
    }
  });

  it('rejects incompatible embedding spaces instead of comparing same-sized vectors', () => {
    const dataset = cleanDataset();
    dataset.samples[dataset.samples.length - 1] = {
      ...dataset.samples[dataset.samples.length - 1],
      embeddingSpace: { ...space, revision: 'rev-2' },
    };

    expect(() => evaluateMatching(dataset)).toThrow(/compatible embedding space/i);
  });

  it('rejects a development query without an earlier reference for that cat', () => {
    const dataset = cleanDataset();
    const query = dataset.samples.find((item) => item.assetId === 'a-dev')!;
    query.order = 0;

    expect(() => evaluateMatching(dataset)).toThrow(/earlier reference encounter/i);
  });

  it('does not enable a release when a frozen policy produces held-out false familiarity', () => {
    const dataset = cleanDataset();

    // Make cat A's holdout look exactly like B while preserving development data.
    dataset.samples = dataset.samples.map((item) =>
      item.assetId === 'a-hold' ? { ...item, embedding: [0, 1, 0] } : item,
    );

    const report = evaluateMatching(dataset);
    expect(report.release.enabledRecommended).toBe(false);
    expect(report.release.reasons.some((reason) => /wrong suggestions/i.test(reason))).toBe(true);
  });

  it('does not hide supplied processing failures from the public-safe summary', () => {
    const dataset = cleanDataset();
    dataset.failures = [
      {
        assetId: 'd-hold-failed',
        catId: 'd',
        partition: 'holdout',
        reason: 'no-cat',
      },
    ];

    const report = evaluateMatching(dataset);
    expect(report.failureCount).toBe(1);
  });

  it('exports anonymized public evidence without raw asset or cat identifiers', () => {
    const report = evaluateMatching(cleanDataset());
    const evidence = createPublicMatchingEvidence(report);
    const serialized = JSON.stringify(evidence);

    expect(serialized).not.toContain('a-hold');
    expect(serialized).not.toContain('b-hold');
    expect(serialized).not.toContain('c-hold');
    expect(serialized).not.toContain('\"a\"');
    const publicSelected = evidence.holdoutByStrategy[report.selectedPolicy.strategy];
    expect(publicSelected.results[0].query).toMatch(/^Q\d{3}$/);
    expect(publicSelected.results[0].trueCat).toMatch(/^C\d{2}$/);
    expect(evidence.holdoutByStrategy['first-only'].results).toHaveLength(3);
    expect(evidence.holdoutByStrategy.centroid.results).toHaveLength(3);
  });
});
