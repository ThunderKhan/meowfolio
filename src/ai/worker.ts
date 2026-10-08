/// <reference lib="webworker" />

import { env, ModelRegistry, pipeline, RawImage } from '@huggingface/transformers';
import { normalizeEmbedding } from '../domain/embeddings';
import {
  chooseProvider,
  classifyAiNetworkRequest,
  EMBEDDING_DIMENSION,
  isNetworkConsentError,
  MODEL_MANIFEST,
  NetworkConsentError,
  pinModelAssetUrl,
  type Detection,
  type ExecutionProvider,
  type WorkerRequest,
  type WorkerResponse,
} from './shared';

type CallablePipeline = ((input: unknown, options?: Record<string, unknown>) => Promise<any>) & {
  dispose?: () => Promise<void> | void;
};

const scope = self as DedicatedWorkerGlobalScope;
const nativeFetch = globalThis.fetch.bind(globalThis);

let networkPermitRequestId: string | null = null;
let activeRequestId = 'worker-startup';
let loadedProvider: ExecutionProvider | null = null;
let detector: CallablePipeline | null = null;
let embedder: CallablePipeline | null = null;
const cancelled = new Set<string>();
const blockedNetworkRequests = new Set<string>();
let queue = Promise.resolve();

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.useWasmCache = true;
env.cacheKey = 'meowfolio-ai-' + MODEL_MANIFEST.version;

// A stable, origin-scoped fallback cache is necessary because a fresh worker
// cannot rely on ModelRegistry's advisory cache probe or its WASM metadata.
// Never fetch remote files here: downloads still require explicit consent.
const ASSET_CACHE = 'meowfolio-pinned-assets-' + MODEL_MANIFEST.version;
async function openAssetCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(ASSET_CACHE);
  } catch {
    // Private browsing / storage quota may disable Cache Storage entirely.
    return null;
  }
}

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function currentOrigin(): string {
  return scope.location?.origin ?? 'https://meowfolio.invalid';
}

env.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const requestedUrl =
    input instanceof URL
      ? input
      : typeof input === 'string'
        ? new URL(input, currentOrigin())
        : new URL(input.url, currentOrigin());

  // Transformers.js 4.3.0 can internally request `resolve/main` even when
  // pipeline() receives an exact revision. Never allow that floating request
  // onto the network: rewrite only recognized model URLs to our manifest SHA.
  const pinnedModelUrl = pinModelAssetUrl(input, currentOrigin());
  const effectiveUrl = pinnedModelUrl ?? requestedUrl;
  const category = pinnedModelUrl
    ? 'model'
    : classifyAiNetworkRequest(input, currentOrigin());
  const remote = category !== 'same-origin';
  const cacheable = category === 'model' || category === 'runtime';
  const cache = cacheable ? await openAssetCache() : null;
  const cacheKey = effectiveUrl.toString();
  // An existing cached response needs no further network consent. This works
  // across page reloads and worker restarts, not just subsequent scans.
  const cached = await cache?.match(cacheKey).catch(() => undefined);
  if (cached) {
    post({
      type: 'NETWORK_ACTIVITY', requestId: activeRequestId,
      url: cacheKey, category, allowed: true,
    });
    return cached;
  }

  const allowed =
    !remote ||
    (networkPermitRequestId === activeRequestId && cacheable);

  post({
    type: 'NETWORK_ACTIVITY',
    requestId: activeRequestId,
    url: cacheKey,
    category,
    allowed,
  });

  if (!allowed) {
    blockedNetworkRequests.add(activeRequestId);
    throw new NetworkConsentError(requestedUrl.toString());
  }

  const effectiveInput: RequestInfo | URL =
    pinnedModelUrl === null
      ? input
      : input instanceof Request
        ? new Request(pinnedModelUrl, input)
        : pinnedModelUrl;

  const response = await nativeFetch(effectiveInput, init);
  if (cache && response.ok) {
    try {
      // Complete the cache write before declaring model initialization ready.
      // Cache failures never corrupt a successful inference/download.
      await cache.put(cacheKey, response.clone());
    } catch {
      // Quota, unsupported responses, or an evicted cache remain recoverable.
    }
  }
  return response;
};

