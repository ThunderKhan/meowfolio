import type { MatchingPolicy } from '../scan/matching';

export interface ReleaseMatchingPolicy extends MatchingPolicy {
  enabled: boolean;
  strategy: 'first-only' | 'centroid';
  evidenceStatus: 'pending-real-photo-evaluation' | 'approved';
  evidenceReportId?: string;
}

export const RELEASE_MATCHING_POLICY: ReleaseMatchingPolicy = {
  enabled: false,
  strategy: 'centroid',
  evidenceStatus: 'pending-real-photo-evaluation',
};
