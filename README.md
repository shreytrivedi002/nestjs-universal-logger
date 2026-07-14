# NestJS Universal Logger v2

Plug-and-play logging for NestJS: automatic HTTP request/response capture, exception logging, and manual structured logs stored in **per-service MongoDB collections**, with optional **TTL cleanup**.

> **Scope:** this package is a logger + MongoDB store. It does **not** include a dashboard UI, alert webhooks/email, or CSV/Excel export. Config keys such as `dashboard`, `alerts`, `export`, and `retention` exist on the TypeScript interface for forward compatibility but are **not implemented**.

## Features

- Plug-and-play NestJS module (`UniversalLoggerStandaloneModule`)
- Automatic HTTP request / response / error logging via interceptor + exception filter
- Per-service MongoDB collections (`logs_{serviceName}`)
- Winston console / optional file transports
- Manual structured logging (auth, security, business, performance helpers)
- Query helpers (`getLogs`, `getLogStats`, `getErrorTrends`, etc.)
- MongoDB TTL indexes for automatic document expiration
- Sensitive header / body field redaction

## Prerequisites

1. A NestJS app with an existing Mongoose connection (`MongooseModule.forRoot(...)`)
2. Peer deps: `@nestjs/common`, `@nestjs/core`, `@nestjs/mongoose`, `rxjs`

This package registers its own models via `MongooseModule.forFeature`. It does **not** open a MongoDB connection from `config.mongodb.uri` — wire Mongo yourself.

## Install

```bash
npm install nestjs-universal-logger-v2
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
        logBody: true,
        logQuery: true,
        logResponses: true,
        maxBodySize: 1024,
        slowRequestThreshold: 1000,
        sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
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

## What is automatic vs manual

| Capability | Automatic? | How |
|------------|------------|-----|
| HTTP request / response logging | Yes | Interceptor |
| Uncaught exception logging | Yes | Exception filter |
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
  logBody?: boolean;
  logQuery?: boolean;
  logResponses?: boolean;
  maxBodySize?: number;
  slowRequestThreshold?: number;
  sensitiveHeaders?: string[];
  excludePaths?: string[];
  includePaths?: string[];
}
```

### Feature toggles

```typescript
performance?: { enabled?: boolean; /* … */ };
security?: { enabled?: boolean; /* … */ };
business?: { enabled?: boolean; /* … */ };
```

These gates apply to the corresponding **manual** helper methods (and related logging). They do not enable a dashboard or alerts.

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
  "message": "API Request Started: GET /admin/auditLog/list",
  "metadata": {
    "method": "GET",
    "url": "/admin/auditLog/list",
    "ip": "::1",
    "userAgent": "Mozilla/5.0...",
    "headers": { "authorization": "[REDACTED]" },
    "requestId": "req_1754139207993_d28emip7h"
  }
}
```

## License

MIT — see [LICENSE](./LICENSE).
