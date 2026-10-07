import type { AiGateway } from './client';
import { MODEL_MANIFEST, type ExecutionProvider, type WorkerResponse } from './shared';

export type MockScenario = 'single' | 'multi' | 'none';

const embedding = Array.from({ length: 384 }, (_, index) => (index === 0 ? 1 : 0));

export class MockAiClient implements AiGateway {
  constructor(private readonly scenario: MockScenario = 'single') {}

  async checkAssets(
    provider: 'auto' | ExecutionProvider,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'ASSET_STATUS' }>> {
    return {
      type: 'ASSET_STATUS',
      requestId,
      ready: true,
      provider: provider === 'webgpu' ? 'webgpu' : 'wasm',
    };
  }

  async loadModels(
    provider: 'auto' | ExecutionProvider,
    _allowDownload: boolean,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'MODELS_READY' }>> {
    return {
      type: 'MODELS_READY',
      requestId,
      provider: provider === 'webgpu' ? 'webgpu' : 'wasm',
      elapsedMs: 1,
    };
  }

  async detect(
    _image: Blob,
    _threshold = 0.25,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'DETECTIONS' }>> {
    const detections =
      this.scenario === 'none'
        ? []
        : this.scenario === 'multi'
          ? [
              {
                id: requestId + '-cat-1',
                label: 'cat',
                score: 0.96,
                box: { xmin: 20, ymin: 20, xmax: 220, ymax: 260 },
              },
              {
                id: requestId + '-cat-2',
                label: 'cat',
                score: 0.91,
                box: { xmin: 250, ymin: 40, xmax: 470, ymax: 280 },
              },
            ]
          : [
              {
                id: requestId + '-cat-1',
                label: 'cat',
                score: 0.96,
                box: { xmin: 20, ymin: 20, xmax: 220, ymax: 260 },
              },
            ];

    return {
      type: 'DETECTIONS',
      requestId,
      detections,
      width: 500,
      height: 320,
      elapsedMs: 5,
    };
  }

  async embed(
    _image: Blob,
    requestId = crypto.randomUUID(),
  ): Promise<Extract<WorkerResponse, { type: 'EMBEDDING_RESULT' }>> {
    return {
      type: 'EMBEDDING_RESULT',
      requestId,
      embedding,
      dimension: 384,
      elapsedMs: 5,
      provider: 'wasm',
      space: {
        modelId: MODEL_MANIFEST.embedder.id,
        revision: MODEL_MANIFEST.embedder.revision,
        dtype: MODEL_MANIFEST.embedder.dtype.wasm,
        preprocessingVersion: 1,
        dimension: 384,
        pooling: 'cls-token',
      },
    };
  }

  cancel(_requestId: string): void {}

  dispose(): void {}
}
