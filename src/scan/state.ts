import type { Detection, WorkerResponse } from '../ai/shared';

export type ScanStep =
  | 'preview'
  | 'preparation-consent'
  | 'preparing'
  | 'detecting'
  | 'select-cat'
  | 'embedding'
  | 'identity'
  | 'existing-picker'
  | 'details'
  | 'saving'
  | 'success'
  | 'recoverable-error';

export interface EmbeddingResult {
  values: number[];
  space: Extract<WorkerResponse, { type: 'EMBEDDING_RESULT' }>['space'];
}

export interface FamiliarSuggestion {
  catId: string;
  name: string;
  encounterCount: number;
  coverUrl?: string;
}

export type IdentityDecision =
  | { kind: 'new' }
  | { kind: 'existing'; catId: string }
  | null;

export interface ScanState {
  step: ScanStep;
  generation: number;
  encounterId: string;
  timestamp: number;
  photo: File | null;
  detections: Detection[];
  sourceWidth: number;
  sourceHeight: number;
  detectionElapsedMs: number;
  selectedDetection: Detection | null;
  crop: Blob | null;
  embedding: EmbeddingResult | null;
  suggestion: FamiliarSuggestion | null;
  identity: IdentityDecision;
  newCatId: string | null;
  newCatName: string;
  note: string;
  error: string | null;
  slowWarning: boolean;
  savedCatName: string | null;
}

export function createScanState(now = Date.now()): ScanState {
  return {
    step: 'preview',
    generation: 1,
    encounterId: crypto.randomUUID(),
    timestamp: now,
    photo: null,
    detections: [],
    sourceWidth: 0,
    sourceHeight: 0,
    detectionElapsedMs: 0,
    selectedDetection: null,
    crop: null,
    embedding: null,
    suggestion: null,
    identity: null,
    newCatId: null,
    newCatName: '',
    note: '',
    error: null,
    slowWarning: false,
    savedCatName: null,
  };
}

type AsyncAction =
  | {
      type: 'DETECTIONS_READY';
      generation: number;
      detections: Detection[];
      width: number;
      height: number;
      elapsedMs: number;
    }
  | {
      type: 'CROP_READY';
      generation: number;
      detection: Detection;
      crop: Blob;
    }
  | {
      type: 'EMBEDDING_READY';
      generation: number;
      embedding: EmbeddingResult;
      suggestion: FamiliarSuggestion | null;
    }
  | { type: 'ASYNC_ERROR'; generation: number; message: string }
  | { type: 'SLOW_WARNING'; generation: number };

export type ScanAction =
  | AsyncAction
  | { type: 'SET_PHOTO'; photo: File }
  | { type: 'NEEDS_CONSENT' }
  | { type: 'PREPARING' }
  | { type: 'DETECTING' }
  | { type: 'SELECT_DETECTION'; detection: Detection }
  | { type: 'EMBEDDING' }
  | { type: 'OPEN_EXISTING_PICKER' }
  | { type: 'CHOOSE_EXISTING'; catId: string }
  | { type: 'CHOOSE_NEW' }
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; catName: string }
  | { type: 'SAVE_FAILED'; message: string }
  | { type: 'KEEP_WAITING' }
  | { type: 'BACK' }
  | { type: 'RETRY' }
  | { type: 'DISCARD'; now?: number };

function isStale(state: ScanState, action: AsyncAction): boolean {
  return action.generation !== state.generation;
}

