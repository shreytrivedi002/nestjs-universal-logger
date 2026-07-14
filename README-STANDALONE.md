# NestJS Universal Logger v2 — Standalone API

API reference for the **standalone** exports this package recommends.

For install, module setup, Redis/memory batching, body modes, TTL, and scope limits, see the main [README.md](./README.md).

## Recommended module

```typescript
import { UniversalLoggerStandaloneModule } from 'nestjs-universal-logger-v2';

UniversalLoggerStandaloneModule.forRoot({ /* config */ });
// or
UniversalLoggerStandaloneModule.forRootAsync({ useFactory, inject });
// or
UniversalLoggerStandaloneModule.forService('payment-service', { /* config */ });
```

On `forRoot` / `forService`, Nest registers:

| Provider | Role |
|----------|------|
| `UniversalLoggerClient` | Inject for application / manual logging |
| `UniversalLoggerFactory` | Creates per-service loggers; flushes batch buffers on destroy |
| `UniversalLoggerInterceptor` | Bound as `APP_INTERCEPTOR` |
| `UniversalLoggerExceptionFilter` | Bound as `APP_FILTER` |

`UniversalLoggerGuard` is exported but **not** auto-registered.

## Injecting the client

```typescript
import { Injectable } from '@nestjs/common';
import { UniversalLoggerClient } from 'nestjs-universal-logger-v2';

@Injectable()
export class OrdersService {
  constructor(private readonly logger: UniversalLoggerClient) {}

  async placeOrder(userId: string, amount: number) {
    await this.logger.logUserAction('order_started', userId, { amount });
    try {
      // …
      await this.logger.logPayment(userId, amount, 'USD');
    } catch (error) {
      await this.logger.logErrorWithContext(error as Error, 'OrdersService.placeOrder', {
        userId,
        amount,
      });
      throw error;
    }
  }
}
```

## Client / standalone methods

All methods below are available on `UniversalLoggerClient` (and the underlying `UniversalLoggerStandalone`, unless noted).

### Core

| Method | Description |
|--------|-------------|
| `log(message, context?, metadata?)` | Info-level log |
| `error(message, trace?, context?, metadata?)` | Error log |
| `warn(message, context?, metadata?)` | Warning |
| `debug(message, context?, metadata?)` | Debug |
| `verbose(message, context?, metadata?)` | Verbose |

### HTTP / API (usually automatic via interceptor)

| Method | Description |
|--------|-------------|
| `logApiCall(req, res, duration, statusCode)` | Structured API call entry |

### Auth & security (manual unless you add the guard)

| Method | Description |
|--------|-------------|
| `logAuthEvent(event, userId?, success?, metadata?)` | Auth success/failure |
| `logUserLogin(userId, success, metadata?)` | Login helper |
| `logUserLogout(userId, metadata?)` | Logout helper |
| `logSecurity(event, metadata?)` | Security event |
| `logSecurityViolation(event, ip?, userAgent?, metadata?)` | Violation helper |

### Business

| Method | Description |
|--------|-------------|
| `logBusinessLogic(operation, data, context?)` | Generic business event |
| `logUserAction(action, userId, metadata?)` | User action |
| `logFeatureUsage(feature, userId?, metadata?)` | Feature usage |
| `logUserRegistration(userId, metadata?)` | Registration helper |
| `logUserProfileUpdate(userId, changes)` | Profile update helper |
| `logPayment(userId, amount, currency, metadata?)` | Payment helper |
| `logBusinessMetric(metric, value, metadata?)` | Numeric metric |
| `logFeatureAccess(feature, userId, success, metadata?)` | Feature access |

### Performance

| Method | Description |
|--------|-------------|
| `logPerformance(operation, duration, metadata?)` | Timed operation |
| `logSlowOperation(operation, duration, threshold?, metadata?)` | Slow op helper |
| `logDatabaseQuery(query, duration, table?, operation?)` | DB timing |
| `logDatabaseOperation(operation, table, duration, query?)` | DB helper |
| `logExternalCall(url, method, duration, statusCode, response?)` | External HTTP |
| `logExternalApiCall(...)` | Alias-style helper |
| `logSystemMetrics()` | Process memory / CPU snapshot |

