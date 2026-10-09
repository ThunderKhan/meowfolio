/**
 * Tracks only requests that are queued or executing in this worker.
 *
 * Cancellation messages can race with expensive WASM work, so a cancellation
 * marker must survive until its request leaves the queue. However, recording
 * arbitrary completed IDs forever leaks memory during long-lived sessions.
 */
export class WorkerRequestTracker {
  private readonly queued = new Set<string>();
  private readonly cancelled = new Set<string>();
  private active: string | null = null;

  enqueue(id: string): void {
    this.queued.add(id);
  }

  start(id: string): void {
    this.queued.delete(id);
    this.active = id;
  }

  cancel(id: string): boolean {
    if (this.active !== id && !this.queued.has(id)) return false;
    this.cancelled.add(id);
    return true;
  }

  isCancelled(id: string): boolean {
    return this.cancelled.has(id);
  }

  finish(id: string): void {
    this.queued.delete(id);
    this.cancelled.delete(id);
    if (this.active === id) this.active = null;
  }

  clear(): void {
    this.queued.clear();
    this.cancelled.clear();
    this.active = null;
  }
}
