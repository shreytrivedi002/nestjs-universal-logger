import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { createLogger, format, transports, Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { LogEntry, LogQuery, UniversalLoggerConfig } from '../interfaces/config.interface';
import { LogBatchSink } from './log-batch-sink';
import { createInitialBatchWriter, tryCreateRedisBatchWriter } from './create-batch-writer';
import { getMaxBodySize, prepareLogBody, resolveRequestBodyMode, resolveResponseBodyMode, shouldLogBody } from './body-utils';

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
@Injectable()
export class UniversalLoggerStandalone {
  private readonly winstonLogger: Logger;
  private readonly config: UniversalLoggerConfig;
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly version: string;
  private readonly logModel: Model<LogEntry>;
  private batchWriter: LogBatchSink | null;
  private batchInitPromise: Promise<void> | null = null;

  /**
   * Initialize the Universal Logger with configuration and dependencies
   * 
   * @param logModel - Mongoose model for log entries
   * @param config - Universal logger configuration including TTL settings
   * @param serviceName - Optional service name override
   * @param environment - Optional environment override
   * @param version - Optional version override
   */
  constructor(
    logModel: Model<LogEntry>,
    config: UniversalLoggerConfig,
    serviceName?: string,
    environment?: string,
    version?: string
  ) {
    this.logModel = logModel;
    this.config = config;
    this.serviceName = serviceName || config.logging?.serviceName || 'default-service';
    this.environment = environment || config.logging?.environment || 'development';
    this.version = version || config.logging?.version || '1.0.0';

    this.winstonLogger = createLogger({
      level: config.logging?.level || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: this.environment,
        version: this.version
      },
      transports: this.createTransports(config.logging || {})
    });

    this.batchWriter = createInitialBatchWriter(logModel, config.batch);
    this.batchInitPromise = this.initializeBatchTransport();
  }

  /**
   * Which batch transport is active (`memory`, `redis`, or `none`).
   */
  getBatchTransport(): 'memory' | 'redis' | 'none' {
    return this.batchWriter?.transport ?? 'none';
  }

  private async initializeBatchTransport(): Promise<void> {
    if (!this.batchWriter) {
      return;
    }

    const redisWriter = await tryCreateRedisBatchWriter(
      this.logModel,
      this.config.batch,
      this.serviceName,
    );

    if (!redisWriter) {
      return;
    }

    // Drain memory buffer to Mongo, then switch to Redis
    const previous = this.batchWriter;
    await previous.flush();
    await previous.destroy();
    this.batchWriter = redisWriter;
  }

  private createTransports(loggingConfig: any) {
    const transportArray: any[] = [];

    if (loggingConfig.enableConsole !== false) {
      transportArray.push(
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          )
        })
      );
    }

    if (loggingConfig.enableFile) {
      const logDir = loggingConfig.logDirectory || './logs';
      transportArray.push(
        new transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
          maxsize: loggingConfig.maxFileSize || 5242880,
          maxFiles: loggingConfig.maxFiles || 5
        }),
        new transports.File({
          filename: `${logDir}/combined.log`,
          maxsize: loggingConfig.maxFileSize || 5242880,
          maxFiles: loggingConfig.maxFiles || 5
        })
      );
    }

    return transportArray;
  }

  // Core logging methods
  async log(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    this.winstonLogger.info(message, { context, ...metadata });
    await this.createLogEntry('info', message, metadata, context);
  }

  async error(message: string, trace?: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    this.winstonLogger.error(message, { trace, context, ...metadata });
    await this.createLogEntry('error', message, { trace, ...metadata }, context);
  }

  async warn(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    this.winstonLogger.warn(message, { context, ...metadata });
    await this.createLogEntry('warn', message, metadata, context);
  }

  async debug(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    this.winstonLogger.debug(message, { context, ...metadata });
    await this.createLogEntry('debug', message, metadata, context);
  }

  async verbose(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    this.winstonLogger.verbose(message, { context, ...metadata });
    await this.createLogEntry('verbose', message, metadata, context);
  }

  // API Call Logging
  async logApiCall(req: any, res: any, duration: number, statusCode: number): Promise<void> {
    if (!this.config.api?.enabled) return;

    const apiConfig = this.config.api;
    const requestId = req.headers?.['x-request-id'] || uuidv4();

    const apiCall: any = {
      method: req.method,
      path: req.originalUrl,
      response: {
        statusCode,
        headers: apiConfig.logHeaders ? this.sanitizeHeaders(res.getHeaders?.() || {}) : undefined
      }
    };

    if (apiConfig.logQuery && req.query) {
      apiCall.query = req.query;
    }

    const requestBodyMode = resolveRequestBodyMode(apiConfig);
    if (shouldLogBody(requestBodyMode, statusCode) && req.body !== undefined) {
      apiCall.body = prepareLogBody(req.body, getMaxBodySize(apiConfig));
    }

    if (apiConfig.logHeaders) {
      apiCall.headers = this.sanitizeHeaders(req.headers || {});
    }

    const responseBodyMode = resolveResponseBodyMode(apiConfig);
    if (shouldLogBody(responseBodyMode, statusCode)) {
      const responseBody = this.getResponseBody(res);
      if (responseBody !== undefined) {
        apiCall.response.body = prepareLogBody(responseBody, getMaxBodySize(apiConfig));
      }
    }

    await this.log(`API Call: ${req.method} ${req.originalUrl}`, 'API', {
      requestId,
      duration,
      apiCall,
      userId: req.user?.id,
      sessionId: req.session?.id,
      ip: req.ip,
      userAgent: req.headers?.['user-agent']
    });

    if (duration > (apiConfig.slowRequestThreshold || 1000)) {
      await this.warn(`Slow API request: ${req.method} ${req.originalUrl} took ${duration}ms`, 'PERFORMANCE', {
        requestId,
        duration,
        threshold: apiConfig.slowRequestThreshold || 1000
      });
    }
  }

  // Performance Logging
  async logPerformance(operation: string, duration: number, metadata?: Record<string, any>): Promise<void> {
    if (!this.config.performance?.enabled) return;

    const level = duration > 1000 ? 'warn' : 'info';
    if (level === 'warn') {
      await this.warn(`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', {
        operation,
        duration,
        ...metadata
      });
    } else {
      await this.log(`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', {
        operation,
        duration,
        ...metadata
      });
    }
  }

  async logDatabaseQuery(query: string, duration: number, table?: string, operation?: string): Promise<void> {
    if (!this.config.performance?.enabled) return;

    const performanceData = {
      databaseQueries: [{
        query,
        duration,
        table,
        operation
      }]
    };

    await this.log(`Database query executed in ${duration}ms`, 'DATABASE', {
      query,
      duration,
      table,
      operation,
      performance: performanceData
    });
  }

  async logExternalCall(url: string, method: string, duration: number, statusCode: number, response?: any): Promise<void> {
    if (!this.config.performance?.enabled) return;

    const performanceData = {
      externalCalls: [{
        url,
        method,
        duration,
        statusCode
      }]
    };

    await this.log(`External call: ${method} ${url}`, 'EXTERNAL', {
      url,
      method,
      duration,
      statusCode,
      response,
      performance: performanceData
    });
  }

  // Security Logging
  async logSecurity(event: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.config.security?.enabled) return;

    await this.warn(`Security event: ${event}`, 'SECURITY', {
      event,
      ...metadata
    });
  }

  async logAuthEvent(event: string, userId?: string, success: boolean = true, metadata?: Record<string, any>): Promise<void> {
    if (!this.config.security?.enabled) return;

    const level = success ? 'info' : 'warn';
    if (level === 'warn') {
      await this.warn(`Auth event: ${event}`, 'AUTH', {
        event,
        userId,
        success,
        ...metadata
      });
    } else {
      await this.log(`Auth event: ${event}`, 'AUTH', {
        event,
        userId,
        success,
        ...metadata
      });
    }
  }

  // Business Logic Logging
  async logBusinessLogic(operation: string, data: any, context?: string): Promise<void> {
    if (!this.config.business?.enabled) return;

    await this.log(`Business logic: ${operation}`, context, {
      operation,
      data,
      tags: ['business-logic']
    });
  }

  async logUserAction(action: string, userId: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.config.business?.enabled) return;

    await this.log(`User action: ${action}`, 'USER_ACTION', {
      action,
      userId,
      ...metadata
    });
  }

  async logFeatureUsage(feature: string, userId?: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.config.business?.enabled) return;

    await this.log(`Feature usage: ${feature}`, 'FEATURE_USAGE', {
      feature,
      userId,
      ...metadata
    });
  }

  // System Metrics Logging
  async logSystemMetrics(): Promise<void> {
    if (!this.config.performance?.enabled) return;

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const performanceData = {
      memoryUsage: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    };

    await this.debug('System metrics', 'SYSTEM', {
      performance: performanceData
    });
  }

  // Query methods
  async getLogs(query: LogQuery): Promise<LogEntry[]> {
    const filter: any = {};

    if (query.service) filter.service = query.service;
    if (query.level) filter.level = query.level;
    if (query.userId) filter.userId = query.userId;
    if (query.requestId) filter.requestId = query.requestId;
    if (query.severity) filter.severity = query.severity;
    if (query.tags) filter.tags = { $in: query.tags };
    if (query.path) filter['apiCall.path'] = query.path;
    if (query.method) filter['apiCall.method'] = query.method;
    if (query.statusCode) filter.statusCode = query.statusCode;
    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) filter.timestamp.$gte = query.startDate;
      if (query.endDate) filter.timestamp.$lte = query.endDate;
    }

    return this.logModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(query.limit || 100)
      .skip(query.skip || 0)
      .exec();
  }

  async getLogStats(timeRange: { start: Date; end: Date }): Promise<any> {
    return this.logModel.aggregate([
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $group: {
          _id: {
            level: '$level',
            service: '$service',
            severity: '$severity'
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          maxDuration: { $max: '$duration' },
          minDuration: { $min: '$duration' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }

  async getErrorTrends(days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.logModel.aggregate([
      {
        $match: {
          level: 'error',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            service: '$service'
          },
          errorCount: { $sum: 1 },
          uniqueErrors: { $addToSet: '$message' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
  }

  async getTopErrors(limit: number = 10, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.logModel.aggregate([
      {
        $match: {
          level: 'error',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$message',
          count: { $sum: 1 },
          services: { $addToSet: '$service' },
          lastOccurrence: { $max: '$timestamp' },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      }
    ]);
  }

  async getPerformanceMetrics(hours: number = 24): Promise<any> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return this.logModel.aggregate([
      {
        $match: {
          duration: { $exists: true, $ne: null },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            service: '$service',
            path: '$apiCall.path',
            method: '$apiCall.method'
          },
          avgDuration: { $avg: '$duration' },
          maxDuration: { $max: '$duration' },
          minDuration: { $min: '$duration' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { avgDuration: -1 }
      }
    ]);
  }

  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.logModel.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }

  // Helper methods
  /**
   * Flush any buffered MongoDB writes. Call on shutdown.
   */
  async flush(): Promise<void> {
    if (this.batchInitPromise) {
      await this.batchInitPromise;
    }
    if (this.batchWriter) {
      await this.batchWriter.flush();
    }
  }

  /**
   * Stop the batch timer and flush remaining logs.
   */
  async destroy(): Promise<void> {
    if (this.batchInitPromise) {
      await this.batchInitPromise;
    }
    if (this.batchWriter) {
      await this.batchWriter.destroy();
      this.batchWriter = null;
    }
  }

  private async createLogEntry(
    level: LogEntry['level'],
    message: string,
    metadata?: Record<string, any>,
    context?: string
  ): Promise<LogEntry> {
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      service: this.serviceName,
      module: context || 'unknown',
      message,
      metadata,
      environment: this.environment,
      version: this.version,
      tags: metadata?.['tags'] || [],
      severity: this.getSeverityLevel(level)
    };

    try {
      if (this.batchWriter) {
        this.batchWriter.enqueue(logEntry);
      } else {
        await this.logModel.create(logEntry);
      }
    } catch (error) {
      console.error('Failed to save log to MongoDB:', error);
    }

    return logEntry;
  }

  private getSeverityLevel(level: LogEntry['level']): LogEntry['severity'] {
    switch (level) {
      case 'error': return 'critical';
      case 'warn': return 'high';
      case 'info': return 'medium';
      case 'debug':
      case 'verbose': return 'low';
      default: return 'medium';
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = this.config.api?.sensitiveHeaders || ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach((header: string) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getResponseBody(res: any): any {
    // Response body capture requires interceptor cooperation; placeholder for manual logApiCall.
    return undefined;
  }
}
