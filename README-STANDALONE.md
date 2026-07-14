# NestJS Universal Logger v2 - Standalone Package

A plug-and-play universal logging package for NestJS applications that provides automatic system-wide logging with per-service MongoDB collections.

## ✨ Features

- **🔧 Plug-and-Play**: Single import, minimal configuration
- **🌐 System-Wide**: Automatic capture of all API requests, responses, and errors
- **📊 Per-Service Collections**: Each service gets its own MongoDB collection
- **🔍 Rich Metadata**: IP, user agent, headers, request body, response data, timing
- **🛡️ Security Logging**: Authentication events, unauthorized access, security violations
- **⚡ Performance Monitoring**: Response times, slow requests, database queries
- **🎯 Categorized Logs**: API, AUTH, SECURITY, BUSINESS, PERFORMANCE categories
- **🔒 Sensitive Data Protection**: Automatic redaction of sensitive headers and data
- **📈 Business Metrics**: User actions, feature usage, business events
- **⏰ Automatic Cleanup**: TTL (Time To Live) configuration for automatic log expiration and storage management

## 🚀 Quick Start

### 1. Install the Package

```bash
npm install nestjs-universal-logger-v2
```

### 2. Add to Your App Module

```typescript
import { UniversalLoggerStandaloneModule } from 'nestjs-universal-logger-v2';

@Module({
  imports: [
    // ... other imports
    UniversalLoggerStandaloneModule.forRoot({
      mongodb: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/your-db',
      },
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
      performance: {
        enabled: true,
      },
      security: {
        enabled: true,
      },
      business: {
        enabled: true,
      },
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

### 3. That's It! 🎉

The logger will automatically:
- ✅ Capture all HTTP requests and responses
- ✅ Log authentication events
- ✅ Track performance metrics
- ✅ Monitor security events
- ✅ Store everything in MongoDB collections

## 📋 Configuration Options

### MongoDB Configuration
```typescript
mongodb: {
  uri: string; // MongoDB connection string
}
```

### Logging Configuration
```typescript
logging: {
  level: 'info' | 'error' | 'warn' | 'debug' | 'verbose';
  serviceName: string; // Used for collection naming
  environment: string; // dev, staging, production
  version: string; // Your app version
  enableConsole: boolean; // Console logging
  enableFile: boolean; // File logging
}
```

### API Logging Configuration
```typescript
api: {
  enabled: boolean; // Enable API request/response logging
  logHeaders: boolean; // Log request headers
  logBody: boolean; // Log request body
  logQuery: boolean; // Log query parameters
  logResponses: boolean; // Log response data
  maxBodySize: number; // Max body size to log (bytes)
  slowRequestThreshold: number; // Slow request threshold (ms)
  sensitiveHeaders: string[]; // Headers to redact
}
```

### Performance Configuration
```typescript
performance: {
  enabled: boolean; // Enable performance monitoring
}
```

### Security Configuration
```typescript
security: {
  enabled: boolean; // Enable security event logging
}
```

### Business Configuration
```typescript
business: {
  enabled: boolean; // Enable business event logging
}
```

### TTL (Time To Live) Configuration
```typescript
ttl: {
  enabled: boolean; // Enable automatic document expiration
  expireAfterSeconds: number; // Time in seconds after which documents will be automatically deleted
  indexField: 'timestamp' | 'created_at' | 'updated_at'; // Field to use for TTL index (defaults to 'timestamp')
}
```

#### TTL Configuration Examples:
```typescript
// Delete logs after 30 days (2,592,000 seconds)
ttl: {
  enabled: true,
  expireAfterSeconds: 2592000,
  indexField: 'timestamp'
}

// Delete logs after 7 days (604,800 seconds)
ttl: {
  enabled: true,
  expireAfterSeconds: 604800,
  indexField: 'created_at'
}
```

#### TTL Best Practices:
- **Development**: Use shorter TTL periods (1-7 days) to save storage
- **Production**: Consider compliance requirements (30-90 days typical)
- **High-volume services**: Use shorter retention to manage storage costs
- **Critical systems**: Longer retention for audit trails and debugging
- **Index field**: Use 'timestamp' for log creation time, 'created_at' for document creation time

## 📊 Log Categories

The logger automatically categorizes logs into:

- **API_REQUEST**: Incoming HTTP requests
- **API_RESPONSE**: HTTP responses with timing
- **AUTH**: Authentication events (success/failure)
- **AUTH_ERROR**: Authentication failures
- **SECURITY**: Security violations and unauthorized access
- **EXCEPTION_FILTER**: All application errors
- **EXTERNAL_SERVICE_ERROR**: External API call errors
- **PERFORMANCE**: Slow requests and performance metrics
- **BUSINESS**: Custom business events

## 🔍 MongoDB Collections

Each service gets its own collection named: `logs_{serviceName}_{environment}`

Example: `logs_admin-panel_uat`

## 📝 Manual Logging (Optional)

You can also use the logger manually in your services:

```typescript
import { UniversalLoggerClient } from 'nestjs-universal-logger-v2';

