import { Model } from 'mongoose';
import { LogEntry, UniversalLoggerConfig } from '../interfaces/config.interface';
import { LogBatchSink, LogBatchWriterOptions } from './log-batch-sink';
import { LogBatchWriter } from './log-batch-writer';
import { RedisLogBatchWriter } from './redis-log-batch-writer';

export function getBatchWriterOptions(config?: UniversalLoggerConfig['batch']): LogBatchWriterOptions {
  return {
    maxBatchSize: config?.maxBatchSize ?? 100,
    flushIntervalMs: config?.flushIntervalMs ?? 250,
    maxBufferSize: config?.maxBufferSize ?? 2000,
  };
}

function createMemoryWriter(
  model: Model<LogEntry>,
  options: LogBatchWriterOptions,
): LogBatchSink {
  return new LogBatchWriter(model, options);
}

function shouldAttemptRedis(config?: UniversalLoggerConfig['batch']): boolean {
  const transport = config?.transport || 'auto';
  if (transport === 'memory') {
    return false;
  }
  if (!config?.redis) {
    return false;
  }
  // Need at least a URL or host
  return Boolean(config.redis.url || config.redis.host);
}

/**
 * Creates a batch sink.
 * Starts on memory immediately; optionally upgrades to Redis when connectable.
 */
export function createInitialBatchWriter(
  model: Model<LogEntry>,
  config?: UniversalLoggerConfig['batch'],
): LogBatchSink | null {
  if (config?.enabled === false) {
    return null;
  }
  return createMemoryWriter(model, getBatchWriterOptions(config));
}

/**
 * Try Redis when configured. Returns a Redis sink, or null to keep using memory.
 */
export async function tryCreateRedisBatchWriter(
  model: Model<LogEntry>,
  config: UniversalLoggerConfig['batch'] | undefined,
  serviceName: string,
): Promise<LogBatchSink | null> {
  if (!shouldAttemptRedis(config)) {
    return null;
  }

  return RedisLogBatchWriter.tryCreate(
    model,
    getBatchWriterOptions(config),
    config!.redis!,
    serviceName,
  );
}
