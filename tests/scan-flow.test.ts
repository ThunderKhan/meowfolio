import { describe, expect, it } from 'vitest';
import { MODEL_MANIFEST, type Detection } from '../src/ai/shared';
import {
  DISABLED_MATCHING_POLICY,
  findFamiliarSuggestion,
  type CatReference,
} from '../src/scan/matching';
import {
  createScanState,
  scanReducer,
  validateCatName,
  warmRecoveryBand,
  type EmbeddingResult,
} from '../src/scan/state';

const detection: Detection = {
  id: 'cat-1',
  label: 'cat',
  score: 0.9,
  box: { xmin: 10, ymin: 10, xmax: 100, ymax: 100 },
};

const secondDetection: Detection = {
  ...detection,
  id: 'cat-2',
  box: { xmin: 120, ymin: 20, xmax: 220, ymax: 120 },
};

const space: EmbeddingResult['space'] = {
  modelId: MODEL_MANIFEST.embedder.id,
  revision: MODEL_MANIFEST.embedder.revision,
  dtype: MODEL_MANIFEST.embedder.dtype.wasm,
  preprocessingVersion: 1,
  dimension: 384,
  pooling: 'cls-token',
};

const embedding: EmbeddingResult = {
  values: Array.from({ length: 384 }, (_, index) => (index === 0 ? 1 : 0)),
  space,
};

describe('scan reducer', () => {
  it('ignores stale async results after a new generation starts', () => {
    const state = createScanState(1);
    const withPhoto = scanReducer(state, {
      type: 'SET_PHOTO',
      photo: new File(['cat'], 'cat.jpg', { type: 'image/jpeg' }),
    });

    const stale = scanReducer(withPhoto, {
      type: 'DETECTIONS_READY',
      generation: state.generation,
      detections: [detection],
      width: 300,
      height: 200,
      elapsedMs: 10,
    });

    expect(stale).toBe(withPhoto);
    expect(stale.detections).toHaveLength(0);
  });

  it('routes multiple cats to human selection and preserves detector time', () => {
    const state = createScanState(1);
    const result = scanReducer(state, {
      type: 'DETECTIONS_READY',
      generation: state.generation,
      detections: [detection, secondDetection],
      width: 300,
      height: 200,
      elapsedMs: 431,
    });

    expect(result.step).toBe('select-cat');
    expect(result.detections).toHaveLength(2);
    expect(result.selectedDetection).toBeNull();
    expect(result.detectionElapsedMs).toBe(431);
  });

  it('treats no-cat as a recoverable result rather than an identity decision', () => {
    const state = createScanState(1);
    const result = scanReducer(state, {
      type: 'DETECTIONS_READY',
      generation: state.generation,
      detections: [],
      width: 300,
      height: 200,
      elapsedMs: 100,
    });

    expect(result.step).toBe('recoverable-error');
    expect(result.error).toMatch(/couldn’t find a cat/i);
    expect(result.identity).toBeNull();
  });

  it('preserves name and note when backing out of details', () => {
    let state = createScanState(1);
    state = scanReducer(state, {
      type: 'EMBEDDING_READY',
      generation: state.generation,
      embedding,
      suggestion: null,
    });
    state = scanReducer(state, { type: 'CHOOSE_NEW' });
    state = scanReducer(state, { type: 'SET_NAME', value: '  Mochi  ' });
    state = scanReducer(state, { type: 'SET_NOTE', value: 'By the garden wall.' });

    const backed = scanReducer(state, { type: 'BACK' });

    expect(backed.step).toBe('identity');
    expect(backed.newCatName).toBe('  Mochi  ');
    expect(backed.note).toBe('By the garden wall.');
    expect(backed.generation).toBe(state.generation + 1);
  });

  it('keeps the first generated new-cat id across identity changes', () => {
    let state = createScanState(1);
    state = scanReducer(state, {
      type: 'EMBEDDING_READY',
      generation: state.generation,
      embedding,
      suggestion: null,
    });
    state = scanReducer(state, { type: 'CHOOSE_NEW' });
    const firstId = state.newCatId;
    state = scanReducer(state, { type: 'BACK' });
    state = scanReducer(state, { type: 'CHOOSE_NEW' });

    expect(firstId).toBeTruthy();
    expect(state.newCatId).toBe(firstId);
  });

  it('moves a 20-second request into a recoverable error and invalidates late work', () => {
    const state = createScanState(1);
    const failed = scanReducer(state, {
      type: 'ASYNC_ERROR',
      generation: state.generation,
      message: 'This scan took too long.',
    });

    expect(failed.step).toBe('recoverable-error');
    expect(failed.generation).toBe(state.generation + 1);

    const late = scanReducer(failed, {
      type: 'EMBEDDING_READY',
      generation: state.generation,
      embedding,
      suggestion: null,
    });

    expect(late).toBe(failed);
  });
});

describe('warm processing bands', () => {
  it('uses 10-second slow warning and 90-second mobile fallback deadline', () => {
    expect(warmRecoveryBand(9_999)).toBe('normal');
    expect(warmRecoveryBand(10_000)).toBe('slow');
    expect(warmRecoveryBand(20_000)).toBe('slow');
    expect(warmRecoveryBand(89_999)).toBe('slow');
    expect(warmRecoveryBand(90_000)).toBe('expired');
  });
});

describe('name validation', () => {
  it('trims for validation, supports Unicode, and enforces 40 graphemes', () => {
    expect(validateCatName('   ')).toMatch(/name/i);
    expect(validateCatName('Mochi 🐈')).toBeNull();
    expect(validateCatName('🐈'.repeat(40))).toBeNull();
    expect(validateCatName('🐈'.repeat(41))).toMatch(/40/);
  });
});

describe('familiar-face boundary', () => {
  const matchingCat: CatReference = {
    id: 'mochi',
    name: 'Mochi',
    encounterCount: 3,
    referenceEmbedding: embedding.values,
    embeddingSpace: space,
  };

  it('never suggests a cat while matching policy is disabled', () => {
    expect(findFamiliarSuggestion(embedding, [matchingCat], DISABLED_MATCHING_POLICY)).toBeNull();
  });

  it('returns one plausible candidate only when an enabled policy permits it', () => {
    const result = findFamiliarSuggestion(embedding, [matchingCat], {
      enabled: true,
      threshold: 0.9,
    });

    expect(result?.catId).toBe('mochi');
    expect(result?.name).toBe('Mochi');
  });

  it('excludes incompatible embedding spaces', () => {
    const incompatible: CatReference = {
      ...matchingCat,
      embeddingSpace: { ...space, revision: 'different-revision' },
    };

    expect(
      findFamiliarSuggestion(embedding, [incompatible], {
        enabled: true,
        threshold: 0.1,
      }),
    ).toBeNull();
  });
});
