import type { EmbeddingSpace } from '../storage/types';

export type EvaluationPartition = 'reference' | 'development-query' | 'holdout';
export type EvaluationStrategy = 'first-only' | 'centroid';
export type EvaluationOutcome = 'correct' | 'abstain' | 'wrong';

export interface EvaluationSample {
  assetId: string;
  catId: string;
  partition: EvaluationPartition;
  order: number;
  embedding: number[];
  embeddingSpace: EmbeddingSpace;
}

export interface EvaluationFailure {
  assetId: string;
  catId: string;
  partition: EvaluationPartition;
  reason:
    | 'decode-failed'
    | 'no-cat'
    | 'multiple-cats'
    | 'detection-failed'
    | 'embedding-failed'
    | 'incompatible-space';
}

export interface EvaluationDataset {
  version: 1;
  samples: EvaluationSample[];
  failures?: EvaluationFailure[];
}

export interface RankedCandidate {
  catId: string;
  similarity: number;
}

export interface QueryReferenceSet {
  catId: string;
  assetIds: string[];
}

export interface QueryScore {
  assetId: string;
  catId: string;
  strategy: EvaluationStrategy;
  negativeGallery: boolean;
  referenceSets: QueryReferenceSet[];
  correctSimilarity: number | null;
  highestWrongSimilarity: number | null;
  highestWrongCatId: string | null;
  topCandidate: RankedCandidate | null;
  secondCandidate: RankedCandidate | null;
}

export interface ThresholdResult extends QueryScore {
  threshold: number;
  outcome: EvaluationOutcome;
  suggestedCatId: string | null;
}

export interface FrozenStrategyPolicy {
  strategy: EvaluationStrategy;
  threshold: number;
  minimumMargin: number;
  embeddingSpaceKey: string;
  development: {
    repeatQueries: number;
    correctSuggestions: number;
    abstentions: number;
    wrongSuggestions: number;
    correctCatCount: number;
    correctRate: number;
    processingFailures: number;
  };
}

export interface EvaluationSummary {
  repeatQueries: number;
  negativeQueries: number;
  correctSuggestions: number;
  abstentions: number;
  wrongSuggestions: number;
  correctCatCount: number;
  correctRate: number;
  processingFailures: number;
  zeroWrong: boolean;
  practicalTargetReached: boolean;
}

export interface MatchingEvaluationReport {
  version: 1;
  generatedAt: string;
  embeddingSpaceKey: string;
  developmentSampleCount: number;
  holdoutSampleCount: number;
  failureCount: number;
  failureSummary: {
    byPartition: Record<EvaluationPartition, number>;
    byReason: Record<EvaluationFailure['reason'], number>;
  };
  strategyPolicies: Record<EvaluationStrategy, FrozenStrategyPolicy>;
  selectedPolicy: FrozenStrategyPolicy;
  holdoutByStrategy: Record<
    EvaluationStrategy,
    {
      summary: EvaluationSummary;
      results: ThresholdResult[];
      negativeResults: ThresholdResult[];
    }
  >;
  release: {
    enabledRecommended: boolean;
    reasons: string[];
  };
}
