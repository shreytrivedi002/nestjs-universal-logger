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
exports.UniversalLoggerInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const perf_hooks_1 = require("perf_hooks");
const universal_logger_client_1 = require("./universal-logger-client");
let UniversalLoggerInterceptor = class UniversalLoggerInterceptor {
    constructor(logger) {
        this.logger = logger;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = perf_hooks_1.performance.now();
        // Generate request ID if not present
        if (!request.headers['x-request-id']) {
            request.headers['x-request-id'] = this.generateRequestId();
        }
        const requestId = request.headers['x-request-id'];
        const method = request.method;
        const url = request.originalUrl || request.url;
        const userAgent = request.headers['user-agent'] || '';
        const ip = this.getClientIp(request);
        const userId = request.user?.id;
        // Log request start with payload
        this.logRequestStart(request, requestId, method, url, ip, userAgent, userId);
        return next.handle().pipe((0, operators_1.tap)((data) => {
            const duration = perf_hooks_1.performance.now() - startTime;
            const statusCode = response.statusCode;
            // Log successful response with payload
            this.logRequestSuccess(request, response, data, duration, requestId, method, url, statusCode, ip, userAgent, userId);
        }), (0, operators_1.catchError)((error) => {
            const duration = perf_hooks_1.performance.now() - startTime;
            const statusCode = response.statusCode || 500;
            // Log error response with details
            this.logRequestError(request, response, error, duration, requestId, method, url, statusCode, ip, userAgent, userId);
            throw error;
        }));
    }
    logRequestStart(request, requestId, method, url, ip, userAgent, userId) {
        const category = this.categorizeRequest(method, url);
        this.logger.log(`API Request Started: ${method} ${url}`, 'API', {
            requestId,
            method,
            url,
            ip,
            userAgent,
            userId,
            category,
            headers: this.sanitizeHeaders(request.headers),
            query: request.query,
            body: this.sanitizeBody(request.body),
            timestamp: new Date().toISOString()
        });
    }
    logRequestSuccess(request, response, data, duration, requestId, method, url, statusCode, ip, userAgent, userId) {
        const category = this.categorizeRequest(method, url);
        this.logger.log(`API Request Completed: ${method} ${url}`, 'API', {
            requestId,
            method,
            url,
            statusCode,
            duration: Math.round(duration),
            ip,
            userAgent,
            userId,
            category,
            responseHeaders: this.sanitizeHeaders(response.getHeaders()),
            responseBody: this.sanitizeResponseBody(data, statusCode),
            timestamp: new Date().toISOString()
        });
    }
    logRequestError(request, response, error, duration, requestId, method, url, statusCode, ip, userAgent, userId) {
        const category = this.categorizeRequest(method, url);
        this.logger.error(`API Request Failed: ${method} ${url}`, error.stack, 'API', {
            requestId,
            method,
            url,
            statusCode,
            duration: Math.round(duration),
            ip,
            userAgent,
            userId,
            category,
            errorName: error.name,
            errorMessage: error.message,
            requestBody: this.sanitizeBody(request.body),
            requestHeaders: this.sanitizeHeaders(request.headers),
            timestamp: new Date().toISOString()
        });
    }
    categorizeRequest(method, url) {
        const path = url.toLowerCase();
        // Authentication & Authorization
        if (path.includes('/auth') || path.includes('/login') || path.includes('/register') || path.includes('/logout')) {
            return 'AUTH';
        }
        // User Management
        if (path.includes('/users') || path.includes('/user') || path.includes('/profile')) {
            return 'USER_MANAGEMENT';
        }
        // Payment & Billing
        if (path.includes('/payment') || path.includes('/billing') || path.includes('/invoice') || path.includes('/subscription')) {
            return 'PAYMENT';
        }
        // File Operations
        if (path.includes('/upload') || path.includes('/file') || path.includes('/image') || path.includes('/document')) {
            return 'FILE_OPERATIONS';
        }
        // Data Operations
        if (path.includes('/data') || path.includes('/export') || path.includes('/import') || path.includes('/report')) {
            return 'DATA_OPERATIONS';
        }
        // Search & Query
        if (path.includes('/search') || path.includes('/query') || path.includes('/filter')) {
            return 'SEARCH';
        }
        // Health & Monitoring
        if (path.includes('/health') || path.includes('/status') || path.includes('/metrics')) {
            return 'HEALTH';
        }
        // Admin Operations
        if (path.includes('/admin') || path.includes('/management') || path.includes('/config')) {
            return 'ADMIN';
        }
        // API Operations
        if (path.includes('/api/')) {
            return 'API';
        }
        // Default categorization
        return 'GENERAL';
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token',
            'x-access-token',
            'x-refresh-token'
        ];
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    sanitizeBody(body) {
        if (!body)
            return undefined;
        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'key',
            'credential',
            'ssn',
            'credit_card',
            'card_number'
        ];
        const sanitized = { ...body };
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    sanitizeResponseBody(data, statusCode) {
        if (!data)
            return undefined;
        // Don't log response body for large responses or binary data
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 10000) {
            return { message: '[RESPONSE_TOO_LARGE]', size: dataStr.length };
        }
        // Don't log binary data
        if (typeof data === 'string' && data.includes('')) {
            return { message: '[BINARY_DATA]' };
        }
        return data;
    }
    getClientIp(request) {
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown');
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.UniversalLoggerInterceptor = UniversalLoggerInterceptor;
exports.UniversalLoggerInterceptor = UniversalLoggerInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [universal_logger_client_1.UniversalLoggerClient])
], UniversalLoggerInterceptor);
