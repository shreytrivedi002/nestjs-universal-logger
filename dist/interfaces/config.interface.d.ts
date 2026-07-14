export interface UniversalLoggerConfig {
    mongodb?: {
        uri?: string;
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        options?: {
            useNewUrlParser?: boolean;
            useUnifiedTopology?: boolean;
            maxPoolSize?: number;
            serverSelectionTimeoutMS?: number;
            socketTimeoutMS?: number;
        };
    };
    logging?: {
        level?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
        serviceName?: string;
        environment?: string;
        version?: string;
        enableConsole?: boolean;
        enableFile?: boolean;
        logDirectory?: string;
        maxFileSize?: number;
        maxFiles?: number;
    };
    api?: {
        enabled?: boolean;
        logRequests?: boolean;
        logResponses?: boolean;
        logHeaders?: boolean;
        /**
         * Legacy flag. Prefer `logBodyMode`.
         * - true  → same as logBodyMode: 'all'
         * - false → same as logBodyMode: 'none'
         */
        logBody?: boolean;
        /**
         * Controls when request/response bodies are attached to API logs.
         * - 'none'   → never log bodies
         * - 'all'    → log bodies on all requests (still size-capped)
         * - 'errors' → log bodies only for failed requests (status >= 400)
         * @default 'errors'
         */
        logBodyMode?: 'none' | 'all' | 'errors';
        /**
         * Same modes as `logBodyMode`, applied to response bodies.
         * Falls back to `logBodyMode` when unset.
         */
        logResponseBodyMode?: 'none' | 'all' | 'errors';
        logQuery?: boolean;
        sensitiveHeaders?: string[];
        excludePaths?: string[];
        includePaths?: string[];
        /** Max serialized body size in bytes. Larger bodies are omitted. @default 1024 */
        maxBodySize?: number;
        slowRequestThreshold?: number;
    };
    /**
     * Batching for MongoDB writes.
     * Prefer Redis when configured and reachable; otherwise use an in-memory buffer.
     */
    batch?: {
        /** Enable buffered insertMany writes. @default true */
        enabled?: boolean;
        /** Flush when buffer reaches this many docs. @default 100 */
        maxBatchSize?: number;
        /** Flush interval in milliseconds. @default 250 */
        flushIntervalMs?: number;
        /**
         * Hard cap on buffered docs. When full, oldest entries are dropped
         * so memory stays bounded. @default 2000
         */
        maxBufferSize?: number;
        /**
         * Buffer transport:
         * - 'auto'   → use Redis when `redis` config is set and connectable, else memory (default)
         * - 'redis'  → try Redis; fall back to memory if unavailable
         * - 'memory' → always use in-process memory buffer
         */
        transport?: 'auto' | 'redis' | 'memory';
        /**
         * Redis connection used for the batch buffer (optional).
         * Requires the `ioredis` package to be installed in the host app.
         */
        redis?: {
            /** Full connection URL, e.g. redis://localhost:6379/0 */
            url?: string;
            host?: string;
            port?: number;
            password?: string;
            username?: string;
            db?: number;
            /** Key prefix for the log list. @default 'nestjs-universal-logger' */
            keyPrefix?: string;
            /** Connect/ping timeout in ms. @default 2000 */
            connectTimeoutMs?: number;
        };
    };
    performance?: {
        enabled?: boolean;
        trackDatabaseQueries?: boolean;
        trackExternalCalls?: boolean;
        trackMemoryUsage?: boolean;
        trackCPUUsage?: boolean;
    };
    security?: {
        enabled?: boolean;
        trackAuthEvents?: boolean;
        trackFailedLogins?: boolean;
        trackSuspiciousActivity?: boolean;
        ipWhitelist?: string[];
        ipBlacklist?: string[];
    };
    business?: {
        enabled?: boolean;
        trackUserActions?: boolean;
        trackFeatureUsage?: boolean;
        trackConversions?: boolean;
        customEvents?: string[];
    };
    dashboard?: {
        enabled?: boolean;
        port?: number;
        host?: string;
        auth?: {
            enabled?: boolean;
            username?: string;
            password?: string;
        };
    };
    retention?: {
        enabled?: boolean;
        daysToKeep?: number;
        maxSizeGB?: number;
        archiveOldLogs?: boolean;
        archivePath?: string;
    };
    /**
     * TTL (Time To Live) Configuration for automatic log cleanup
     *
     * Configures MongoDB TTL indexes to automatically delete log documents after a specified time period.
     * This helps manage storage space and maintain database performance by removing old logs.
     *
     * @example
     * ```typescript
     * ttl: {
     *   enabled: true,
     *   expireAfterSeconds: 2592000, // 30 days
     *   indexField: 'timestamp'
     * }
     * ```
     */
    ttl?: {
        /** Enable automatic document expiration using MongoDB TTL indexes */
        enabled?: boolean;
        /** Time in seconds after which documents will be automatically deleted by MongoDB */
        expireAfterSeconds?: number;
        /** Field to use for TTL index - defaults to 'timestamp' if not specified */
        indexField?: 'timestamp' | 'created_at' | 'updated_at';
    };
    export?: {
        enabled?: boolean;
        formats?: ('json' | 'csv' | 'excel')[];
        maxExportSize?: number;
        exportPath?: string;
    };
    alerts?: {
        enabled?: boolean;
        errorRateThreshold?: number;
        responseTimeThreshold?: number;
        memoryUsageThreshold?: number;
        webhookUrl?: string;
        email?: {
            enabled?: boolean;
            smtp?: {
                host?: string;
                port?: number;
                secure?: boolean;
                auth?: {
                    user?: string;
                    pass?: string;
                };
            };
            recipients?: string[];
        };
    };
}
export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    service: string;
    module?: string;
    method?: string;
    message: string;
    trace?: string;
    metadata?: Record<string, any>;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    duration?: number;
    statusCode?: number;
    errorCode?: string;
    tags?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    environment?: string;
    version?: string;
    apiCall?: {
        method?: string;
        path?: string;
        query?: Record<string, any>;
        body?: any;
        headers?: Record<string, any>;
        response?: {
            statusCode?: number;
            body?: any;
            headers?: Record<string, any>;
        };
    };
    performance?: {
        memoryUsage?: {
            heapUsed?: number;
            heapTotal?: number;
            external?: number;
            rss?: number;
        };
        cpuUsage?: {
            user?: number;
            system?: number;
        };
        databaseQueries?: Array<{
            query?: string;
            duration?: number;
            table?: string;
            operation?: string;
        }>;
        externalCalls?: Array<{
            url?: string;
            method?: string;
            duration?: number;
            statusCode?: number;
        }>;
    };
}
export interface LogQuery {
    service?: string;
    level?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    requestId?: string;
    tags?: string[];
    severity?: string;
    limit?: number;
    skip?: number;
    path?: string;
    method?: string;
    statusCode?: number;
}
