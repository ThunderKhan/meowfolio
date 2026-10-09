import { describe, expect, it } from 'vitest';
import { WorkerRequestTracker } from './workerRequestTracker';

describe('queued and active worker request cancellation', () => {
  it('honors cancellation while queued, then frees the marker on completion', () => {
    const tracker = new WorkerRequestTracker();
    tracker.enqueue('queued-id');
    expect(tracker.cancel('queued-id')).toBe(true);
    tracker.start('queued-id');
    expect(tracker.isCancelled('queued-id')).toBe(true);
    tracker.finish('queued-id');
    expect(tracker.isCancelled('queued-id')).toBe(false);
    expect(tracker.cancel('queued-id')).toBe(false);
  });

  it('honors cancellation during execution and never retains completed IDs', () => {
    const tracker = new WorkerRequestTracker();
    for (let i = 0; i < 500; i++) {
      const id = String(i);
      tracker.enqueue(id);
      tracker.start(id);
      expect(tracker.cancel(id)).toBe(true);
      tracker.finish(id);
      expect(tracker.isCancelled(id)).toBe(false);
      expect(tracker.cancel(id)).toBe(false);
    }
  });

  it('does not cancel unrelated work, including after an unknown stale ID', () => {
    const tracker = new WorkerRequestTracker();
    tracker.enqueue('a');
    tracker.enqueue('b');
    expect(tracker.cancel('stale')).toBe(false);
    tracker.start('a');
    expect(tracker.cancel('a')).toBe(true);
    tracker.finish('a');
    tracker.start('b');
    expect(tracker.isCancelled('b')).toBe(false);
    tracker.finish('b');
  });

  it('clears all outstanding markers on worker disposal', () => {
    const tracker = new WorkerRequestTracker();
    tracker.enqueue('next');
    tracker.cancel('next');
    tracker.clear();
    expect(tracker.isCancelled('next')).toBe(false);
    expect(tracker.cancel('next')).toBe(false);
  });
});
