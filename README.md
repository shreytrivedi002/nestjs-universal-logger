# NestJS Universal Logger v2

Plug-and-play logging for NestJS: automatic HTTP request/response capture, exception logging, and manual structured logs stored in **per-service MongoDB collections**, with **batched writes** (Redis or in-memory) and optional **TTL cleanup**.

> **Scope:** this package is a logger + MongoDB store. It does **not** include a dashboard UI, alert webhooks/email, or CSV/Excel export. Config keys such as `dashboard`, `alerts`, `export`, and `retention` exist on the TypeScript interface for forward compatibility but are **not implemented**.

## Features

- Plug-and-play NestJS module (`UniversalLoggerStandaloneModule`)
- Automatic HTTP request / response / error logging via interceptor + exception filter
- Per-service MongoDB collections (`logs_{serviceName}`)
- **Batched Mongo writes** to reduce request-path load
  - **Redis** buffer when configured and connectable
  - **In-memory** buffer as default / automatic fallback
- Configurable body logging: `none` | `all` | `errors` (default)
- Large bodies omitted (`maxBodySize`, default 1024 bytes)
- Winston console / optional file transports
- Manual structured logging (auth, security, business, performance helpers)
- Query helpers (`getLogs`, `getLogStats`, `getErrorTrends`, etc.)
- MongoDB TTL indexes for automatic document expiration
- Sensitive header / body field redaction

## Prerequisites

1. A NestJS app with an existing Mongoose connection (`MongooseModule.forRoot(...)`)
2. Peer deps: `@nestjs/common`, `@nestjs/core`, `@nestjs/mongoose`, `rxjs`
3. Optional for Redis buffering: `ioredis` + a reachable Redis instance

This package registers its own models via `MongooseModule.forFeature`. It does **not** open a MongoDB connection from `config.mongodb.uri` — wire Mongo yourself.

## Install

```bash
npm install nestjs-universal-logger-v2

# Optional — only if you want Redis-backed batch buffering
npm install ioredis
```

## Quick start

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UniversalLoggerStandaloneModule } from 'nestjs-universal-logger-v2';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/your-db'),
    UniversalLoggerStandaloneModule.forRoot({
      logging: {
        level: 'info',
        serviceName: 'your-service-name',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        enableConsole: true,
        enableFile: false,
      },
      api: {
        enabled: true,
        logHeaders: true,
        logQuery: true,
        logResponses: true,
        logBodyMode: 'errors', // 'none' | 'all' | 'errors'
        logResponseBodyMode: 'errors',
        maxBodySize: 1024,
        slowRequestThreshold: 1000,
        sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
        excludePaths: ['/health', '/health/*', '/metrics'],
      },
      batch: {
        enabled: true,
        transport: 'auto', // Redis if configured + connectable, else memory
        maxBatchSize: 100,
        flushIntervalMs: 250,
        maxBufferSize: 2000,
        // Optional Redis buffer — omit to use in-memory only
        // redis: { url: process.env.REDIS_URL },
      },
      performance: { enabled: true },
      security: { enabled: true },
      business: { enabled: true },
      ttl: {
        enabled: true,
        expireAfterSeconds: 2592000, // 30 days
        indexField: 'timestamp',
      },
    }),
  ],
})
export class AppModule {}
```

After `forRoot`, the module registers:

- `APP_INTERCEPTOR` → `UniversalLoggerInterceptor` (HTTP request/response)
- `APP_FILTER` → `UniversalLoggerExceptionFilter` (uncaught exceptions)

`UniversalLoggerGuard` is available but **not** registered automatically — use it yourself if needed.

## High-volume design

Logs are **not** written to Mongo on every request synchronously by default.

1. Interceptor / client enqueues a log document into a **batch buffer**
2. Buffer flushes with `insertMany` every `flushIntervalMs` or when `maxBatchSize` is reached
3. Buffer is **bounded** (`maxBufferSize`); when full, oldest entries are dropped

### Transport selection

| `batch.transport` | Behavior |
|-------------------|----------|
| `auto` (default) | Use **Redis** if `batch.redis` is set, `ioredis` is installed, and Redis responds to `PING`; otherwise **memory** |
| `redis` | Try Redis; **fall back to memory** if unavailable |
| `memory` | Always use in-process memory buffer |

**Fallback is automatic** — missing Redis, failed connect, or missing `ioredis` does not crash the app.

Inspect the active transport at runtime:

```typescript
logger.getBatchTransport(); // 'memory' | 'redis' | 'none'
```

### Production tips

- Prefer `logBodyMode: 'errors'` (default) — don’t log bodies on every 200 OK
- Keep `maxBodySize` low (1024); oversized payloads become `{ _omitted: true, reason: 'BODY_TOO_LARGE', ... }`
- Exclude health/metrics paths
- Use a **dedicated logging MongoDB** when possible (not your primary app DB)
- Use Redis buffering when many pods share buffering needs and Redis is already in the stack
- Call `flush()` / rely on module destroy so shutdown drains the buffer

## What is automatic vs manual

| Capability | Automatic? | How |
|------------|------------|-----|
| HTTP request / response logging | Yes | Interceptor |
| Uncaught exception logging | Yes | Exception filter |
| Batched Mongo persistence | Yes (default) | Memory or Redis → `insertMany` |
| Auth / login / logout events | No | Call `UniversalLoggerClient` helpers |
| Security violations | No | Call helpers (or use the optional guard) |
| Business / payment / feature usage | No | Call helpers |
| DB / external call timing | No | Call helpers |
| TTL cleanup | Yes (when configured) | MongoDB TTL index on insert |
| Manual bulk cleanup | Optional | `cleanupOldLogs(days)` |

## Configuration

### Logging

```typescript
logging: {
  level?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  serviceName?: string;   // used for collection naming
  environment?: string;
  version?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  logDirectory?: string;
  maxFileSize?: number;
  maxFiles?: number;
}
```

### API logging

```typescript
api: {
  enabled?: boolean;
  logHeaders?: boolean;
  logQuery?: boolean;
  logResponses?: boolean;
  /**
   * When to attach request bodies:
   * - 'none'   → never
   * - 'all'    → every request
   * - 'errors' → only status >= 400 (default)
   */
  logBodyMode?: 'none' | 'all' | 'errors';
  /** Same modes for response bodies; defaults to logBodyMode */
  logResponseBodyMode?: 'none' | 'all' | 'errors';
  /** Legacy: true → 'all', false → 'none' */
  logBody?: boolean;
  /** Max serialized body size (bytes). Larger bodies are omitted. Default 1024 */
  maxBodySize?: number;
  slowRequestThreshold?: number;
  sensitiveHeaders?: string[];
  excludePaths?: string[];
  includePaths?: string[];
}
```

#### Body logging examples

```typescript
// Production-friendly (default behavior)
api: { logBodyMode: 'errors', logResponseBodyMode: 'errors', maxBodySize: 1024 }

