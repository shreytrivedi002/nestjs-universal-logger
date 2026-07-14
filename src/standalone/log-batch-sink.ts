import { LogEntry } from '../interfaces/config.interface';

/**
 * Shared contract for memory and Redis batch buffers.
 */
export interface LogBatchSink {
  readonly transport: 'memory' | 'redis';
  enqueue(entry: LogEntry): void;
  flush(): Promise<void>;
  destroy(): Promise<void>;
}

export interface LogBatchWriterOptions {
  maxBatchSize: number;
  flushIntervalMs: number;
  maxBufferSize: number;
}
