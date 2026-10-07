import { cosineSimilarity, normalizeEmbedding } from '../domain/embeddings';
import { embeddingSpaceKey } from '../scan/matching';
import type {
  EvaluationDataset,
  EvaluationSample,
  EvaluationStrategy,
  EvaluationSummary,
  FrozenStrategyPolicy,
  MatchingEvaluationReport,
  QueryScore,
  RankedCandidate,
  ThresholdResult,
} from './types';

const TIE_MARGIN = 1e-6;
const THRESHOLD_EPSILON = 1e-6;

interface Reference {
  catId: string;
  embedding: Float32Array;
}

function assertDataset(dataset: EvaluationDataset): string {
  if (dataset.version !== 1) throw new Error('Unsupported evaluation dataset version.');
  if (dataset.samples.length === 0) throw new Error('Evaluation dataset is empty.');

  const firstSpace = embeddingSpaceKey(dataset.samples[0].embeddingSpace);
  const ids = new Set<string>();

  for (const sample of dataset.samples) {
    if (!sample.assetId.trim()) throw new Error('Every evaluation sample requires an assetId.');
    if (!sample.catId.trim()) throw new Error('Every evaluation sample requires a catId.');
    if (ids.has(sample.assetId)) throw new Error('Duplicate evaluation assetId: ' + sample.assetId);
    ids.add(sample.assetId);

    if (embeddingSpaceKey(sample.embeddingSpace) !== firstSpace) {
      throw new Error('Evaluation samples must use one compatible embedding space.');
    }
    if (sample.embedding.length !== sample.embeddingSpace.dimension) {
      throw new Error('Embedding dimension mismatch for ' + sample.assetId);
    }
    normalizeEmbedding(sample.embedding);
  }

  const refsByCat = new Map<string, EvaluationSample[]>();
  for (const sample of dataset.samples.filter((item) => item.partition === 'reference')) {
    const group = refsByCat.get(sample.catId) ?? [];
    group.push(sample);
    refsByCat.set(sample.catId, group);
  }

  for (const query of dataset.samples.filter((item) => item.partition === 'development-query')) {
    const refs = refsByCat.get(query.catId) ?? [];
    if (refs.length === 0) {
      throw new Error('Development query has no earlier reference for cat ' + query.catId);
    }
    if (!refs.some((ref) => ref.order < query.order)) {
      throw new Error(
        'Development query must have an earlier reference encounter: ' + query.assetId,
      );
    }
  }

  return firstSpace;
}

function normalized(values: number[]): Float32Array {
  return normalizeEmbedding(values);
}

function buildReferences(
  samples: EvaluationSample[],
  strategy: EvaluationStrategy,
): Reference[] {
  const byCat = new Map<string, EvaluationSample[]>();
  for (const sample of samples) {
    const group = byCat.get(sample.catId) ?? [];
    group.push(sample);
    byCat.set(sample.catId, group);
  }

  const references: Reference[] = [];
  for (const [catId, group] of byCat) {
    group.sort((left, right) => left.order - right.order);

    if (strategy === 'first-only') {
      references.push({ catId, embedding: normalized(group[0].embedding) });
      continue;
    }

    const dimension = group[0].embedding.length;
    const sum = new Float64Array(dimension);
    for (const sample of group) {
      const vector = normalized(sample.embedding);
      for (let index = 0; index < dimension; index += 1) sum[index] += vector[index];
    }
    references.push({ catId, embedding: normalizeEmbedding(sum) });
  }

  return references;
}

function rank(query: EvaluationSample, references: Reference[]): RankedCandidate[] {
  const q = normalized(query.embedding);
  return references
    .map((reference) => ({
      catId: reference.catId,
      similarity: cosineSimilarity(q, reference.embedding),
    }))
    .sort((left, right) => right.similarity - left.similarity);
}

function scoreQuery(
  query: EvaluationSample,
  references: Reference[],
  strategy: EvaluationStrategy,
  negativeGallery: boolean,
): QueryScore {
  const eligible = negativeGallery
    ? references.filter((reference) => reference.catId !== query.catId)
    : references;
  const ranked = rank(query, eligible);
  const correct = negativeGallery
    ? null
    : rank(
        query,
        references.filter((reference) => reference.catId === query.catId),
      )[0] ?? null;
  const highestWrong =
    rank(
      query,
      references.filter((reference) => reference.catId !== query.catId),
    )[0] ?? null;

  return {
    assetId: query.assetId,
    catId: query.catId,
    strategy,
    negativeGallery,
    correctSimilarity: correct?.similarity ?? null,
    highestWrongSimilarity: highestWrong?.similarity ?? null,
    highestWrongCatId: highestWrong?.catId ?? null,
    topCandidate: ranked[0] ?? null,
    secondCandidate: ranked[1] ?? null,
  };
}