// Full bodies on every request (higher volume)
api: { logBodyMode: 'all', logResponseBodyMode: 'all', maxBodySize: 4096 }

// Metadata only — no bodies
api: { logBodyMode: 'none', logResponseBodyMode: 'none' }
```

### Batching (Mongo writes)

```typescript
batch: {
  enabled?: boolean;              // default true
  transport?: 'auto' | 'redis' | 'memory'; // default 'auto'
  maxBatchSize?: number;          // default 100
  flushIntervalMs?: number;       // default 250
  maxBufferSize?: number;         // default 2000
  redis?: {
    url?: string;                 // e.g. redis://localhost:6379/0
    host?: string;                // default 127.0.0.1
    port?: number;                // default 6379
    password?: string;
    username?: string;
    db?: number;
    keyPrefix?: string;           // default nestjs-universal-logger
    connectTimeoutMs?: number;    // default 2000
  };
}
```

#### Redis-backed batching

```typescript
batch: {
  enabled: true,
  transport: 'auto',
  maxBatchSize: 100,
  flushIntervalMs: 250,
  maxBufferSize: 2000,
  redis: {
    url: process.env.REDIS_URL,
    // or: host: '127.0.0.1', port: 6379, password: '...',
    keyPrefix: 'nestjs-universal-logger',
    connectTimeoutMs: 2000,
  },
}
```

```bash
npm i ioredis
```

Redis stores pending log documents in a list key such as:

```text
{keyPrefix}:batch:{serviceName}
```

The worker drains that list and writes to Mongo with `insertMany`.

#### Memory-only batching

```typescript
batch: {
  enabled: true,
  transport: 'memory',
  maxBatchSize: 100,
  flushIntervalMs: 250,
  maxBufferSize: 2000,
}
```

Or simply omit `batch.redis`.

#### Disable batching (not recommended at high volume)

```typescript
batch: { enabled: false }
```

Each log uses `create()` immediately.

### Feature toggles

```typescript
performance?: { enabled?: boolean };
security?: { enabled?: boolean };
business?: { enabled?: boolean };
```

These gate the corresponding **manual** helper methods.

### TTL

```typescript
ttl: {
  enabled: boolean;
  expireAfterSeconds: number;
  indexField?: 'timestamp' | 'created_at' | 'updated_at'; // default: timestamp
}
```

Examples:

```typescript
// 30 days
ttl: { enabled: true, expireAfterSeconds: 2592000, indexField: 'timestamp' }

