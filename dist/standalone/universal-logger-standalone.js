"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalLoggerStandalone = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const winston_1 = require("winston");
const uuid_1 = require("uuid");
const create_batch_writer_1 = require("./create-batch-writer");
const body_utils_1 = require("./body-utils");
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
let UniversalLoggerStandalone = class UniversalLoggerStandalone {
    /**
     * Initialize the Universal Logger with configuration and dependencies
     *
     * @param logModel - Mongoose model for log entries
     * @param config - Universal logger configuration including TTL settings
     * @param serviceName - Optional service name override
     * @param environment - Optional environment override
     * @param version - Optional version override
     */
    constructor(logModel, config, serviceName, environment, version) {
        this.batchInitPromise = null;
        this.logModel = logModel;
        this.config = config;
        this.serviceName = serviceName || config.logging?.serviceName || 'default-service';
        this.environment = environment || config.logging?.environment || 'development';
        this.version = version || config.logging?.version || '1.0.0';
        this.winstonLogger = (0, winston_1.createLogger)({
            level: config.logging?.level || 'info',
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
            defaultMeta: {
                service: this.serviceName,
                environment: this.environment,
                version: this.version
            },
            transports: this.createTransports(config.logging || {})
        });
        this.batchWriter = (0, create_batch_writer_1.createInitialBatchWriter)(logModel, config.batch);
        this.batchInitPromise = this.initializeBatchTransport();
    }
    /**
     * Which batch transport is active (`memory`, `redis`, or `none`).
     */
    getBatchTransport() {
        return this.batchWriter?.transport ?? 'none';
    }
    async initializeBatchTransport() {
        if (!this.batchWriter) {
            return;
        }
        const redisWriter = await (0, create_batch_writer_1.tryCreateRedisBatchWriter)(this.logModel, this.config.batch, this.serviceName);
        if (!redisWriter) {
            return;
        }
        // Drain memory buffer to Mongo, then switch to Redis
        const previous = this.batchWriter;
        await previous.flush();
        await previous.destroy();
        this.batchWriter = redisWriter;
    }
    createTransports(loggingConfig) {
        const transportArray = [];
        if (loggingConfig.enableConsole !== false) {
            transportArray.push(new winston_1.transports.Console({
                format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple())
            }));
        }
        if (loggingConfig.enableFile) {
            const logDir = loggingConfig.logDirectory || './logs';
            transportArray.push(new winston_1.transports.File({
                filename: `${logDir}/error.log`,
                level: 'error',
                maxsize: loggingConfig.maxFileSize || 5242880,
                maxFiles: loggingConfig.maxFiles || 5
            }), new winston_1.transports.File({
                filename: `${logDir}/combined.log`,
                maxsize: loggingConfig.maxFileSize || 5242880,
                maxFiles: loggingConfig.maxFiles || 5
            }));
        }
        return transportArray;
    }
    // Core logging methods
    async log(message, context, metadata) {
        this.winstonLogger.info(message, { context, ...metadata });
        await this.createLogEntry('info', message, metadata, context);
    }
    async error(message, trace, context, metadata) {
        this.winstonLogger.error(message, { trace, context, ...metadata });
        await this.createLogEntry('error', message, { trace, ...metadata }, context);
    }
    async warn(message, context, metadata) {
        this.winstonLogger.warn(message, { context, ...metadata });
        await this.createLogEntry('warn', message, metadata, context);
    }
    async debug(message, context, metadata) {
        this.winstonLogger.debug(message, { context, ...metadata });
        await this.createLogEntry('debug', message, metadata, context);
    }
    async verbose(message, context, metadata) {
        this.winstonLogger.verbose(message, { context, ...metadata });
        await this.createLogEntry('verbose', message, metadata, context);
    }
    // API Call Logging
    async logApiCall(req, res, duration, statusCode) {
        if (!this.config.api?.enabled)
            return;
        const apiConfig = this.config.api;
        const requestId = req.headers?.['x-request-id'] || (0, uuid_1.v4)();
        const apiCall = {
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
        const requestBodyMode = (0, body_utils_1.resolveRequestBodyMode)(apiConfig);
        if ((0, body_utils_1.shouldLogBody)(requestBodyMode, statusCode) && req.body !== undefined) {
            apiCall.body = (0, body_utils_1.prepareLogBody)(req.body, (0, body_utils_1.getMaxBodySize)(apiConfig));
        }
        if (apiConfig.logHeaders) {
            apiCall.headers = this.sanitizeHeaders(req.headers || {});
        }
        const responseBodyMode = (0, body_utils_1.resolveResponseBodyMode)(apiConfig);
        if ((0, body_utils_1.shouldLogBody)(responseBodyMode, statusCode)) {
            const responseBody = this.getResponseBody(res);
            if (responseBody !== undefined) {
                apiCall.response.body = (0, body_utils_1.prepareLogBody)(responseBody, (0, body_utils_1.getMaxBodySize)(apiConfig));
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
    async logPerformance(operation, duration, metadata) {
        if (!this.config.performance?.enabled)
            return;
        const level = duration > 1000 ? 'warn' : 'info';
        if (level === 'warn') {
            await this.warn(`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', {
                operation,
                duration,
                ...metadata
            });
        }
        else {
            await this.log(`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', {
                operation,
                duration,
                ...metadata
            });
        }
    }
    async logDatabaseQuery(query, duration, table, operation) {
        if (!this.config.performance?.enabled)
            return;
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
    async logExternalCall(url, method, duration, statusCode, response) {
        if (!this.config.performance?.enabled)
            return;
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
    async logSecurity(event, metadata) {
        if (!this.config.security?.enabled)
            return;
        await this.warn(`Security event: ${event}`, 'SECURITY', {
            event,
            ...metadata
        });
    }
    async logAuthEvent(event, userId, success = true, metadata) {
        if (!this.config.security?.enabled)
            return;
        const level = success ? 'info' : 'warn';
        if (level === 'warn') {
            await this.warn(`Auth event: ${event}`, 'AUTH', {
                event,
                userId,
                success,
                ...metadata
            });
        }
        else {
            await this.log(`Auth event: ${event}`, 'AUTH', {
                event,
                userId,
                success,
                ...metadata
            });
        }
    }
    // Business Logic Logging
    async logBusinessLogic(operation, data, context) {
        if (!this.config.business?.enabled)
            return;
        await this.log(`Business logic: ${operation}`, context, {
            operation,
            data,
            tags: ['business-logic']
        });
    }
    async logUserAction(action, userId, metadata) {
        if (!this.config.business?.enabled)
            return;
        await this.log(`User action: ${action}`, 'USER_ACTION', {
            action,
            userId,
            ...metadata
        });
    }
    async logFeatureUsage(feature, userId, metadata) {
        if (!this.config.business?.enabled)
            return;
        await this.log(`Feature usage: ${feature}`, 'FEATURE_USAGE', {
            feature,
            userId,
            ...metadata
        });
    }
    // System Metrics Logging
    async logSystemMetrics() {
        if (!this.config.performance?.enabled)
            return;
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
    async getLogs(query) {
        const filter = {};
        if (query.service)
            filter.service = query.service;
        if (query.level)
            filter.level = query.level;
        if (query.userId)
            filter.userId = query.userId;
        if (query.requestId)
            filter.requestId = query.requestId;
        if (query.severity)
            filter.severity = query.severity;
        if (query.tags)
            filter.tags = { $in: query.tags };
        if (query.path)
            filter['apiCall.path'] = query.path;
        if (query.method)
            filter['apiCall.method'] = query.method;
        if (query.statusCode)
            filter.statusCode = query.statusCode;
        if (query.startDate || query.endDate) {
            filter.timestamp = {};
            if (query.startDate)
                filter.timestamp.$gte = query.startDate;
            if (query.endDate)
                filter.timestamp.$lte = query.endDate;
        }
        return this.logModel
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(query.limit || 100)
            .skip(query.skip || 0)
            .exec();
    }
    async getLogStats(timeRange) {
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
    async getErrorTrends(days = 7) {
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
    async getTopErrors(limit = 10, days = 7) {
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
    async getPerformanceMetrics(hours = 24) {
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
    async cleanupOldLogs(daysToKeep = 30) {
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
    async flush() {
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
    async destroy() {
        if (this.batchInitPromise) {
            await this.batchInitPromise;
        }
        if (this.batchWriter) {
            await this.batchWriter.destroy();
            this.batchWriter = null;
        }
    }
    async createLogEntry(level, message, metadata, context) {
        const logEntry = {
            id: (0, uuid_1.v4)(),
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
            }
            else {
                await this.logModel.create(logEntry);
            }
        }
        catch (error) {
            console.error('Failed to save log to MongoDB:', error);
        }
        return logEntry;
    }
    getSeverityLevel(level) {
        switch (level) {
            case 'error': return 'critical';
            case 'warn': return 'high';
            case 'info': return 'medium';
            case 'debug':
            case 'verbose': return 'low';
            default: return 'medium';
        }
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = this.config.api?.sensitiveHeaders || ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach((header) => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    getResponseBody(res) {
        // Response body capture requires interceptor cooperation; placeholder for manual logApiCall.
        return undefined;
    }
};
exports.UniversalLoggerStandalone = UniversalLoggerStandalone;
exports.UniversalLoggerStandalone = UniversalLoggerStandalone = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_1.Model, Object, String, String, String])
], UniversalLoggerStandalone);
