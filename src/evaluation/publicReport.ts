import type {
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
  selectedPolicy: {
    strategy: 'first-only' | 'centroid';
    threshold: number;
    minimumMargin: number;
  };
  development: MatchingEvaluationReport['selectedPolicy']['development'];
  holdout: {
    summary: MatchingEvaluationReport['holdoutByStrategy']['first-only']['summary'];
    results: PublicQueryResult[];
    negativeResults: PublicQueryResult[];
  };
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
}

function aliases(report: MatchingEvaluationReport): {
  cat: Map<string, string>;
  query: Map<string, string>;
} {
  const selected = report.holdoutByStrategy[report.selectedPolicy.strategy];
  const catIds = new Set<string>();
  const assetIds = new Set<string>();

  for (const result of [...selected.results, ...selected.negativeResults]) {
    catIds.add(result.catId);
    if (result.highestWrongCatId) catIds.add(result.highestWrongCatId);
    if (result.topCandidate) catIds.add(result.topCandidate.catId);
    if (result.suggestedCatId) catIds.add(result.suggestedCatId);
    assetIds.add(result.assetId);
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
  };
}

export function createPublicMatchingEvidence(
  report: MatchingEvaluationReport,
): PublicMatchingEvidence {
  const maps = aliases(report);
  const selected = report.holdoutByStrategy[report.selectedPolicy.strategy];

  return {
    version: 1,
    generatedAt: report.generatedAt,
    embeddingSpaceKey: report.embeddingSpaceKey,
    developmentSampleCount: report.developmentSampleCount,
    holdoutSampleCount: report.holdoutSampleCount,
    failureCount: report.failureCount,
    selectedPolicy: {
      strategy: report.selectedPolicy.strategy,
      threshold: report.selectedPolicy.threshold,
      minimumMargin: report.selectedPolicy.minimumMargin,
    },
    development: report.selectedPolicy.development,
    holdout: {
      summary: selected.summary,
      results: selected.results.map((result) => publicResult(result, maps)),
      negativeResults: selected.negativeResults.map((result) => publicResult(result, maps)),
    },
    release: report.release,
  };
}
