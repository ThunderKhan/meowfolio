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
  private worker: Worker | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly onProgress?: AiProgressListener;
  private disposed = false;

  constructor(onProgress?: AiProgressListener) {
    this.onProgress = onProgress;
    this.spawnWorker();
  }

  private spawnWorker(): Worker {
    if (this.disposed) throw new Error('AI client is disposed.');
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
      name: 'meowfolio-ai',
    });
    this.worker = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      // An event from a terminated worker must not settle a newer request.
      if (this.worker !== worker || this.disposed) return;
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

    worker.onerror = (event) => {
      this.failWorker(worker, new Error(event.message || 'AI worker crashed.'));
    };
    worker.onmessageerror = () => {
      this.failWorker(worker, new Error('AI worker sent an unreadable message.'));
    };
    return worker;
  }

  /**
   * Reject all work once and discard the broken worker. The next request
   * starts a clean worker; no stale model-ready state is assumed by ScanFlow.
   */
  private failWorker(worker: Worker, error: Error): void {
    if (this.worker !== worker) return;
    this.worker = null;
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private request(
    request: WorkerRequest,
    finalTypes: WorkerResponse['type'][],
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      if (this.disposed) {
        reject(new Error('AI client is disposed.'));
        return;
      }
      if (this.pending.has(request.requestId)) {
        reject(new Error('Duplicate AI request ID: ' + request.requestId));
        return;
      }
      let worker: Worker;
      try {
        worker = this.worker ?? this.spawnWorker();
      } catch (error) {
        reject(error);
        return;
      }
      this.pending.set(request.requestId, {
        finalTypes: new Set(finalTypes),
        resolve,
        reject,
      });
      try {
        worker.postMessage(request);
      } catch (error) {
        this.failWorker(worker, error instanceof Error ? error : new Error('AI worker unavailable.'));
      }
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
    const worker = this.worker;
    if (!worker || this.disposed) return;
    try {
      worker.postMessage({ type: 'CANCEL_REQUEST', requestId } satisfies WorkerRequest);
    } catch (error) {
      this.failWorker(worker, error instanceof Error ? error : new Error('AI worker unavailable.'));
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const worker = this.worker;
    if (worker) this.failWorker(worker, new Error('AI client disposed.'));
    // A previously crashed worker has already rejected its outstanding work.
  }
}