function hasWebGpu(): boolean {
  return Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
}

function assertNotCancelled(requestId: string): void {
  if (cancelled.has(requestId)) throw new Error('MEOWFOLIO_CANCELLED');
}

async function disposePipeline(value: CallablePipeline | null): Promise<void> {
  if (value?.dispose) await value.dispose();
}

async function disposeModels(): Promise<void> {
  await Promise.all([disposePipeline(detector), disposePipeline(embedder)]);
  detector = null;
  embedder = null;
  loadedProvider = null;
}

async function withPinnedRevision<T>(
  revision: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previousTemplate = env.remotePathTemplate;
  env.remotePathTemplate = `{model}/resolve/${revision}/`;
  try {
    return await operation();
  } finally {
    env.remotePathTemplate = previousTemplate;
  }
}

async function loadModels(
  requestId: string,
  provider: ExecutionProvider,
  allowDownload: boolean,
): Promise<number> {
  if (detector && embedder && loadedProvider === provider) return 0;
  if (loadedProvider && loadedProvider !== provider) await disposeModels();

  const started = performance.now();
  activeRequestId = requestId;
  networkPermitRequestId = allowDownload ? requestId : null;

  let nextDetector: CallablePipeline | null = null;
  let nextEmbedder: CallablePipeline | null = null;

  try {
    assertNotCancelled(requestId);
    post({
      type: 'MODEL_PROGRESS',
      requestId,
      model: 'detector',
      status: 'initializing',
    });

    nextDetector = (await withPinnedRevision(
      MODEL_MANIFEST.detector.revision,
      async () =>
        pipeline(
          MODEL_MANIFEST.detector.task,
          MODEL_MANIFEST.detector.id,
          {
            revision: MODEL_MANIFEST.detector.revision,
            device: provider,
            dtype: MODEL_MANIFEST.detector.dtype[provider],
          } as any,
        ),
    )) as unknown as CallablePipeline;

    assertNotCancelled(requestId);
    post({
      type: 'MODEL_PROGRESS',
      requestId,
      model: 'embedder',
      status: 'initializing',
    });

    nextEmbedder = (await withPinnedRevision(
      MODEL_MANIFEST.embedder.revision,
      async () =>
        pipeline(
          MODEL_MANIFEST.embedder.task,
          MODEL_MANIFEST.embedder.id,
          {
            revision: MODEL_MANIFEST.embedder.revision,
            device: provider,
            dtype: MODEL_MANIFEST.embedder.dtype[provider],
          } as any,
        ),
    )) as unknown as CallablePipeline;

    assertNotCancelled(requestId);
    detector = nextDetector;
    embedder = nextEmbedder;
    loadedProvider = provider;
    nextDetector = null;
    nextEmbedder = null;

    return performance.now() - started;
  } catch (error) {
    await Promise.all([disposePipeline(nextDetector), disposePipeline(nextEmbedder)]);
    throw error;
  } finally {
    if (networkPermitRequestId === requestId) networkPermitRequestId = null;
  }
}

function errorFor(
  error: unknown,
  requestId: string,
  fallbackCode: Extract<WorkerResponse, { type: 'ERROR' }>['code'],
  fallbackMessage: string,
): Extract<WorkerResponse, { type: 'ERROR' }> {
  if (error instanceof Error && error.message === 'MEOWFOLIO_CANCELLED') {
    return { type: 'ERROR', requestId, code: 'CANCELLED', message: 'This request was cancelled.' };
  }
  if (isNetworkConsentError(error)) {
    return {
      type: 'ERROR',
      requestId,
      code: 'CONSENT_REQUIRED',
      message: 'Required AI files are not available in the browser cache.',
    };
  }
  return {
    type: 'ERROR',
    requestId,
    code: fallbackCode,
    message: error instanceof Error ? error.message : fallbackMessage,
  };
}

