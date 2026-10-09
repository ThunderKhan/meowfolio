import { describe, expect, it } from 'vitest';
import {
  GenerationGuard,
  MODEL_MANIFEST,
  classifyAiNetworkRequest,
  pinModelAssetUrl,
} from '../src/ai/shared';
import { cosineSimilarity, l2Norm, normalizeEmbedding } from '../src/domain/embeddings';

describe('embedding math', () => {
  it('normalizes a vector to unit length', () => {
    const normalized = normalizeEmbedding([3, 4]);
    expect(normalized[0]).toBeCloseTo(0.6, 6);
    expect(normalized[1]).toBeCloseTo(0.8, 6);
    expect(l2Norm(normalized)).toBeCloseTo(1, 6);
  });

  it('computes cosine similarity and rejects invalid vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    expect(() => normalizeEmbedding([0, 0])).toThrow();
    expect(() => normalizeEmbedding([1, Number.NaN])).toThrow();
    expect(() => cosineSimilarity([1], [1, 2])).toThrow();
  });
});

describe('AI network allowlist', () => {
  const origin = 'https://meowfolio.example';

  it('allows same-origin assets and exact pinned model revisions', () => {
    expect(classifyAiNetworkRequest('/assets/app.js', origin)).toBe('same-origin');
    const pinned =
      'https://huggingface.co/' +
      MODEL_MANIFEST.detector.id +
      '/resolve/' +
      MODEL_MANIFEST.detector.revision +
      '/config.json';
    expect(classifyAiNetworkRequest(pinned, origin)).toBe('model');
  });


  it('rewrites only recognized floating model assets to exact manifest revisions', () => {
    const floating =
      'https://huggingface.co/' + MODEL_MANIFEST.detector.id + '/resolve/main/config.json';
    const pinned = pinModelAssetUrl(floating, origin);

    expect(pinned?.pathname).toBe(
      '/' +
        MODEL_MANIFEST.detector.id +
        '/resolve/' +
        MODEL_MANIFEST.detector.revision +
        '/config.json',
    );
    expect(classifyAiNetworkRequest(floating, origin)).toBe('blocked');
    expect(pinModelAssetUrl('https://huggingface.co/someone/other/resolve/main/config.json', origin)).toBeNull();
  });

  it('never authorizes off-origin model or runtime downloads over plain HTTP', () => {
    const model = 'http://huggingface.co/' + MODEL_MANIFEST.detector.id +
      '/resolve/' + MODEL_MANIFEST.detector.revision + '/config.json';
    expect(classifyAiNetworkRequest(model, origin)).toBe('blocked');
    expect(pinModelAssetUrl(model, origin)).toBeNull();
    expect(classifyAiNetworkRequest('http://cdn.jsdelivr.net/npm/onnxruntime-web', origin))
      .toBe('blocked');
    expect(classifyAiNetworkRequest('https://cdn.jsdelivr.net/npm/onnxruntime-web', origin))
      .toBe('runtime');
  });

  it('blocks floating or unrelated model URLs', () => {
    const floating =
      'https://huggingface.co/' + MODEL_MANIFEST.detector.id + '/resolve/main/config.json';
    expect(classifyAiNetworkRequest(floating, origin)).toBe('blocked');
    expect(classifyAiNetworkRequest('https://example.com/model.onnx', origin)).toBe('blocked');
  });
});

describe('generation invalidation', () => {
  it('marks old generations stale after a new scan begins', () => {
    const guard = new GenerationGuard();
    const first = guard.next();
    const second = guard.next();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });
});
