import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { config } from '../config';
import { logger } from '../utils/logger';

interface PendingQuery {
  resolve: (rows: unknown[]) => void;
  reject: (error: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
  /** Query this worker is executing, so a crash can reject exactly that caller. */
  queryId: number | null;
}

interface QueuedQuery {
  sql: string;
  params: readonly unknown[];
  resolve: (rows: unknown[]) => void;
  reject: (error: Error) => void;
}

const DEFAULT_WORKER_COUNT = 4;

/**
 * Pool of worker threads holding read-only SQLite connections.
 *
 * Read queries run off the main thread so a slow one cannot freeze the server.
 * Availability is best-effort: if workers cannot start, callers fall back to
 * querying in process, which is exactly today's behaviour.
 */
export class DbQueryPool {
  private static slots: WorkerSlot[] = [];
  private static queue: QueuedQuery[] = [];
  private static pending = new Map<number, PendingQuery>();
  private static nextQueryId = 1;
  private static dbPath: string | null = null;
  private static started = false;

  static isAvailable(): boolean {
    return this.slots.length > 0;
  }

  static start(dbPath: string): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.dbPath = dbPath;

    const workerPath = this.resolveWorkerPath();
    if (!workerPath) {
      logger.warn('[DbQueryPool] Worker script not found; queries will run in process');
      return;
    }

    const count = this.resolveWorkerCount();

    for (let i = 0; i < count; i += 1) {
      try {
        this.slots.push({ worker: this.spawn(workerPath, dbPath), busy: false, queryId: null });
      } catch (error: unknown) {
        logger.warn('[DbQueryPool] Failed to start worker; continuing with fewer:', error);
      }
    }

    logger.info(
      `[DbQueryPool] ${this.slots.length} query worker(s) started` +
        (this.slots.length === 0 ? ' — queries will run in process' : '')
    );
  }

  private static resolveWorkerCount(): number {
    const parsed = parseInt(process.env.DB_WORKER_COUNT ?? '', 10);
    if (isNaN(parsed)) {
      return DEFAULT_WORKER_COUNT;
    }
    return Math.max(1, Math.min(parsed, 16));
  }

  /** dist/services -> dist/workers in a build; src/services -> src/workers in development. */
  private static resolveWorkerPath(): string | null {
    const candidate = path.join(__dirname, '../workers/db-query-worker.js');
    return fs.existsSync(candidate) ? candidate : null;
  }

  private static spawn(workerPath: string, dbPath: string): Worker {
    const worker = new Worker(workerPath, {
      workerData: { dbPath, cacheSize: config.sqliteCacheSize },
    });

    worker.on(
      'message',
      (message: { type: string; id?: number; rows?: unknown[]; error?: string }) => {
        if (message.type !== 'result' || message.id === undefined) {
          return;
        }

        const slot = this.slots.find((s) => s.worker === worker);
        if (slot) {
          slot.busy = false;
          slot.queryId = null;
        }

        const waiting = this.pending.get(message.id);
        this.pending.delete(message.id);

        if (waiting) {
          if (message.error) {
            waiting.reject(new Error(message.error));
          } else {
            waiting.resolve(message.rows ?? []);
          }
        }

        this.drain();
      }
    );

    worker.on('error', (error) => {
      logger.error('[DbQueryPool] Worker error:', error);
      this.dropWorker(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn(`[DbQueryPool] Worker exited with code ${code}`);
      }
      this.dropWorker(worker);
    });

    worker.unref();
    return worker;
  }

  /**
   * A dead worker must not strand the query it was holding.
   *
   * Rejecting only when the pool empties leaves the crashed worker's caller
   * waiting forever — the request hangs until the timeout middleware kills it and
   * the pending entry leaks. Reject that query specifically, and when no worker
   * is left, reject everything still queued as well.
   */
  private static dropWorker(worker: Worker): void {
    const index = this.slots.findIndex((s) => s.worker === worker);
    if (index === -1) {
      return;
    }

    const [dropped] = this.slots.splice(index, 1);

    if (dropped.queryId !== null) {
      const waiting = this.pending.get(dropped.queryId);
      this.pending.delete(dropped.queryId);
      waiting?.reject(new Error('Database query worker stopped while running the query'));
    }

    if (this.slots.length === 0) {
      logger.error('[DbQueryPool] All query workers are gone; falling back to in-process queries');
      this.rejectOutstanding(new Error('Database query workers are unavailable'));
    } else {
      // A freed slot may exist now; keep the queue moving.
      this.drain();
    }
  }

  /** Settle everything in flight or waiting, so no caller is left hanging. */
  private static rejectOutstanding(error: Error): void {
    for (const waiting of this.pending.values()) {
      waiting.reject(error);
    }
    this.pending.clear();

    const queued = this.queue.splice(0, this.queue.length);
    for (const item of queued) {
      item.reject(error);
    }
  }

  static all<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.queue.push({
        sql,
        params,
        resolve: (rows) => resolve(rows as T[]),
        reject,
      });
      this.drain();
    });
  }

  private static drain(): void {
    while (this.queue.length > 0) {
      const slot = this.slots.find((s) => !s.busy);
      if (!slot) {
        return;
      }

      const next = this.queue.shift();
      if (!next) {
        return;
      }

      const id = this.nextQueryId;
      this.nextQueryId += 1;

      slot.busy = true;
      slot.queryId = id;
      this.pending.set(id, { resolve: next.resolve, reject: next.reject });
      slot.worker.postMessage({ type: 'query', id, sql: next.sql, params: [...next.params] });
    }
  }

  /** Point workers at a reopened database after a reload or local-copy sync. */
  static reopen(dbPath: string): void {
    this.dbPath = dbPath;
    for (const slot of this.slots) {
      slot.worker.postMessage({ type: 'reopen', dbPath });
    }
  }

  static async shutdown(): Promise<void> {
    const slots = [...this.slots];
    this.slots = [];
    this.started = false;
    this.rejectOutstanding(new Error('Database query workers are shutting down'));
    await Promise.all(slots.map((slot) => slot.worker.terminate()));
  }
}