function applyThreshold(
  score: QueryScore,
  threshold: number,
  minimumMargin = TIE_MARGIN,
): ThresholdResult {
  const top = score.topCandidate;
  const second = score.secondCandidate;
  const ambiguous =
    Boolean(top && second) && top!.similarity - second!.similarity < minimumMargin;

  let suggestedCatId: string | null = null;
  if (top && top.similarity >= threshold && !ambiguous) suggestedCatId = top.catId;

  let outcome: ThresholdResult['outcome'];
  if (score.negativeGallery) {
    outcome = suggestedCatId ? 'wrong' : 'abstain';
  } else if (!suggestedCatId) {
    outcome = 'abstain';
  } else {
    outcome = suggestedCatId === score.catId ? 'correct' : 'wrong';
  }

  return { ...score, threshold, outcome, suggestedCatId };
}

function summarize(
  results: ThresholdResult[],
  negativeResults: ThresholdResult[],
  processingFailures = 0,
): EvaluationSummary {
  const positiveWrong = results.filter((result) => result.outcome === 'wrong').length;
  const negativeWrong = negativeResults.filter((result) => result.outcome === 'wrong').length;
  const correct = results.filter((result) => result.outcome === 'correct');
  const repeats = results.length + processingFailures;
  const correctRate = repeats === 0 ? 0 : correct.length / repeats;

  return {
    repeatQueries: repeats,
    negativeQueries: negativeResults.length,
    correctSuggestions: correct.length,
    abstentions:
      results.filter((result) => result.outcome === 'abstain').length +
      negativeResults.filter((result) => result.outcome === 'abstain').length +
      processingFailures,
    wrongSuggestions: positiveWrong + negativeWrong,
    correctCatCount: new Set(correct.map((result) => result.catId)).size,
    correctRate,
    processingFailures,
    zeroWrong: positiveWrong + negativeWrong === 0,
    practicalTargetReached: correctRate >= 0.5,
  };
}

function chooseDevelopmentPolicy(
  dataset: EvaluationDataset,
  strategy: EvaluationStrategy,
  spaceKey: string,
): FrozenStrategyPolicy {
  const references = buildReferences(
    dataset.samples.filter((sample) => sample.partition === 'reference'),
    strategy,
  );
  const queries = dataset.samples.filter((sample) => sample.partition === 'development-query');
  if (queries.length === 0) throw new Error('At least one development query is required.');

  const positiveScores = queries.map((query) => scoreQuery(query, references, strategy, false));
  const negativeScores = queries.map((query) => scoreQuery(query, references, strategy, true));

  const wrongCeiling = Math.max(
    -1,
    ...positiveScores
      .filter((score) => score.topCandidate && score.topCandidate.catId !== score.catId)
      .map((score) => score.topCandidate!.similarity),
    ...negativeScores
      .filter((score) => score.topCandidate)
      .map((score) => score.topCandidate!.similarity),
  );

  const correctSimilarities = positiveScores
    .filter((score) => score.topCandidate?.catId === score.catId)
    .map((score) => score.topCandidate!.similarity);

  const threshold =
    wrongCeiling > -1
      ? wrongCeiling + THRESHOLD_EPSILON
      : correctSimilarities.length > 0
        ? Math.min(...correctSimilarities)
        : 1 + THRESHOLD_EPSILON;

  const results = positiveScores.map((score) => applyThreshold(score, threshold));
  const negatives = negativeScores.map((score) => applyThreshold(score, threshold));
  const developmentFailures =
    dataset.failures?.filter((failure) => failure.partition === 'development-query').length ?? 0;
  const summary = summarize(results, negatives, developmentFailures);

  return {
    strategy,
    threshold,
    minimumMargin: TIE_MARGIN,
    embeddingSpaceKey: spaceKey,
    development: {
      repeatQueries: summary.repeatQueries,
      correctSuggestions: summary.correctSuggestions,
      abstentions: summary.abstentions,
      wrongSuggestions: summary.wrongSuggestions,
      correctCatCount: summary.correctCatCount,
      correctRate: summary.correctRate,
      processingFailures: summary.processingFailures,
    },
  };
}

