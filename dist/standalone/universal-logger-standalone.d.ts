import { Model } from 'mongoose';
import { LogEntry, LogQuery, UniversalLoggerConfig } from '../interfaces/config.interface';
/**
 * UniversalLoggerStandalone - Main logging service for NestJS applications
 *
 * Provides comprehensive logging capabilities including:
 * - Automatic API request/response logging
 * - Security event tracking
 * - Performance monitoring
 * - Business metrics logging
 * - TTL-based automatic cleanup
 * - MongoDB storage with per-service collections
 * - Batched writes via Redis (when available) or in-memory buffer
 *
 * @example
 * ```typescript
 * // Basic usage in a service
 * constructor(private readonly logger: UniversalLoggerStandalone) {}
 *
 * async someMethod() {
 *   await this.logger.log('Operation completed', 'BUSINESS');
 *   await this.logger.logUserAction('profile_updated', 'user123');
 * }
 * ```
 */
export declare class UniversalLoggerStandalone {
    private readonly winstonLogger;
    private readonly config;
    private readonly serviceName;
    private readonly environment;
    private readonly version;
    private readonly logModel;
    private batchWriter;
    private batchInitPromise;
    /**
     * Initialize the Universal Logger with configuration and dependencies
     *
     * @param logModel - Mongoose model for log entries
     * @param config - Universal logger configuration including TTL settings
     * @param serviceName - Optional service name override
     * @param environment - Optional environment override
     * @param version - Optional version override
     */
    constructor(logModel: Model<LogEntry>, config: UniversalLoggerConfig, serviceName?: string, environment?: string, version?: string);
    /**
     * Which batch transport is active (`memory`, `redis`, or `none`).
     */
    getBatchTransport(): 'memory' | 'redis' | 'none';
    private initializeBatchTransport;
    private createTransports;
    log(message: string, context?: string, metadata?: Record<string, any>): Promise<void>;
    error(message: string, trace?: string, context?: string, metadata?: Record<string, any>): Promise<void>;
    warn(message: string, context?: string, metadata?: Record<string, any>): Promise<void>;
    debug(message: string, context?: string, metadata?: Record<string, any>): Promise<void>;
    verbose(message: string, context?: string, metadata?: Record<string, any>): Promise<void>;
    logApiCall(req: any, res: any, duration: number, statusCode: number): Promise<void>;
    logPerformance(operation: string, duration: number, metadata?: Record<string, any>): Promise<void>;
    logDatabaseQuery(query: string, duration: number, table?: string, operation?: string): Promise<void>;
    logExternalCall(url: string, method: string, duration: number, statusCode: number, response?: any): Promise<void>;
    logSecurity(event: string, metadata?: Record<string, any>): Promise<void>;
    logAuthEvent(event: string, userId?: string, success?: boolean, metadata?: Record<string, any>): Promise<void>;
    logBusinessLogic(operation: string, data: any, context?: string): Promise<void>;
    logUserAction(action: string, userId: string, metadata?: Record<string, any>): Promise<void>;
    logFeatureUsage(feature: string, userId?: string, metadata?: Record<string, any>): Promise<void>;
    logSystemMetrics(): Promise<void>;
    getLogs(query: LogQuery): Promise<LogEntry[]>;
    getLogStats(timeRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    getErrorTrends(days?: number): Promise<any>;
    getTopErrors(limit?: number, days?: number): Promise<any>;
    getPerformanceMetrics(hours?: number): Promise<any>;
    cleanupOldLogs(daysToKeep?: number): Promise<number>;
    /**
     * Flush any buffered MongoDB writes. Call on shutdown.
     */
    flush(): Promise<void>;
    /**
     * Stop the batch timer and flush remaining logs.
     */
    destroy(): Promise<void>;
    private createLogEntry;
    private getSeverityLevel;
    private sanitizeHeaders;
    private getResponseBody;
}
