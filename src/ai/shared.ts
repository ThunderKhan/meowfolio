export type ExecutionProvider = 'webgpu' | 'wasm';

export interface ModelSpec {
  id: string;
  revision: string;
  task: 'object-detection' | 'image-feature-extraction';
  dtype: Record<ExecutionProvider, string>;
  releaseNote: string;
}

export const MODEL_MANIFEST = {
  version: '2026-10-07-spike-3',
  detector: {
    id: 'onnx-community/yolov10n',
    revision: '99eec2d6d2becae0f038019f75054029ad5a9004',
    task: 'object-detection',
    dtype: { webgpu: 'fp16', wasm: 'int8' },
    releaseNote:
      'Spike candidate only. Hugging Face marks this repository AGPL-3.0; release use remains blocked until licensing is resolved.',
  },
  embedder: {
    id: 'Xenova/dinov2-small',
    revision: 'c2bb04a51fab207c420665f1946016107bffc701',
    task: 'image-feature-extraction',
    dtype: { webgpu: 'fp16', wasm: 'uint8' },
    releaseNote:
      'DINOv2-small candidate. Quantized variants must be evaluated rather than assumed equivalent.',
  },
} as const satisfies {
  version: string;
  detector: ModelSpec;
  embedder: ModelSpec;
};

export const EMBEDDING_DIMENSION = 384;

export interface Detection {
  id: string;
  label: string;
  score: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

export type WorkerRequest =
  | { type: 'CHECK_ASSETS'; requestId: string; provider: 'auto' | ExecutionProvider }
  | {
      type: 'LOAD_MODELS';
      requestId: string;
      provider: 'auto' | ExecutionProvider;
      allowDownload: boolean;
    }
  | { type: 'DETECT_IMAGE'; requestId: string; image: Blob; threshold: number }
  | { type: 'EMBED_CROP'; requestId: string; image: Blob }
  | { type: 'CANCEL_REQUEST'; requestId: string }
  | { type: 'DISPOSE'; requestId: string };

export type WorkerResponse =
  | {
      type: 'ASSET_STATUS';
      requestId: string;
      ready: boolean;
      provider: ExecutionProvider;
      reason?: string;
    }
  | {
      type: 'MODEL_PROGRESS';
      requestId: string;
      model: 'detector' | 'embedder';
      status: string;
      file?: string;
      loaded?: number;
      total?: number;
      progress?: number;
    }
  | {
      type: 'NETWORK_ACTIVITY';
      requestId: string;
      url: string;
      category: 'same-origin' | 'model' | 'runtime' | 'blocked';
      allowed: boolean;
    }
  | {
      type: 'MODELS_READY';
      requestId: string;
      provider: ExecutionProvider;
      elapsedMs: number;
    }
  | {
      type: 'PROCESSING_STAGE';
      requestId: string;
      stage: 'decoding' | 'detecting' | 'embedding';
    }
  | {
      type: 'DETECTIONS';
      requestId: string;
      detections: Detection[];
      width: number;
      height: number;
      elapsedMs: number;
    }
  | {
      type: 'EMBEDDING_RESULT';
      requestId: string;
      embedding: number[];
      dimension: number;
      elapsedMs: number;
      provider: ExecutionProvider;
      space: {
        modelId: string;
        revision: string;
        dtype: string;
        preprocessingVersion: number;
        dimension: number;
        pooling: 'pool';
      };
    }
  | {
      type: 'ERROR';
      requestId: string;
      code:
        | 'CONSENT_REQUIRED'
        | 'INITIALIZATION_FAILED'
        | 'DETECTION_FAILED'
        | 'EMBEDDING_FAILED'
        | 'INVALID_EMBEDDING'
        | 'PROVIDER_UNAVAILABLE'
        | 'CANCELLED';
      message: string;
    };

const RUNTIME_HOSTS = new Set(['cdn.jsdelivr.net', 'unpkg.com']);

function asUrl(input: RequestInfo | URL, base = 'https://meowfolio.invalid/'): URL {
  if (input instanceof URL) return input;
  if (typeof input === 'string') return new URL(input, base);
  return new URL(input.url, base);
}

export function pinModelAssetUrl(
  input: RequestInfo | URL,
  origin = 'https://meowfolio.invalid',
): URL | null {
  const url = asUrl(input, origin);
  if (url.hostname !== 'huggingface.co') return null;

  for (const model of [MODEL_MANIFEST.detector, MODEL_MANIFEST.embedder]) {
    const base = '/' + model.id + '/resolve/';
    const pinnedPrefix = base + model.revision + '/';
    if (url.pathname.startsWith(pinnedPrefix)) {
      return new URL(url);
    }

    const floatingPrefix = base + 'main/';
    if (url.pathname.startsWith(floatingPrefix)) {
      const pinned = new URL(url);
      pinned.pathname = pinnedPrefix + url.pathname.slice(floatingPrefix.length);
      return pinned;
    }
  }

  return null;
}

export function classifyAiNetworkRequest(
  input: RequestInfo | URL,
  origin = 'https://meowfolio.invalid',
): 'same-origin' | 'model' | 'runtime' | 'blocked' {
  const url = asUrl(input, origin);

  if (url.origin === origin) return 'same-origin';

  if (url.hostname === 'huggingface.co') {
    const pinned = [MODEL_MANIFEST.detector, MODEL_MANIFEST.embedder].some((model) => {
      const prefix = '/' + model.id + '/resolve/' + model.revision + '/';
      return url.pathname.startsWith(prefix);
    });
    return pinned ? 'model' : 'blocked';
  }

  if (RUNTIME_HOSTS.has(url.hostname)) return 'runtime';
  return 'blocked';
}

export class NetworkConsentError extends Error {
  constructor(url: string) {
    super('MEOWFOLIO_NETWORK_DENIED: ' + url);
    this.name = 'NetworkConsentError';
  }
}

export function isNetworkConsentError(error: unknown): boolean {
  return (
    error instanceof NetworkConsentError ||
    (error instanceof Error && error.message.includes('MEOWFOLIO_NETWORK_DENIED'))
  );
}

export function chooseProvider(
  requested: 'auto' | ExecutionProvider,
  hasWebGpu: boolean,
): ExecutionProvider {
  if (requested === 'webgpu') return 'webgpu';
  if (requested === 'wasm') return 'wasm';
  return hasWebGpu ? 'webgpu' : 'wasm';
}

export class GenerationGuard {
  private generation = 0;

  next(): number {
    this.generation += 1;
    return this.generation;
  }

  current(): number {
    return this.generation;
  }

  isCurrent(candidate: number): boolean {
    return candidate === this.generation;
  }
}