function pickReleaseStrategy(
  first: FrozenStrategyPolicy,
  centroid: FrozenStrategyPolicy,
): FrozenStrategyPolicy {
  const candidates = [first, centroid].sort((left, right) => {
    if (left.development.wrongSuggestions !== right.development.wrongSuggestions) {
      return left.development.wrongSuggestions - right.development.wrongSuggestions;
    }
    if (left.development.correctSuggestions !== right.development.correctSuggestions) {
      return right.development.correctSuggestions - left.development.correctSuggestions;
    }
    if (left.development.correctCatCount !== right.development.correctCatCount) {
      return right.development.correctCatCount - left.development.correctCatCount;
    }
    // First-only wins an exact tie because it is the simpler reference strategy.
    if (left.strategy === right.strategy) return 0;
    return left.strategy === 'first-only' ? -1 : 1;
  });

  return candidates[0];
}

function holdoutReferenceSamples(dataset: EvaluationDataset): EvaluationSample[] {
  return dataset.samples.filter(
    (sample) => sample.partition === 'reference' || sample.partition === 'development-query',
  );
}

function evaluateHoldout(
  dataset: EvaluationDataset,
  policy: FrozenStrategyPolicy,
): {
  summary: EvaluationSummary;
  results: ThresholdResult[];
  negativeResults: ThresholdResult[];
} {
  const references = buildReferences(holdoutReferenceSamples(dataset), policy.strategy);
  const queries = dataset.samples.filter((sample) => sample.partition === 'holdout');

  const results = queries.map((query) =>
    applyThreshold(
      scoreQuery(query, references, policy.strategy, false),
      policy.threshold,
      policy.minimumMargin,
    ),
  );
  const negativeResults = queries.map((query) =>
    applyThreshold(
      scoreQuery(query, references, policy.strategy, true),
      policy.threshold,
      policy.minimumMargin,
    ),
  );

  const holdoutFailures =
    dataset.failures?.filter((failure) => failure.partition === 'holdout').length ?? 0;

  return {
    summary: summarize(results, negativeResults, holdoutFailures),
    results,
    negativeResults,
  };
}

export function evaluateMatching(dataset: EvaluationDataset): MatchingEvaluationReport {
  const spaceKey = assertDataset(dataset);
  const first = chooseDevelopmentPolicy(dataset, 'first-only', spaceKey);
  const centroid = chooseDevelopmentPolicy(dataset, 'centroid', spaceKey);
  const selected = pickReleaseStrategy(first, centroid);

  const firstHoldout = evaluateHoldout(dataset, first);
  const centroidHoldout = evaluateHoldout(dataset, centroid);
  const selectedHoldout =
    selected.strategy === 'first-only' ? firstHoldout : centroidHoldout;

  const reasons: string[] = [];
  if (!selectedHoldout.summary.zeroWrong) {
    reasons.push('Held-out evaluation contains one or more wrong suggestions.');
  }
  if (selectedHoldout.summary.correctCatCount < 2) {
    reasons.push('Correct held-out suggestions do not span at least two cats.');
  }
  if (!selectedHoldout.summary.practicalTargetReached) {
    reasons.push('Held-out true-repeat correct suggestion rate is below the ~50% practical target.');
  }
  if (dataset.samples.filter((sample) => sample.partition === 'holdout').length === 0) {
    reasons.push('No untouched holdout queries were supplied.');
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    embeddingSpaceKey: spaceKey,
    developmentSampleCount:
      dataset.samples.filter((sample) => sample.partition !== 'holdout').length +
      (dataset.failures?.filter((failure) => failure.partition !== 'holdout').length ?? 0),
    holdoutSampleCount:
      dataset.samples.filter((sample) => sample.partition === 'holdout').length +
      (dataset.failures?.filter((failure) => failure.partition === 'holdout').length ?? 0),
    failureCount: dataset.failures?.length ?? 0,
    strategyPolicies: {
      'first-only': first,
      centroid,
    },
    selectedPolicy: selected,
    holdoutByStrategy: {
      'first-only': firstHoldout,
      centroid: centroidHoldout,
    },
    release: {
      enabledRecommended:
        reasons.length === 0 &&
        selectedHoldout.summary.zeroWrong &&
        selectedHoldout.summary.correctCatCount >= 2 &&
        selectedHoldout.summary.practicalTargetReached,
      reasons,
    },
  };
}
