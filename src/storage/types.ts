import type { Detection, WorkerResponse } from '../ai/shared';

export type EmbeddingSpace = Extract<
  WorkerResponse,
  { type: 'EMBEDDING_RESULT' }
>['space'];

export interface EncounterLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface DetectionRecord {
  box: Detection['box'];
  score: number;
  label: string;
  detectorModelId: string;
  detectorRevision: string;
  detectorDtype: string;
  sourceWidth: number;
  sourceHeight: number;
}

export interface CatRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  firstSeenAt: number;
  lastSeenAt: number;
  encounterCount: number;
  coverEncounterId: string;
  referenceEmbeddingSum: Float64Array;
  referenceEmbeddingCount: number;
  referenceEmbedding: Float32Array;
  embeddingSpace: EmbeddingSpace;
}

export interface EncounterRecord {
  id: string;
  catId: string;
  timestamp: number;
  savedAt: number;
  photo: Blob;
  crop: Blob;
  embedding: Float32Array;
  embeddingSpace: EmbeddingSpace;
  detection: DetectionRecord;
  note?: string;
  location?: EncounterLocation;
  saveFingerprint: string;
}

export type SaveIdentity =
  | { kind: 'new'; catId: string; name: string }
  | { kind: 'existing'; catId: string };

export interface SaveEncounterInput {
  encounterId: string;
  timestamp: number;
  photo: Blob;
  crop: Blob;
  embedding: number[];
  embeddingSpace: EmbeddingSpace;
  detection: DetectionRecord;
  note?: string;
  location?: EncounterLocation;
  identity: SaveIdentity;
}

export interface SaveEncounterResult {
  cat: CatRecord;
  encounter: EncounterRecord;
  duplicate: boolean;
}

export interface CatSummary {
  cat: CatRecord;
  coverPhoto: Blob;
}
