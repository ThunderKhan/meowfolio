import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiClient } from './client';
import type { WorkerRequest, WorkerResponse } from './shared';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  sent: WorkerRequest[] = [];
  terminated = false;
  throwOnSend = false;

  constructor() { FakeWorker.instances.push(this); }

  postMessage(request: WorkerRequest) {
    if (this.throwOnSend) throw new Error('postMessage failed');
    this.sent.push(request);
  }

  terminate() { this.terminated = true; }

  respond(message: WorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>);
  }

  crash() {
    this.onerror?.({ message: 'worker crashed' } as ErrorEvent);
  }

  unreadableMessage() {
    this.onmessageerror?.({} as MessageEvent);
  }
}

describe('AiClient worker lifecycle', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('settles a normal worker response', async () => {
    const client = new AiClient();
    const pending = client.checkAssets('wasm', 'first');
    const worker = FakeWorker.instances[0];
    expect(worker.sent[0]).toEqual({ type: 'CHECK_ASSETS', requestId: 'first', provider: 'wasm' });
    worker.respond({ type: 'ASSET_STATUS', requestId: 'first', provider: 'wasm', ready: true });
    await expect(pending).resolves.toMatchObject({ type: 'ASSET_STATUS', ready: true });
    client.dispose();
  });

  it('rejects pending calls and creates a clean worker on the next request after a crash', async () => {
    const client = new AiClient();
    const first = client.detect(new Blob(['cat']), 0.25, 'detect-1');
    const second = client.embed(new Blob(['cat']), 'embed-1');
    const crashed = FakeWorker.instances[0];
    crashed.crash();
    await expect(first).rejects.toThrow('worker crashed');
    await expect(second).rejects.toThrow('worker crashed');
    expect(crashed.terminated).toBe(true);
    const retried = client.checkAssets('wasm', 'probe-2');
    expect(FakeWorker.instances).toHaveLength(2);
    const replacement = FakeWorker.instances[1];
    expect(replacement.sent[0].type).toBe('CHECK_ASSETS');
    // A stale message from the crashed worker must not settle new requests.
    crashed.respond({ type: 'ASSET_STATUS', requestId: 'probe-2', provider: 'wasm', ready: true });
    replacement.respond({ type: 'ASSET_STATUS', requestId: 'probe-2', provider: 'wasm', ready: false });
    await expect(retried).resolves.toMatchObject({ ready: false });
    client.dispose();
  });

  it('recovers when postMessage fails or a worker sends malformed data', async () => {
    const client = new AiClient();
    FakeWorker.instances[0].throwOnSend = true;
    await expect(client.checkAssets('wasm', 'failed-send')).rejects.toThrow('postMessage failed');
    const retry = client.checkAssets('wasm', 'second');
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].unreadableMessage();
    await expect(retry).rejects.toThrow('unreadable message');
    const finalAttempt = client.checkAssets('wasm', 'third');
    expect(FakeWorker.instances).toHaveLength(3);
    FakeWorker.instances[2].respond({
      type: 'ASSET_STATUS', requestId: 'third', provider: 'wasm', ready: true,
    });
    await expect(finalAttempt).resolves.toMatchObject({ ready: true });
    client.dispose();
  });

  it('rejects duplicate in-flight request IDs without overwriting the original', async () => {
    const client = new AiClient();
    const first = client.checkAssets('wasm', 'same-id');
    await expect(client.checkAssets('wasm', 'same-id')).rejects.toThrow('Duplicate AI request ID');
    FakeWorker.instances[0].respond({
      type: 'ASSET_STATUS', requestId: 'same-id', provider: 'wasm', ready: true,
    });
    await expect(first).resolves.toMatchObject({ ready: true });
    client.dispose();
  });

  it('rejects and prevents all new requests after disposal', async () => {
    const client = new AiClient();
    const pending = client.checkAssets('wasm', 'before-dispose');
    client.dispose();
    client.dispose();
    await expect(pending).rejects.toThrow('AI client disposed');
    expect(FakeWorker.instances[0].terminated).toBe(true);
    await expect(client.checkAssets('wasm', 'after-dispose')).rejects.toThrow('disposed');
    expect(FakeWorker.instances).toHaveLength(1);
  });
});
