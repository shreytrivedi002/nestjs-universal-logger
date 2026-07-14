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
        logBody?: boolean;
        logQuery?: boolean;
        sensitiveHeaders?: string[];
        excludePaths?: string[];
        includePaths?: string[];
        maxBodySize?: number;
        slowRequestThreshold?: number;
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
