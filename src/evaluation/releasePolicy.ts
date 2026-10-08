import type { MatchingPolicy } from '../scan/matching';

export interface ReleaseMatchingPolicy extends MatchingPolicy {
  enabled: boolean;
  strategy: 'first-only' | 'centroid';
  evidenceStatus: 'pending-real-photo-evaluation' | 'evaluated-not-approved' | 'approved';
  evidenceReportId?: string;
}

export const RELEASE_MATCHING_POLICY: ReleaseMatchingPolicy = {
  enabled: false,
  strategy: 'centroid',
  evidenceStatus: 'evaluated-not-approved',
  evidenceReportId: 'sha256:59f0cac5ddfa5a14c61033fe9d75679a9a6042a40ec7bb0d4d1e594a52142ef6',
};
