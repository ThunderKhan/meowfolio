import type {
  EvaluationStrategy,
  MatchingEvaluationReport,
  ThresholdResult,
} from './types';

export interface PublicMatchingEvidence {
  version: 1;
  generatedAt: string;
  embeddingSpaceKey: string;
  developmentSampleCount: number;
  holdoutSampleCount: number;
  failureCount: number;
  failureSummary: MatchingEvaluationReport['failureSummary'];
  selectedPolicy: {
    strategy: EvaluationStrategy;
    threshold: number;
    minimumMargin: number;
  };
  developmentByStrategy: MatchingEvaluationReport['strategyPolicies'];
  holdoutByStrategy: Record<
    EvaluationStrategy,
    {
      summary: MatchingEvaluationReport['holdoutByStrategy']['first-only']['summary'];
      results: PublicQueryResult[];
      negativeResults: PublicQueryResult[];
    }
  >;
  release: MatchingEvaluationReport['release'];
}

export interface PublicQueryResult {
  query: string;
  trueCat: string;
  negativeGallery: boolean;
  correctSimilarity: number | null;
  highestWrongSimilarity: number | null;
  highestWrongCat: string | null;
  topCandidate: string | null;
  topSimilarity: number | null;
  threshold: number;
  outcome: ThresholdResult['outcome'];
  suggestedCat: string | null;
  referenceSets: Array<{ cat: string; refs: string[] }>;
}

function aliases(report: MatchingEvaluationReport): {
  cat: Map<string, string>;
  query: Map<string, string>;
} {
  const catIds = new Set<string>();
  const assetIds = new Set<string>();

  for (const strategy of ['first-only', 'centroid'] as const) {
    const section = report.holdoutByStrategy[strategy];
    for (const result of [...section.results, ...section.negativeResults]) {
      catIds.add(result.catId);
      if (result.highestWrongCatId) catIds.add(result.highestWrongCatId);
      if (result.topCandidate) catIds.add(result.topCandidate.catId);
      if (result.suggestedCatId) catIds.add(result.suggestedCatId);
      assetIds.add(result.assetId);
      for (const reference of result.referenceSets) {
        catIds.add(reference.catId);
        for (const assetId of reference.assetIds) assetIds.add(assetId);
      }
    }
  }

  const cat = new Map(
    [...catIds].sort().map((id, index) => [id, 'C' + String(index + 1).padStart(2, '0')]),
  );
  const query = new Map(
    [...assetIds].sort().map((id, index) => [id, 'Q' + String(index + 1).padStart(3, '0')]),
  );

  return { cat, query };
}

function publicResult(
  result: ThresholdResult,
  maps: ReturnType<typeof aliases>,
): PublicQueryResult {
  return {
    query: maps.query.get(result.assetId) ?? 'Q???',
    trueCat: maps.cat.get(result.catId) ?? 'C??',
    negativeGallery: result.negativeGallery,
    correctSimilarity: result.correctSimilarity,
    highestWrongSimilarity: result.highestWrongSimilarity,
    highestWrongCat: result.highestWrongCatId
      ? maps.cat.get(result.highestWrongCatId) ?? null
      : null,
    topCandidate: result.topCandidate
      ? maps.cat.get(result.topCandidate.catId) ?? null
      : null,
    topSimilarity: result.topCandidate?.similarity ?? null,
    threshold: result.threshold,
    outcome: result.outcome,
    suggestedCat: result.suggestedCatId
      ? maps.cat.get(result.suggestedCatId) ?? null
      : null,
    referenceSets: result.referenceSets.map((reference) => ({
      cat: maps.cat.get(reference.catId) ?? 'C??',
      refs: reference.assetIds.map((assetId) => maps.query.get(assetId) ?? 'Q???'),
    })),
  };
}

function publicStrategy(
  report: MatchingEvaluationReport,
  strategy: EvaluationStrategy,
  maps: ReturnType<typeof aliases>,
) {
  const section = report.holdoutByStrategy[strategy];
  return {
    summary: section.summary,
    results: section.results.map((result) => publicResult(result, maps)),
    negativeResults: section.negativeResults.map((result) => publicResult(result, maps)),
  };
}

export function createPublicMatchingEvidence(
  report: MatchingEvaluationReport,
): PublicMatchingEvidence {
  const maps = aliases(report);

  return {
    version: 1,
    generatedAt: report.generatedAt,
    embeddingSpaceKey: report.embeddingSpaceKey,
    developmentSampleCount: report.developmentSampleCount,
    holdoutSampleCount: report.holdoutSampleCount,
    failureCount: report.failureCount,
    failureSummary: report.failureSummary,
    selectedPolicy: {
      strategy: report.selectedPolicy.strategy,
      threshold: report.selectedPolicy.threshold,
      minimumMargin: report.selectedPolicy.minimumMargin,
    },
    developmentByStrategy: report.strategyPolicies,
    holdoutByStrategy: {
      'first-only': publicStrategy(report, 'first-only', maps),
      centroid: publicStrategy(report, 'centroid', maps),
    },
    release: report.release,
  };
}