@Injectable()
export class YourService {
  constructor(private readonly logger: UniversalLoggerClient) {}

  async someMethod() {
    // Basic logging
    await this.logger.log('User action performed', 'USER_ACTION');
    await this.logger.error('Something went wrong', 'Error stack trace', 'ERROR_CONTEXT');

    // Business logging
    await this.logger.logUserAction('profile_updated', 'user123', { changes: ['name', 'email'] });
    await this.logger.logPayment('user123', 99.99, 'USD', { paymentMethod: 'card' });

    // Performance logging
    await this.logger.logSlowOperation('database_query', 1500, 1000);

    // Security logging
    await this.logger.logSecurityViolation('suspicious_activity', '192.168.1.1');
  }
}
```

## 🛠️ Advanced Usage

### Service-Specific Configuration

```typescript
UniversalLoggerStandaloneModule.forService('payment-service', {
  // ... configuration
})
```

### Async Configuration

```typescript
UniversalLoggerStandaloneModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    mongodb: {
      uri: configService.get('MONGO_URI'),
    },
    logging: {
      serviceName: configService.get('SERVICE_NAME'),
      environment: configService.get('NODE_ENV'),
    },
  }),
  inject: [ConfigService],
})
```

## 📈 What Gets Logged Automatically

### API Requests
- ✅ HTTP method and URL
- ✅ Request headers (with sensitive data redacted)
- ✅ Request body (configurable size limit)
- ✅ Query parameters
- ✅ IP address and user agent
- ✅ Request timestamp

### API Responses
- ✅ Response status code
- ✅ Response headers
- ✅ Response body (configurable)
- ✅ Response time
- ✅ Request ID for correlation

### Authentication Events
- ✅ Login attempts (success/failure)
- ✅ Token validation
- ✅ Authorization checks
- ✅ User ID and session info

### Security Events
- ✅ Unauthorized access attempts
- ✅ Suspicious activities
- ✅ Security violations
- ✅ IP blacklisting events

### Performance Metrics
- ✅ Response times
- ✅ Slow request detection
- ✅ Database query timing
- ✅ External API call timing

### Error Handling
- ✅ All application exceptions
- ✅ Stack traces
- ✅ Error context
- ✅ Error categorization

## 🔧 Environment Variables

```bash
# MongoDB
MONGO_URI=mongodb://localhost:27017/your-db

# Service Configuration
SERVICE_NAME=your-service-name
NODE_ENV=development
APP_VERSION=1.0.0

# Logging
LOG_LEVEL=info
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=false
```

## 📊 Example Log Output

```json
{
  "timestamp": "2025-08-02T12:53:27.993Z",
  "level": "info",
  "service": "admin-panel",
  "environment": "uat",
  "version": "1.0.0",
  "category": "API_REQUEST",
  "context": "API_REQUEST",
  "message": "API Request Started: GET /admin/auditLog/list",
  "metadata": {
    "method": "GET",
    "url": "/admin/auditLog/list",
    "ip": "::1",
    "userAgent": "Mozilla/5.0...",
    "headers": { "authorization": "[REDACTED]" },
    "body": { "email": "user@example.com" },
    "requestId": "req_1754139207993_d28emip7h"
  }
}
```

## 🚀 Production Ready

- ✅ **High Performance**: Minimal overhead, async logging
- ✅ **Scalable**: Per-service collections, efficient indexing
- ✅ **Secure**: Sensitive data redaction, secure storage
- ✅ **Reliable**: Error handling, fallback mechanisms
- ✅ **Observable**: Rich metadata, correlation IDs
- ✅ **Storage Management**: TTL-based automatic cleanup, configurable retention periods
- ✅ **Cost Effective**: Automatic log expiration prevents unlimited storage growth

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the example configurations

---

**Made with ❤️ for the NestJS community**