### Query & cleanup

| Method | Description |
|--------|-------------|
| `getLogs(query)` | Find logs (`LogQuery`) |
| `getLogStats(timeRange)` | Aggregated counts / durations |
| `getErrorTrends(days?)` | Error trend helper |
| `getTopErrors(limit?, days?)` | Top errors |
| `getPerformanceMetrics(hours?)` | Performance aggregates |
| `cleanupOldLogs(daysToKeep?)` | Manual delete older than N days |

### Batch buffer (on `UniversalLoggerStandalone`)

| Method | Description |
|--------|-------------|
| `getBatchTransport()` | `'memory'` \| `'redis'` \| `'none'` |
| `flush()` | Flush current buffer to Mongo |
| `destroy()` | Stop timers, drain buffer, close Redis if used |

`UniversalLoggerFactory` calls `destroy()` on all loggers during Nest `onModuleDestroy`.

## Automatic HTTP behavior

`UniversalLoggerInterceptor`:

- Assigns / propagates `x-request-id`
- Respects `excludePaths`
- Logs request start (bodies only when `logBodyMode: 'all'`)
- Logs success / error completion with duration and status
- Attaches bodies per `logBodyMode` / `logResponseBodyMode` and `maxBodySize`
- Categorizes paths heuristically (`AUTH`, `PAYMENT`, `ADMIN`, `HEALTH`, etc.)

`UniversalLoggerExceptionFilter`:

- Logs uncaught exceptions with stack / context

Auth, business, and many security events are **not** inferred automatically — call the client.

## Batching deep dive

```text
Request / manual log
        │
        ▼
  enqueue (non-blocking)
        │
   ┌────┴────┐
   │ Redis   │  if configured + connectable + ioredis installed
   │  list   │
   └────┬────┘
        │ else
   ┌────┴────┐
   │ Memory  │  bounded array (default / fallback)
   │ buffer  │
   └────┬────┘
        │ every flushIntervalMs or maxBatchSize
        ▼
  MongoDB insertMany → logs_{service}
```

### Transport rules

| Setting | Result |
|---------|--------|
| No `batch.redis` | Memory |
| `transport: 'memory'` | Memory |
| `transport: 'auto'` or `'redis'` + reachable Redis | Redis |
| Redis down / no `ioredis` | Memory fallback (logged warning) |
| `batch.enabled: false` | Direct `create()` per log |

### Redis key

```text
{keyPrefix}:batch:{sanitizedServiceName}
```

Default prefix: `nestjs-universal-logger`

## Collections

```text
logs_{sanitizedServiceName}
```

`environment` is a document field, not part of the collection name.

## Body helpers (exported)

| Helper | Purpose |
|--------|---------|
| `resolveRequestBodyMode(api)` | Resolve `'none' \| 'all' \| 'errors'` |
| `resolveResponseBodyMode(api)` | Same for responses |
| `shouldLogBody(mode, statusCode?, isErrorPath?)` | Whether to attach a body |
| `prepareLogBody(body, maxBodySize?)` | Sanitize + size-cap / omit |

## Scope reminder

**Implemented**

- Nest standalone module, interceptor, exception filter
- Mongo persistence with per-service collections
- Batched writes: **Redis or in-memory**, with auto-fallback
- Body modes + large-body omission
- TTL, manual helpers, query helpers

**Not implemented**

- Dashboard UI, alerts, email/webhooks, CSV/Excel export, archive retention

Prefer `ttl` and/or `cleanupOldLogs` for storage management.

### Defaults

| Option | Default |
|--------|---------|
| `api.logBodyMode` | `errors` |
| `api.logResponseBodyMode` | same as `logBodyMode` |
| `api.maxBodySize` | `1024` |
| `batch.enabled` | `true` |
| `batch.transport` | `auto` |
| `batch.flushIntervalMs` | `250` |
| `batch.maxBatchSize` | `100` |
| `batch.maxBufferSize` | `2000` |
