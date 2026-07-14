import { Model } from 'mongoose';
import { LogEntry } from '../interfaces/config.interface';
import { LogBatchSink, LogBatchWriterOptions } from './log-batch-sink';

/**
 * Bounded in-memory buffer that flushes log docs to Mongo via insertMany.
 */
export class LogBatchWriter implements LogBatchSink {
  readonly transport = 'memory' as const;

  private buffer: LogEntry[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing = false;
  private closed = false;
  private droppedCount = 0;

  constructor(
    private readonly model: Model<LogEntry>,
    private readonly options: LogBatchWriterOptions,
  ) {
    this.timer = setInterval(() => {
      void this.flush();
    }, this.options.flushIntervalMs);

    this.timer.unref?.();
  }

  enqueue(entry: LogEntry): void {
    if (this.closed) {
      void this.model.create(entry).catch((error) => {
        console.error('Failed to save log to MongoDB after batch writer closed:', error);
      });
      return;
    }

    if (this.buffer.length >= this.options.maxBufferSize) {
      this.buffer.shift();
      this.droppedCount += 1;
      void this.flush();
    }

    this.buffer.push(entry);

    if (this.buffer.length >= this.options.maxBatchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) {
      return;
    }

    this.flushing = true;
    const batch = this.buffer.splice(0, this.options.maxBatchSize);

    try {
      await this.model.insertMany(batch, { ordered: false });
    } catch (error) {
      console.error('Failed to flush in-memory log batch to MongoDB:', error);
    } finally {
      this.flushing = false;

      if (this.buffer.length >= this.options.maxBatchSize) {
        void this.flush();
      }
    }
  }

  getDroppedCount(): number {
    return this.droppedCount;
  }

  getBufferedCount(): number {
    return this.buffer.length;
  }

  async destroy(): Promise<void> {
    this.closed = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    while (this.buffer.length > 0) {
      await this.flush();
    }
  }
}
