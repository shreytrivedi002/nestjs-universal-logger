import { Model } from 'mongoose';
import { LogEntry, UniversalLoggerConfig } from '../interfaces/config.interface';
import { LogBatchSink, LogBatchWriterOptions } from './log-batch-sink';

type RedisClient = {
  connect(): Promise<void>;
  ping(): Promise<string>;
  rpush(key: string, value: string): Promise<number>;
  llen(key: string): Promise<number>;
  lpop(key: string): Promise<string | null>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  ltrim(key: string, start: number, stop: number): Promise<'OK'>;
  quit(): Promise<'OK'>;
  disconnect(): void;
  status: string;
};

export interface RedisLogBatchWriterOptions extends LogBatchWriterOptions {
  key: string;
}

/**
 * Redis list-backed buffer that flushes to Mongo via insertMany.
 * Requires optional peer dependency: ioredis
 */
export class RedisLogBatchWriter implements LogBatchSink {
  readonly transport = 'redis' as const;

  private timer: NodeJS.Timeout | null = null;
  private flushing = false;
  private closed = false;
  private droppedCount = 0;

  private constructor(
    private readonly redis: RedisClient,
    private readonly model: Model<LogEntry>,
    private readonly options: RedisLogBatchWriterOptions,
  ) {
    this.timer = setInterval(() => {
      void this.flush();
    }, this.options.flushIntervalMs);

    this.timer.unref?.();
  }

  static async tryCreate(
    model: Model<LogEntry>,
    batchOptions: LogBatchWriterOptions,
    redisConfig: NonNullable<NonNullable<UniversalLoggerConfig['batch']>['redis']>,
    serviceName: string,
  ): Promise<RedisLogBatchWriter | null> {
    let RedisCtor: any;
    try {
      // Optional dependency — host apps must install ioredis to enable Redis buffering
      RedisCtor = (await import('ioredis')).default;
    } catch {
      console.warn(
        '[nestjs-universal-logger] Redis batch requested but `ioredis` is not installed. Falling back to in-memory batching. Run: npm i ioredis',
      );
      return null;
    }

    const connectTimeoutMs = redisConfig.connectTimeoutMs ?? 2000;
    const clientOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: connectTimeoutMs,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    };

    const redis: RedisClient = redisConfig.url
      ? new RedisCtor(redisConfig.url, clientOptions)
      : new RedisCtor({
          host: redisConfig.host || '127.0.0.1',
          port: redisConfig.port || 6379,
          password: redisConfig.password,
          username: redisConfig.username,
          db: redisConfig.db ?? 0,
          ...clientOptions,
        });

    try {
      await redis.connect();
      const pong = await redis.ping();
      if (String(pong).toUpperCase() !== 'PONG') {
        throw new Error(`Unexpected Redis PING response: ${pong}`);
      }
    } catch (error: any) {
      try {
        redis.disconnect();
      } catch {
        // ignore
      }
      console.warn(
        `[nestjs-universal-logger] Redis not connectable (${error?.message || error}). Falling back to in-memory batching.`,
      );
      return null;
    }

    const keyPrefix = redisConfig.keyPrefix || 'nestjs-universal-logger';
    const key = `${keyPrefix}:batch:${serviceName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    return new RedisLogBatchWriter(redis, model, {
      ...batchOptions,
      key,
    });
  }

  enqueue(entry: LogEntry): void {
    if (this.closed) {
      void this.model.create(entry).catch((error) => {
        console.error('Failed to save log to MongoDB after Redis batch writer closed:', error);
      });
      return;
    }

    void this.enqueueAsync(entry);
  }

  private async enqueueAsync(entry: LogEntry): Promise<void> {
    try {
      await this.redis.rpush(this.options.key, JSON.stringify(entry));
      const len = await this.redis.llen(this.options.key);

      if (len > this.options.maxBufferSize) {
        const overflow = len - this.options.maxBufferSize;
        for (let i = 0; i < overflow; i += 1) {
          await this.redis.lpop(this.options.key);
          this.droppedCount += 1;
        }
      }

      if (len >= this.options.maxBatchSize) {
        void this.flush();
      }
    } catch (error) {
      console.error('Failed to enqueue log to Redis batch buffer:', error);
      // Last-resort direct write so logs are not silently lost
      try {
        await this.model.create(entry);
      } catch (mongoError) {
        console.error('Failed to save log to MongoDB after Redis enqueue failure:', mongoError);
      }
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.closed) {
      return;
    }

    this.flushing = true;

    try {
      const raw = await this.redis.lrange(this.options.key, 0, this.options.maxBatchSize - 1);
      if (!raw.length) {
        return;
      }

      await this.redis.ltrim(this.options.key, raw.length, -1);

      const batch: LogEntry[] = [];
      for (const item of raw) {
        try {
          batch.push(JSON.parse(item));
        } catch {
          // skip corrupt entries
        }
      }

      if (batch.length > 0) {
        await this.model.insertMany(batch, { ordered: false });
      }

      const remaining = await this.redis.llen(this.options.key);
      if (remaining >= this.options.maxBatchSize) {
        void this.flush();
      }
    } catch (error) {
      console.error('Failed to flush Redis log batch to MongoDB:', error);
    } finally {
      this.flushing = false;
    }
  }

  getDroppedCount(): number {
    return this.droppedCount;
  }

  async destroy(): Promise<void> {
    this.closed = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Drain remaining entries
    for (let i = 0; i < 50; i += 1) {
      const len = await this.redis.llen(this.options.key);
      if (len === 0) {
        break;
      }
      await this.flush();
    }

    try {
      await this.redis.quit();
    } catch {
      try {
        this.redis.disconnect();
      } catch {
        // ignore
      }
    }
  }
}
