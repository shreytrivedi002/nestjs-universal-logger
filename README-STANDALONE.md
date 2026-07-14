# NestJS Universal Logger v2 — Standalone API

This document covers the **standalone** API that the package actually exports and recommends.

For install, module setup, TTL, and scope limits (no dashboard / alerts / export), see the main [README.md](./README.md).

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
| `UniversalLoggerClient` | Inject this for application/manual logging |
| `UniversalLoggerFactory` | Creates per-service loggers |
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

All methods below are available on `UniversalLoggerClient` (and the underlying `UniversalLoggerStandalone`).

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

## Automatic HTTP behavior

`UniversalLoggerInterceptor`:

- Assigns / propagates `x-request-id`
- Logs request start (method, URL, IP, UA, sanitized headers/query/body)
- Logs success or error completion with duration and status
- Categorizes paths heuristically (`AUTH`, `PAYMENT`, `ADMIN`, `HEALTH`, etc.)

`UniversalLoggerExceptionFilter`:

- Logs uncaught exceptions with stack / context

Auth, business, and many security events are **not** inferred automatically — call the client.

## Collections

```text
logs_{sanitizedServiceName}
```

`environment` is a document field, not part of the collection name.

## Scope reminder

Implemented: Nest logging module, Mongo persistence, TTL, interceptor/filter, manual helpers, query helpers.

**Not** implemented: dashboard UI, alerts, email/webhooks, CSV/Excel export, archive-based retention. Prefer `ttl` and/or `cleanupOldLogs` for storage management.
