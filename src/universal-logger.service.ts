import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createLogger, format, transports, Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { LogEntry, LogQuery } from './interfaces/config.interface';
import { UniversalLoggerConfig } from './universal-logger.config';

@Injectable()
export class UniversalLoggerService implements NestLoggerService {
  private readonly winstonLogger: Logger;
  private readonly config: UniversalLoggerConfig;
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly version: string;

  constructor(
    @InjectModel('LogEntry') private readonly logModel: Model<LogEntry>,
    config: UniversalLoggerConfig,
  ) {
    this.config = config;
    const loggingConfig = config.getLoggingConfig();
    this.serviceName = loggingConfig.serviceName;
    this.environment = loggingConfig.environment;
    this.version = loggingConfig.version;

    this.winstonLogger = createLogger({
      level: loggingConfig.level,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: this.environment,
        version: this.version,
      },
      transports: this.createTransports(loggingConfig),
    });
  }

  private createTransports(loggingConfig: ReturnType<UniversalLoggerConfig['getLoggingConfig']>) {
    const loggerTransports: any[] = [];

    if (loggingConfig.enableConsole) {
      loggerTransports.push(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
      );
    }

    if (loggingConfig.enableFile) {
      const logDir = loggingConfig.logDirectory;
      loggerTransports.push(
        new transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
          maxsize: loggingConfig.maxFileSize,
          maxFiles: loggingConfig.maxFiles,
        }),
        new transports.File({
          filename: `${logDir}/combined.log`,
          maxsize: loggingConfig.maxFileSize,
          maxFiles: loggingConfig.maxFiles,
        }),
      );
    }

    return loggerTransports;
  }

  private async createLogEntry(
    level: LogEntry['level'],
    message: string,
    metadata?: Record<string, any>,
    context?: string,
  ): Promise<LogEntry> {
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      service: this.serviceName,
      module: context,
      message,
      metadata,
      environment: this.environment,
      version: this.version,
      tags: metadata?.tags || [],
      severity: this.getSeverityLevel(level),
    };

    try {
      await this.logModel.create(logEntry);
    } catch (error) {
      console.error('Failed to save log to MongoDB:', error);
    }

    return logEntry;
  }

  private getSeverityLevel(level: string): LogEntry['severity'] {
    switch (level) {
      case 'error':
        return 'critical';
      case 'warn':
        return 'high';
      case 'info':
        return 'medium';
      case 'debug':
      case 'verbose':
        return 'low';
      default:
        return 'medium';
    }
  }

  log(message: string, context?: string, metadata?: Record<string, any>): void {
    this.winstonLogger.info(message, { context, ...metadata });
    this.createLogEntry('info', message, metadata, context);
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    this.winstonLogger.error(message, { trace, context, ...metadata });
    this.createLogEntry('error', message, { trace, ...metadata }, context);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.winstonLogger.warn(message, { context, ...metadata });
    this.createLogEntry('warn', message, metadata, context);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.winstonLogger.debug(message, { context, ...metadata });
    this.createLogEntry('debug', message, metadata, context);
  }

  verbose(message: string, context?: string, metadata?: Record<string, any>): void {
    this.winstonLogger.verbose(message, { context, ...metadata });
    this.createLogEntry('verbose', message, metadata, context);
  }

  logApiCall(req: any, res: any, duration: number, statusCode: number): void {
    if (!this.config.isFeatureEnabled('api')) return;

    const apiConfig = this.config.getApiConfig();
    const requestId = req.headers['x-request-id'] || uuidv4();
    const apiCall: LogEntry['apiCall'] = {
      method: req.method,
      path: req.originalUrl,
      response: {
        statusCode,
        headers: apiConfig.logHeaders
          ? this.sanitizeHeaders(res.getHeaders())
          : undefined,
      },
    };

    if (apiConfig.logQuery && req.query) {
      apiCall.query = req.query;
    }

    if (apiConfig.logBody && req.body && this.isBodyLoggable(req.body, apiConfig.maxBodySize)) {
      apiCall.body = req.body;
    }

    if (apiConfig.logHeaders) {
      apiCall.headers = this.sanitizeHeaders(req.headers);
    }

    if (statusCode >= 400 || apiConfig.logResponses) {
      apiCall.response!.body = this.getResponseBody(res);
    }

    this.log(`API Call: ${req.method} ${req.originalUrl}`, 'API', {
      requestId,
      duration,
      apiCall,
      userId: req.user?.id,
      sessionId: req.session?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (duration > apiConfig.slowRequestThreshold) {
      this.warn(
        `Slow API request: ${req.method} ${req.originalUrl} took ${duration}ms`,
        'PERFORMANCE',
        {
          requestId,
          duration,
          threshold: apiConfig.slowRequestThreshold,
        },
      );
    }
  }

  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.config.isFeatureEnabled('performance')) return;

    const level = duration > 1000 ? 'warn' : 'log';
    this[level](`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', {
      operation,
      duration,
      ...metadata,
    });
  }

  logDatabaseQuery(
    query: string,
    duration: number,
    table?: string,
    operation?: string,
  ): void {
    if (!this.config.isFeatureEnabled('performance')) return;

    this.log(`Database query executed in ${duration}ms`, 'DATABASE', {
      query,
      duration,
      table,
      operation,
      performance: {
        databaseQueries: [{ query, duration, table, operation }],
      },
    });
  }

  logExternalCall(
    url: string,
    method: string,
    duration: number,
    statusCode: number,
    response?: any,
  ): void {
    if (!this.config.isFeatureEnabled('performance')) return;

    this.log(`External call: ${method} ${url}`, 'EXTERNAL', {
      url,
      method,
      duration,
      statusCode,
      response,
      performance: {
        externalCalls: [{ url, method, duration, statusCode }],
      },
    });
  }

  logSecurity(event: string, metadata?: Record<string, any>): void {
    if (!this.config.isFeatureEnabled('security')) return;

    this.warn(`Security event: ${event}`, 'SECURITY', {
      event,
      ...metadata,
    });
  }

  logAuthEvent(
    event: string,
    userId?: string,
    success = true,
    metadata?: Record<string, any>,
  ): void {
    if (!this.config.isFeatureEnabled('security')) return;

    const level = success ? 'log' : 'warn';
    this[level](`Auth event: ${event}`, 'AUTH', {
      event,
      userId,
      success,
      ...metadata,
    });
  }

  logBusinessLogic(operation: string, data: any, context?: string): void {
    if (!this.config.isFeatureEnabled('business')) return;

    this.log(`Business logic: ${operation}`, context, {
      operation,
      data,
      tags: ['business-logic'],
    });
  }

  logUserAction(action: string, userId: string, metadata?: Record<string, any>): void {
    if (!this.config.isFeatureEnabled('business')) return;

    this.log(`User action: ${action}`, 'USER_ACTION', {
      action,
      userId,
      ...metadata,
    });
  }

  logFeatureUsage(feature: string, userId?: string, metadata?: Record<string, any>): void {
    if (!this.config.isFeatureEnabled('business')) return;

    this.log(`Feature usage: ${feature}`, 'FEATURE_USAGE', {
      feature,
      userId,
      ...metadata,
    });
  }

  logSystemMetrics(): void {
    if (!this.config.isFeatureEnabled('performance')) return;

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.debug('System metrics', 'SYSTEM', {
      performance: {
        memoryUsage: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
    });
  }

  async getLogs(query: LogQuery): Promise<LogEntry[]> {
    const filter: Record<string, any> = {};

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
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
        },
      },
      {
        $group: {
          _id: {
            level: '$level',
            service: '$service',
            severity: '$severity',
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          maxDuration: { $max: '$duration' },
          minDuration: { $min: '$duration' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
  }

  async cleanupOldLogs(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.logModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = this.config.getApiConfig().sensitiveHeaders;

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private isBodyLoggable(body: any, maxSize: number): boolean {
    return JSON.stringify(body).length <= maxSize;
  }

  private getResponseBody(_res: any): any {
    return undefined;
  }
}
