/// <reference lib="webworker" />

import { env, pipeline, RawImage } from '@huggingface/transformers';
import { normalizeEmbedding } from '../domain/embeddings';
import {
  chooseProvider,
  classifyAiNetworkRequest,
  EMBEDDING_DIMENSION,
  isNetworkConsentError,
  MODEL_MANIFEST,
  NetworkConsentError,
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
let queue = Promise.resolve();

env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function currentOrigin(): string {
  return scope.location?.origin ?? 'https://meowfolio.invalid';
}

env.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    input instanceof URL
      ? input
      : typeof input === 'string'
        ? new URL(input, currentOrigin())
        : new URL(input.url, currentOrigin());

  const category = classifyAiNetworkRequest(input, currentOrigin());
  const remote = category !== 'same-origin';
  const allowed =
    !remote ||
    (networkPermitRequestId === activeRequestId &&
      (category === 'model' || category === 'runtime'));

  if (category !== 'blocked') {
    post({
      type: 'NETWORK_ACTIVITY',
      requestId: activeRequestId,
      url: url.toString(),
      category,
      allowed,
    });
  }

  if (!allowed) {
    throw new NetworkConsentError(url.toString());
  }

  return nativeFetch(input as RequestInfo, init);
};

function hasWebGpu(): boolean {
  return Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
}

function assertNotCancelled(requestId: string): void {
  if (cancelled.has(requestId)) throw new Error('MEOWFOLIO_CANCELLED');
}

function toProgress(
  requestId: string,
  model: 'detector' | 'embedder',
  event: unknown,
): void {
  if (!event || typeof event !== 'object') return;
  const value = event as Record<string, unknown>;
  post({
    type: 'MODEL_PROGRESS',
    requestId,
    model,
    status: typeof value.status === 'string' ? value.status : 'loading',
    file: typeof value.file === 'string' ? value.file : undefined,
    loaded: typeof value.loaded === 'number' ? value.loaded : undefined,
    total: typeof value.total === 'number' ? value.total : undefined,
    progress: typeof value.progress === 'number' ? value.progress : undefined,
  });
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

    nextDetector = (await pipeline(
      MODEL_MANIFEST.detector.task,
      MODEL_MANIFEST.detector.id,
      {
        revision: MODEL_MANIFEST.detector.revision,
        device: provider,
        dtype: MODEL_MANIFEST.detector.dtype[provider],
        progress_callback: (event: unknown) => toProgress(requestId, 'detector', event),
      } as any,
    )) as unknown as CallablePipeline;

    assertNotCancelled(requestId);

    nextEmbedder = (await pipeline(
      MODEL_MANIFEST.embedder.task,
      MODEL_MANIFEST.embedder.id,
      {
        revision: MODEL_MANIFEST.embedder.revision,
        device: provider,
        dtype: MODEL_MANIFEST.embedder.dtype[provider],
        progress_callback: (event: unknown) => toProgress(requestId, 'embedder', event),
      } as any,
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
    return;
  }

  if (cancelled.has(request.requestId)) return;

  if (request.type === 'CHECK_ASSETS') {
    const provider = chooseProvider(request.provider, hasWebGpu());
    try {
      await loadModels(request.requestId, provider, false);
      post({ type: 'ASSET_STATUS', requestId: request.requestId, ready: true, provider });
    } catch (error) {
      if (isNetworkConsentError(error)) {
        post({
          type: 'ASSET_STATUS',
          requestId: request.requestId,
          ready: false,
          provider,
          reason: 'Required AI files are not fully cached.',
        });
        return;
      }
      post(errorFor(error, request.requestId, 'INITIALIZATION_FAILED', 'Could not check cached AI files.'));
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
      const features = await embedder(image, { pool: true });
      const raw = Array.from(features.data as ArrayLike<number>, Number);

      if (raw.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          'Expected ' + EMBEDDING_DIMENSION + ' pooled DINOv2 values, received ' + raw.length + '.',
        );
      }

      const normalized = normalizeEmbedding(raw);
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
          pooling: 'pool',
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