export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  if (
    action.type === 'DETECTIONS_READY' ||
    action.type === 'CROP_READY' ||
    action.type === 'EMBEDDING_READY' ||
    action.type === 'ASYNC_ERROR' ||
    action.type === 'SLOW_WARNING'
  ) {
    if (isStale(state, action)) return state;
  }

  switch (action.type) {
    case 'SET_PHOTO':
      return {
        ...state,
        step: 'preview',
        generation: state.generation + 1,
        photo: action.photo,
        detections: [],
        sourceWidth: 0,
        sourceHeight: 0,
        detectionElapsedMs: 0,
        selectedDetection: null,
        crop: null,
        embedding: null,
        suggestion: null,
        identity: null,
        newCatId: null,
        error: null,
        slowWarning: false,
        savedCatName: null,
      };
    case 'NEEDS_CONSENT':
      return { ...state, step: 'preparation-consent', error: null, slowWarning: false };
    case 'PREPARING':
      return { ...state, step: 'preparing', error: null, slowWarning: false };
    case 'DETECTING':
      return { ...state, step: 'detecting', error: null, slowWarning: false };
    case 'DETECTIONS_READY':
      if (action.detections.length === 0) {
        return {
          ...state,
          step: 'recoverable-error',
          detections: [],
          sourceWidth: action.width,
          sourceHeight: action.height,
          detectionElapsedMs: action.elapsedMs,
          error: 'I couldn’t find a cat in this photo. Try a clearer photo where the cat takes up more of the frame.',
          slowWarning: false,
        };
      }
      if (action.detections.length === 1) {
        return {
          ...state,
          detections: action.detections,
          sourceWidth: action.width,
          sourceHeight: action.height,
          detectionElapsedMs: action.elapsedMs,
          selectedDetection: action.detections[0],
          error: null,
          slowWarning: false,
        };
      }
      return {
        ...state,
        step: 'select-cat',
        detections: action.detections,
        sourceWidth: action.width,
        sourceHeight: action.height,
        detectionElapsedMs: action.elapsedMs,
        selectedDetection: null,
        error: null,
        slowWarning: false,
      };
    case 'SELECT_DETECTION':
      return { ...state, selectedDetection: action.detection, error: null };
    case 'CROP_READY':
      return { ...state, selectedDetection: action.detection, crop: action.crop, error: null };
    case 'EMBEDDING':
      return { ...state, step: 'embedding', error: null, slowWarning: false };
    case 'EMBEDDING_READY':
      return {
        ...state,
        step: 'identity',
        embedding: action.embedding,
        suggestion: action.suggestion,
        identity: null,
        error: null,
        slowWarning: false,
      };
    case 'OPEN_EXISTING_PICKER':
      return { ...state, step: 'existing-picker' };
    case 'CHOOSE_EXISTING':
      return {
        ...state,
        step: 'details',
        identity: { kind: 'existing', catId: action.catId },
        error: null,
      };
    case 'CHOOSE_NEW':
      return {
        ...state,
        step: 'details',
        identity: { kind: 'new' },
        newCatId: state.newCatId ?? crypto.randomUUID(),
        error: null,
      };
    case 'SET_NAME':
      return { ...state, newCatName: action.value };
    case 'SET_NOTE':
      return { ...state, note: action.value };
    case 'SAVE_START':
      return { ...state, step: 'saving', error: null };
    case 'SAVE_SUCCESS':
      return { ...state, step: 'success', savedCatName: action.catName, error: null };
    case 'SAVE_FAILED':
      return { ...state, step: 'details', error: action.message };
    case 'SLOW_WARNING':
      return { ...state, slowWarning: true };
    case 'KEEP_WAITING':
      return { ...state, slowWarning: false };
    case 'ASYNC_ERROR':
      return {
        ...state,
        step: 'recoverable-error',
        generation: state.generation + 1,
        error: action.message,
        slowWarning: false,
      };
    case 'BACK': {
      const generation = state.generation + 1;
      if (
        state.step === 'preparation-consent' ||
        state.step === 'preparing' ||
        state.step === 'detecting' ||
        state.step === 'recoverable-error'
      ) {
        return { ...state, step: 'preview', generation, error: null, slowWarning: false };
      }
      if (state.step === 'select-cat') {
        return { ...state, step: 'preview', generation, selectedDetection: null, error: null };
      }
      if (state.step === 'embedding') {
        return {
          ...state,
          step: state.detections.length > 1 ? 'select-cat' : 'preview',
          generation,
          error: null,
          slowWarning: false,
        };
      }
      if (state.step === 'saving' || state.step === 'success') return state;
      if (state.step === 'existing-picker' || state.step === 'details') {
        return { ...state, step: 'identity', generation, error: null, slowWarning: false };
      }
      if (state.step === 'identity') {
        return {
          ...state,
          step: state.detections.length > 1 ? 'select-cat' : 'preview',
          generation,
          error: null,
          slowWarning: false,
        };
      }
      return state;
    }
    case 'RETRY':
      return {
        ...state,
        step: 'preview',
        generation: state.generation + 1,
        error: null,
        slowWarning: false,
      };
    case 'DISCARD':
      return createScanState(action.now ?? Date.now());
    default:
      return state;
  }
}

export function countGraphemes(value: string): number {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value)).length;
  }
  return Array.from(value).length;
}

export function validateCatName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Give this cat a name.';
  if (countGraphemes(trimmed) > 40) return 'Keep the name to 40 characters or fewer.';
  return null;
}

export type WarmRecoveryBand = 'normal' | 'slow' | 'expired';

export function warmRecoveryBand(elapsedMs: number): WarmRecoveryBand {
  if (elapsedMs >= 20_000) return 'expired';
  if (elapsedMs >= 10_000) return 'slow';
  return 'normal';
}
