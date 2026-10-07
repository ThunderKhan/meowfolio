import type { ExecutionProvider, WorkerRequest, WorkerResponse } from './shared';

export type AiProgressListener = (message: WorkerResponse) => void;

export interface AiGateway {
  checkAssets(
    provider: 'auto' | ExecutionProvider,
    requestId?: string,
  ): Promise<Extract<WorkerResponse, { type: 'ASSET_STATUS' }>>;
  loadModels(
    provider: 'auto' | ExecutionProvider,
    allowDownload: boolean,
    requestId?: string,
  ): Promise<Extract<WorkerResponse, { type: 'MODELS_READY' }>>;
  detect(
    image: Blob,
    threshold?: number,
    requestId?: string,
  ): Promise<Extract<WorkerResponse, { type: 'DETECTIONS' }>>;
  embed(
    image: Blob,
    requestId?: string,
  ): Promise<Extract<WorkerResponse, { type: 'EMBEDDING_RESULT' }>>;
  cancel(requestId: string): void;
  dispose(): void;
}

interface PendingRequest {
  finalTypes: Set<WorkerResponse['type']>;
  resolve: (message: WorkerResponse) => void;
  reject: (error: Error) => void;
}

export class AiClient implements AiGateway {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly onProgress?: AiProgressListener;

  constructor(onProgress?: AiProgressListener) {
    this.onProgress = onProgress;
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
      name: 'meowfolio-ai',
    });

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const pending = this.pending.get(message.requestId);

      if (message.type === 'ERROR') {
        if (pending) {
          this.pending.delete(message.requestId);
          pending.reject(new Error(message.code + ': ' + message.message));
        }
        this.onProgress?.(message);
        return;
      }

      if (pending?.finalTypes.has(message.type)) {
        this.pending.delete(message.requestId);
        pending.resolve(message);
        return;
      }

      this.onProgress?.(message);
    };

    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'AI worker crashed.');
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    };
  }

  private request(
    request: WorkerRequest,
    finalTypes: WorkerResponse['type'][],
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      this.pending.set(request.requestId, {
        finalTypes: new Set(finalTypes),
        resolve,
        reject,
      });
      this.worker.postMessage(request);
    });
  }

  async checkAssets(
    provider: 'auto' | ExecutionProvider,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'ASSET_STATUS' }>> {
    return (await this.request(
      { type: 'CHECK_ASSETS', requestId, provider },
      ['ASSET_STATUS'],
    )) as Extract<WorkerResponse, { type: 'ASSET_STATUS' }>;
  }

  async loadModels(
    provider: 'auto' | ExecutionProvider,
    allowDownload: boolean,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'MODELS_READY' }>> {
    return (await this.request(
      { type: 'LOAD_MODELS', requestId, provider, allowDownload },
      ['MODELS_READY'],
    )) as Extract<WorkerResponse, { type: 'MODELS_READY' }>;
  }

  async detect(
    image: Blob,
    threshold = 0.25,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'DETECTIONS' }>> {
    return (await this.request(
      { type: 'DETECT_IMAGE', requestId, image, threshold },
      ['DETECTIONS'],
    )) as Extract<WorkerResponse, { type: 'DETECTIONS' }>;
  }

  async embed(
    image: Blob,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'EMBEDDING_RESULT' }>> {
    return (await this.request(
      { type: 'EMBED_CROP', requestId, image },
      ['EMBEDDING_RESULT'],
    )) as Extract<WorkerResponse, { type: 'EMBEDDING_RESULT' }>;
  }

  cancel(requestId: string): void {
    const pending = this.pending.get(requestId);
    if (pending) {
      this.pending.delete(requestId);
      pending.reject(new Error('CANCELLED: This request was cancelled.'));
    }
    this.worker.postMessage({ type: 'CANCEL_REQUEST', requestId } satisfies WorkerRequest);
  }

  dispose(): void {
    const requestId = crypto.randomUUID();
    this.worker.postMessage({ type: 'DISPOSE', requestId } satisfies WorkerRequest);
    this.worker.terminate();
    for (const pending of this.pending.values()) pending.reject(new Error('AI client disposed.'));
    this.pending.clear();
  }
}
