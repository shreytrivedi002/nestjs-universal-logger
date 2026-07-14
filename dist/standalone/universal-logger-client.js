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
exports.UniversalLoggerClient = void 0;
const common_1 = require("@nestjs/common");
const universal_logger_factory_1 = require("./universal-logger-factory");
let UniversalLoggerClient = class UniversalLoggerClient {
    constructor(factory, serviceName = 'default-service', environment, version) {
        this.factory = factory;
        this.logger = this.factory.createLogger(serviceName, environment, version);
    }
    // Core logging methods
    async log(message, context, metadata) {
        await this.logger.log(message, context, metadata);
    }
    async error(message, trace, context, metadata) {
        await this.logger.error(message, trace, context, metadata);
    }
    async warn(message, context, metadata) {
        await this.logger.warn(message, context, metadata);
    }
    async debug(message, context, metadata) {
        await this.logger.debug(message, context, metadata);
    }
    async verbose(message, context, metadata) {
        await this.logger.verbose(message, context, metadata);
    }
    // API Call Logging
    async logApiCall(req, res, duration, statusCode) {
        await this.logger.logApiCall(req, res, duration, statusCode);
    }
    // Performance Logging
    async logPerformance(operation, duration, metadata) {
        await this.logger.logPerformance(operation, duration, metadata);
    }
    async logDatabaseQuery(query, duration, table, operation) {
        await this.logger.logDatabaseQuery(query, duration, table, operation);
    }
    async logExternalCall(url, method, duration, statusCode, response) {
        await this.logger.logExternalCall(url, method, duration, statusCode, response);
    }
    // Security Logging
    async logSecurity(event, metadata) {
        await this.logger.logSecurity(event, metadata);
    }
    async logAuthEvent(event, userId, success = true, metadata) {
        await this.logger.logAuthEvent(event, userId, success, metadata);
    }
    // Business Logic Logging
    async logBusinessLogic(operation, data, context) {
        await this.logger.logBusinessLogic(operation, data, context);
    }
    async logUserAction(action, userId, metadata) {
        await this.logger.logUserAction(action, userId, metadata);
    }
    async logFeatureUsage(feature, userId, metadata) {
        await this.logger.logFeatureUsage(feature, userId, metadata);
    }
    // System Metrics Logging
    async logSystemMetrics() {
        await this.logger.logSystemMetrics();
    }
    // Query methods
    async getLogs(query) {
        return this.logger.getLogs(query);
    }
    async getLogStats(timeRange) {
        return this.logger.getLogStats(timeRange);
    }
    async getErrorTrends(days = 7) {
        return this.logger.getErrorTrends(days);
    }
    async getTopErrors(limit = 10, days = 7) {
        return this.logger.getTopErrors(limit, days);
    }
    async getPerformanceMetrics(hours = 24) {
        return this.logger.getPerformanceMetrics(hours);
    }
    async cleanupOldLogs(daysToKeep = 30) {
        return this.logger.cleanupOldLogs(daysToKeep);
    }
    // Convenience methods for common logging patterns
    async logUserLogin(userId, success, metadata) {
        await this.logAuthEvent('login', userId, success, metadata);
    }
    async logUserLogout(userId, metadata) {
        await this.logAuthEvent('logout', userId, true, metadata);
    }
    async logUserRegistration(userId, metadata) {
        await this.logBusinessLogic('User Registration', { userId, ...metadata });
        await this.logUserAction('user_registered', userId, metadata);
    }
    async logUserProfileUpdate(userId, changes) {
        await this.logUserAction('profile_updated', userId, { changes });
    }
    async logPayment(userId, amount, currency, metadata) {
        await this.logBusinessLogic('Payment', { userId, amount, currency, ...metadata });
        await this.logUserAction('payment_made', userId, { amount, currency, ...metadata });
    }
    async logErrorWithContext(error, context, metadata) {
        await this.error(error.message, error.stack, context, {
            errorName: error.name,
            errorCode: error.code,
            ...metadata
        });
    }
    async logSlowOperation(operation, duration, threshold = 1000, metadata) {
        if (duration > threshold) {
            await this.warn(`Slow operation: ${operation} took ${duration}ms`, 'PERFORMANCE', {
                operation,
                duration,
                threshold,
                ...metadata
            });
        }
        else {
            await this.logPerformance(operation, duration, metadata);
        }
    }
    async logDatabaseOperation(operation, table, duration, query) {
        await this.logger.logDatabaseQuery(query || operation, duration, table, operation);
    }
    async logExternalApiCall(url, method, duration, statusCode, response) {
        await this.logger.logExternalCall(url, method, duration, statusCode, response);
    }
    async logSecurityViolation(event, ip, userAgent, metadata) {
        await this.logger.logSecurity(event, {
            ip,
            userAgent,
            ...metadata
        });
    }
    async logBusinessMetric(metric, value, metadata) {
        await this.logBusinessLogic(`Business Metric: ${metric}`, {
            metric,
            value,
            ...metadata
        });
    }
    async logFeatureAccess(feature, userId, success, metadata) {
        await this.logFeatureUsage(feature, userId, {
            success,
            ...metadata
        });
    }
};
exports.UniversalLoggerClient = UniversalLoggerClient;
exports.UniversalLoggerClient = UniversalLoggerClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [universal_logger_factory_1.UniversalLoggerFactory, String, String, String])
], UniversalLoggerClient);