// 7 days
ttl: { enabled: true, expireAfterSeconds: 604800, indexField: 'created_at' }
```

### Defaults summary

| Option | Default |
|--------|---------|
| `api.logBodyMode` | `errors` |
| `api.logResponseBodyMode` | same as `logBodyMode` |
| `api.maxBodySize` | `1024` |
| `batch.enabled` | `true` |
| `batch.transport` | `auto` |
| `batch.maxBatchSize` | `100` |
| `batch.flushIntervalMs` | `250` |
| `batch.maxBufferSize` | `2000` |

### Not implemented (config stubs only)

These appear on `UniversalLoggerConfig` but have **no runtime behavior**:

- `dashboard` — no UI, routes, or auth
- `alerts` — no webhooks or email
- `export` — no CSV/Excel export
- `retention` — prefer `ttl` (or `cleanupOldLogs`) instead
- `mongodb` — connection is managed by your app’s `MongooseModule.forRoot`

## MongoDB collections

Collection name:

```text
logs_{sanitizedServiceName}
```

Example: `serviceName: 'admin-panel'` → `logs_admin_panel`

Environment is stored on each document; it is **not** part of the collection name.

## Manual logging

```typescript
import { UniversalLoggerClient } from 'nestjs-universal-logger-v2';

@Injectable()
export class YourService {
  constructor(private readonly logger: UniversalLoggerClient) {}

  async someMethod() {
    await this.logger.log('User action performed', 'USER_ACTION');
    await this.logger.error('Something went wrong', 'Error stack', 'ERROR_CONTEXT');

    await this.logger.logUserAction('profile_updated', 'user123', { changes: ['name', 'email'] });
    await this.logger.logPayment('user123', 99.99, 'USD', { paymentMethod: 'card' });
    await this.logger.logSlowOperation('database_query', 1500, 1000);
    await this.logger.logSecurityViolation('suspicious_activity', '192.168.1.1');
  }
}
```

### Useful client methods

- Core: `log`, `error`, `warn`, `debug`, `verbose`
- Auth: `logAuthEvent`, `logUserLogin`, `logUserLogout`
- Security: `logSecurity`, `logSecurityViolation`
- Business: `logUserAction`, `logFeatureUsage`, `logPayment`, `logBusinessMetric`
- Performance: `logPerformance`, `logSlowOperation`, `logDatabaseQuery`, `logExternalCall`
- Query: `getLogs`, `getLogStats`, `getErrorTrends`, `getTopErrors`, `getPerformanceMetrics`
- Cleanup: `cleanupOldLogs`
- Batch: `getBatchTransport()` (on standalone logger), `flush()`, `destroy()`

See [README-STANDALONE.md](./README-STANDALONE.md) for a fuller API-oriented overview.

## Advanced setup

### Per-service registration

```typescript
UniversalLoggerStandaloneModule.forService('payment-service', {
  logging: { serviceName: 'payment-service', /* … */ },
  // …
});
```

### Async configuration

```typescript
UniversalLoggerStandaloneModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    logging: {
      serviceName: configService.get('SERVICE_NAME'),
      environment: configService.get('NODE_ENV'),
      level: configService.get('LOG_LEVEL') || 'info',
    },
    api: {
      logBodyMode: 'errors',
      maxBodySize: 1024,
      excludePaths: ['/health', '/metrics'],
    },
    batch: {
      enabled: true,
      transport: 'auto',
      redis: {
        url: configService.get('REDIS_URL'),
      },
    },
    ttl: {
      enabled: true,
      expireAfterSeconds: 2592000,
    },
  }),
  inject: [ConfigService],
});
```

## Public exports

Primary entry (`nestjs-universal-logger-v2`):

- `UniversalLoggerStandaloneModule`
- `UniversalLoggerClient`
- `UniversalLoggerFactory`
- `UniversalLoggerStandalone`
- `UniversalLoggerInterceptor`
- `UniversalLoggerExceptionFilter`
- `UniversalLoggerGuard`
- `LogBatchWriter`, `RedisLogBatchWriter`, `LogBatchSink`
- Body helpers: `prepareLogBody`, `resolveRequestBodyMode`, `shouldLogBody`, …
- Types: `UniversalLoggerConfig`, `LogEntry`, `LogQuery`, schema helpers

A legacy `UniversalLoggerModule` / middleware path exists in the source tree for compatibility work but is **not** exported from the package entrypoint. Prefer the standalone module above.

## Example log document

```json
{
  "timestamp": "2025-08-02T12:53:27.993Z",
  "level": "info",
  "service": "admin-panel",
  "environment": "uat",
  "version": "1.0.0",
  "context": "API",
  "message": "API Request Completed: GET /admin/auditLog/list",
  "metadata": {
    "method": "GET",
    "url": "/admin/auditLog/list",
    "statusCode": 200,
    "duration": 42,
    "ip": "::1",
    "userAgent": "Mozilla/5.0...",
    "headers": { "authorization": "[REDACTED]" },
    "requestId": "req_1754139207993_d28emip7h"
  }
}
```

Omitted oversized body example:

```json
{
  "_omitted": true,
  "reason": "BODY_TOO_LARGE",
  "size": 58210,
  "maxBodySize": 1024
}
```

## License

MIT — see [LICENSE](./LICENSE).