async function handle(request: WorkerRequest): Promise<void> {
  activeRequestId = request.requestId;

  if (request.type === 'CANCEL_REQUEST') {
    cancelled.add(request.requestId);
    if (networkPermitRequestId === request.requestId) networkPermitRequestId = null;
    return;
  }

  if (request.type === 'DISPOSE') {
    await disposeModels();
    cancelled.clear();
    blockedNetworkRequests.clear();
    return;
  }

  if (cancelled.has(request.requestId)) return;

  if (request.type === 'CHECK_ASSETS') {
    blockedNetworkRequests.delete(request.requestId);
    const provider = chooseProvider(request.provider, hasWebGpu());

    // A worker reused between encounters already has its pipelines in memory.
    // A Cache Storage probe can under-report readiness (e.g. missing WASM
    // metadata) even when an initialized in-memory pipeline is usable.
    if (detector && embedder && loadedProvider === provider) {
      post({ type: 'ASSET_STATUS', requestId: request.requestId, ready: true, provider });
      return;
    }

    try {
      const detectorCached = await withPinnedRevision(
        MODEL_MANIFEST.detector.revision,
        async () =>
          ModelRegistry.is_pipeline_cached(
            MODEL_MANIFEST.detector.task,
            MODEL_MANIFEST.detector.id,
            {
              revision: MODEL_MANIFEST.detector.revision,
              device: provider,
              dtype: MODEL_MANIFEST.detector.dtype[provider],
            },
          ),
      );

      const embedderCached = await withPinnedRevision(
        MODEL_MANIFEST.embedder.revision,
        async () =>
          ModelRegistry.is_pipeline_cached(
            MODEL_MANIFEST.embedder.task,
            MODEL_MANIFEST.embedder.id,
            {
              revision: MODEL_MANIFEST.embedder.revision,
              device: provider,
              dtype: MODEL_MANIFEST.embedder.dtype[provider],
            },
          ),
      );

      // Cache probes are advisory: browser ONNX/WASM assets and pinned model
      // files can have different cache providers. Attempt a local-only load
      // even when the probe says "missing". env.fetch blocks remote requests
      // until this user's explicit download consent, so this never silently
      // fetches model files over the network.
      void detectorCached;
      void embedderCached;
      await loadModels(request.requestId, provider, false);
      blockedNetworkRequests.delete(request.requestId);
      post({ type: 'ASSET_STATUS', requestId: request.requestId, ready: true, provider });
    } catch (error) {
      if (blockedNetworkRequests.delete(request.requestId) || isNetworkConsentError(error)) {
        post({
          type: 'ASSET_STATUS',
          requestId: request.requestId,
          ready: false,
          provider,
          reason: 'Required AI files are not fully cached.',
        });
        return;
      }
      post(
        errorFor(
          error,
          request.requestId,
          'INITIALIZATION_FAILED',
          'Could not check cached AI files.',
        ),
      );
    }
    return;
  }

  if (request.type === 'LOAD_MODELS') {
    const provider = chooseProvider(request.provider, hasWebGpu());
    try {
      const elapsedMs = await loadModels(request.requestId, provider, request.allowDownload);
      post({ type: 'MODELS_READY', requestId: request.requestId, provider, elapsedMs });
    } catch (error) {
      post(errorFor(error, request.requestId, 'INITIALIZATION_FAILED', 'Could not initialize local AI.'));
    }
    return;
  }

  if (!detector || !embedder || !loadedProvider) {
    post({
      type: 'ERROR',
      requestId: request.requestId,
      code: 'INITIALIZATION_FAILED',
      message: 'Models are not initialized.',
    });
    return;
  }

  if (request.type === 'DETECT_IMAGE') {
    const started = performance.now();
    try {
      assertNotCancelled(request.requestId);
      post({ type: 'PROCESSING_STAGE', requestId: request.requestId, stage: 'decoding' });
      const image = await RawImage.read(request.image);
      assertNotCancelled(request.requestId);
      post({ type: 'PROCESSING_STAGE', requestId: request.requestId, stage: 'detecting' });

      const output = (await detector(image, {
        threshold: request.threshold,
        percentage: false,
      })) as Array<{
        label: string;
        score: number;
        box: { xmin: number; ymin: number; xmax: number; ymax: number };
      }>;

      const cats: Detection[] = output
        .filter((item) => item.label.toLowerCase() === 'cat')
        .map((item, index) => ({
          id: request.requestId + '-cat-' + index,
          label: item.label,
          score: item.score,
          box: {
            xmin: Math.max(0, Math.min(image.width, item.box.xmin)),
            ymin: Math.max(0, Math.min(image.height, item.box.ymin)),
            xmax: Math.max(0, Math.min(image.width, item.box.xmax)),
            ymax: Math.max(0, Math.min(image.height, item.box.ymax)),
          },
        }))
        .filter((item) => item.box.xmax > item.box.xmin && item.box.ymax > item.box.ymin)
        .sort((a, b) => b.score - a.score);

      assertNotCancelled(request.requestId);
      post({
        type: 'DETECTIONS',
        requestId: request.requestId,
        detections: cats,
        width: image.width,
        height: image.height,
        elapsedMs: performance.now() - started,
      });
    } catch (error) {
      post(errorFor(error, request.requestId, 'DETECTION_FAILED', 'Cat detection failed.'));
    }
    return;
  }

  if (request.type === 'EMBED_CROP') {
    const started = performance.now();
    try {
      assertNotCancelled(request.requestId);
      post({ type: 'PROCESSING_STAGE', requestId: request.requestId, stage: 'embedding' });
      const image = await RawImage.read(request.image);
      const features = await embedder(image);
      const dims = Array.from(features.dims as ArrayLike<number>, Number);
      const hiddenSize = dims.at(-1);

      if (hiddenSize !== EMBEDDING_DIMENSION || dims.length < 2) {
        throw new Error(
          'Expected DINOv2 hidden states ending in ' +
            EMBEDDING_DIMENSION +
            ' values, received dims [' +
            dims.join(', ') +
            '].',
        );
      }

      // DINOv2's first sequence token is the CLS token. The tensor is laid out
      // row-major as [batch, sequence, hidden], so the first hiddenSize values
      // are the CLS representation for the first image.
      const cls = Array.from(features.data as ArrayLike<number>, Number).slice(
        0,
        EMBEDDING_DIMENSION,
      );

      if (cls.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          'Expected ' + EMBEDDING_DIMENSION + ' CLS-token values, received ' + cls.length + '.',
        );
      }

      const normalized = normalizeEmbedding(cls);
      assertNotCancelled(request.requestId);

      post({
        type: 'EMBEDDING_RESULT',
        requestId: request.requestId,
        embedding: Array.from(normalized),
        dimension: normalized.length,
        elapsedMs: performance.now() - started,
        provider: loadedProvider,
        space: {
          modelId: MODEL_MANIFEST.embedder.id,
          revision: MODEL_MANIFEST.embedder.revision,
          dtype: MODEL_MANIFEST.embedder.dtype[loadedProvider],
          preprocessingVersion: 1,
          dimension: EMBEDDING_DIMENSION,
          pooling: 'cls-token',
        },
      });
    } catch (error) {
      const code =
        error instanceof Error && error.message.startsWith('Expected ')
          ? 'INVALID_EMBEDDING'
          : 'EMBEDDING_FAILED';
      post(errorFor(error, request.requestId, code, 'Embedding failed.'));
    }
  }
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'CANCEL_REQUEST') {
    cancelled.add(request.requestId);
    if (networkPermitRequestId === request.requestId) networkPermitRequestId = null;
    return;
  }

  queue = queue
    .then(() => handle(request))
    .catch((error) => {
      post({
        type: 'ERROR',
        requestId: request.requestId,
        code: 'INITIALIZATION_FAILED',
        message: error instanceof Error ? error.message : 'Unexpected worker error.',
      });
    });
};
