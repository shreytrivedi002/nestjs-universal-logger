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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalLoggerService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const winston_1 = require("winston");
const uuid_1 = require("uuid");
const universal_logger_config_1 = require("./universal-logger.config");
let UniversalLoggerService = class UniversalLoggerService {
    constructor(logModel, config) {
        this.logModel = logModel;
        this.config = config;
        const loggingConfig = config.getLoggingConfig();
        this.serviceName = loggingConfig.serviceName;
        this.environment = loggingConfig.environment;
        this.version = loggingConfig.version;
        this.winstonLogger = (0, winston_1.createLogger)({
            level: loggingConfig.level,
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
            defaultMeta: {
                service: this.serviceName,
                environment: this.environment,
                version: this.version,
            },
            transports: this.createTransports(loggingConfig),
        });
    }
    createTransports(loggingConfig) {
        const loggerTransports = [];
        if (loggingConfig.enableConsole) {
            loggerTransports.push(new winston_1.transports.Console({
                format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple()),
            }));
        }
        if (loggingConfig.enableFile) {
            const logDir = loggingConfig.logDirectory;
            loggerTransports.push(new winston_1.transports.File({
                filename: `${logDir}/error.log`,
                level: 'error',
                maxsize: loggingConfig.maxFileSize,
                maxFiles: loggingConfig.maxFiles,
            }), new winston_1.transports.File({
                filename: `${logDir}/combined.log`,
                maxsize: loggingConfig.maxFileSize,
                maxFiles: loggingConfig.maxFiles,
            }));
        }
        return loggerTransports;
    }
    async createLogEntry(level, message, metadata, context) {
        const logEntry = {
            id: (0, uuid_1.v4)(),
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
        }
        catch (error) {
            console.error('Failed to save log to MongoDB:', error);
        }
        return logEntry;
    }
    getSeverityLevel(level) {
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
    log(message, context, metadata) {
        this.winstonLogger.info(message, { context, ...metadata });
        this.createLogEntry('info', message, metadata, context);
    }
    error(message, trace, context, metadata) {
        this.winstonLogger.error(message, { trace, context, ...metadata });
        this.createLogEntry('error', message, { trace, ...metadata }, context);
    }
    warn(message, context, metadata) {
        this.winstonLogger.warn(message, { context, ...metadata });
        this.createLogEntry('warn', message, metadata, context);
    }
    debug(message, context, metadata) {
        this.winstonLogger.debug(message, { context, ...metadata });
        this.createLogEntry('debug', message, metadata, context);
    }
    verbose(message, context, metadata) {
        this.winstonLogger.verbose(message, { context, ...metadata });
        this.createLogEntry('verbose', message, metadata, context);
    }
    logApiCall(req, res, duration, statusCode) {
        if (!this.config.isFeatureEnabled('api'))
            return;
        const apiConfig = this.config.getApiConfig();
        const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
        const apiCall = {
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
            apiCall.response.body = this.getResponseBody(res);
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
            this.warn(`Slow API request: ${req.method} ${req.originalUrl} took ${duration}ms`, 'PERFORMANCE', {
                requestId,
                duration,
                threshold: apiConfig.slowRequestThreshold,
            });
        }
    }
    logPerformance(operation, duration, metadata) {
        if (!this.config.isFeatureEnabled('performance'))
            return;
        const level = duration > 1000 ? 'warn' : 'log';
        this[level](`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', {
            operation,
            duration,
            ...metadata,
        });
    }
    logDatabaseQuery(query, duration, table, operation) {
        if (!this.config.isFeatureEnabled('performance'))
            return;
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
    logExternalCall(url, method, duration, statusCode, response) {
        if (!this.config.isFeatureEnabled('performance'))
            return;
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
    logSecurity(event, metadata) {
        if (!this.config.isFeatureEnabled('security'))
            return;
        this.warn(`Security event: ${event}`, 'SECURITY', {
            event,
            ...metadata,
        });
    }
    logAuthEvent(event, userId, success = true, metadata) {
        if (!this.config.isFeatureEnabled('security'))
            return;
        const level = success ? 'log' : 'warn';
        this[level](`Auth event: ${event}`, 'AUTH', {
            event,
            userId,
            success,
            ...metadata,
        });
    }
    logBusinessLogic(operation, data, context) {
        if (!this.config.isFeatureEnabled('business'))
            return;
        this.log(`Business logic: ${operation}`, context, {
            operation,
            data,
            tags: ['business-logic'],
        });
    }
    logUserAction(action, userId, metadata) {
        if (!this.config.isFeatureEnabled('business'))
            return;
        this.log(`User action: ${action}`, 'USER_ACTION', {
            action,
            userId,
            ...metadata,
        });
    }
    logFeatureUsage(feature, userId, metadata) {
        if (!this.config.isFeatureEnabled('business'))
            return;
        this.log(`Feature usage: ${feature}`, 'FEATURE_USAGE', {
            feature,
            userId,
            ...metadata,
        });
    }
    logSystemMetrics() {
        if (!this.config.isFeatureEnabled('performance'))
            return;
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
    async cleanupOldLogs(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await this.logModel.deleteMany({
            timestamp: { $lt: cutoffDate },
        });
        return result.deletedCount || 0;
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = this.config.getApiConfig().sensitiveHeaders;
        sensitiveHeaders.forEach((header) => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    isBodyLoggable(body, maxSize) {
        return JSON.stringify(body).length <= maxSize;
    }
    getResponseBody(_res) {
        return undefined;
    }
};
exports.UniversalLoggerService = UniversalLoggerService;
exports.UniversalLoggerService = UniversalLoggerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('LogEntry')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        universal_logger_config_1.UniversalLoggerConfig])
], UniversalLoggerService);
