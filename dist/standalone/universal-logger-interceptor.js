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
exports.UniversalLoggerInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const perf_hooks_1 = require("perf_hooks");
const universal_logger_client_1 = require("./universal-logger-client");
const universal_logger_config_1 = require("../universal-logger.config");
const body_utils_1 = require("./body-utils");
let UniversalLoggerInterceptor = class UniversalLoggerInterceptor {
    constructor(logger, config) {
        this.logger = logger;
        this.apiConfig = config?.api || {};
    }
    intercept(context, next) {
        if (this.apiConfig.enabled === false) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const url = request.originalUrl || request.url;
        if (this.shouldExcludePath(url)) {
            return next.handle();
        }
        const startTime = perf_hooks_1.performance.now();
        if (!request.headers['x-request-id']) {
            request.headers['x-request-id'] = this.generateRequestId();
        }
        const requestId = request.headers['x-request-id'];
        const method = request.method;
        const userAgent = request.headers['user-agent'] || '';
        const ip = this.getClientIp(request);
        const userId = request.user?.id;
        // Request-start logs omit bodies when mode is 'errors' (status unknown yet)
        this.logRequestStart(request, requestId, method, url, ip, userAgent, userId);
        return next.handle().pipe((0, operators_1.tap)((data) => {
            const duration = perf_hooks_1.performance.now() - startTime;
            const statusCode = response.statusCode;
            this.logRequestSuccess(request, response, data, duration, requestId, method, url, statusCode, ip, userAgent, userId);
        }), (0, operators_1.catchError)((error) => {
            const duration = perf_hooks_1.performance.now() - startTime;
            const statusCode = response.statusCode || error?.status || 500;
            this.logRequestError(request, response, error, duration, requestId, method, url, statusCode, ip, userAgent, userId);
            throw error;
        }));
    }
    logRequestStart(request, requestId, method, url, ip, userAgent, userId) {
        if (this.apiConfig.logRequests === false) {
            return;
        }
        const category = this.categorizeRequest(method, url);
        const bodyMode = (0, body_utils_1.resolveRequestBodyMode)(this.apiConfig);
        // On start we only attach bodies when mode is 'all'
        const includeBody = (0, body_utils_1.shouldLogBody)(bodyMode, undefined, false) && bodyMode === 'all';
        this.logger.log(`API Request Started: ${method} ${url}`, 'API', {
            requestId,
            method,
            url,
            ip,
            userAgent,
            userId,
            category,
            headers: this.apiConfig.logHeaders === false ? undefined : this.sanitizeHeaders(request.headers),
            query: this.apiConfig.logQuery === false ? undefined : request.query,
            body: includeBody
                ? (0, body_utils_1.prepareLogBody)(request.body, (0, body_utils_1.getMaxBodySize)(this.apiConfig))
                : undefined,
            timestamp: new Date().toISOString(),
        });
    }
    logRequestSuccess(request, response, data, duration, requestId, method, url, statusCode, ip, userAgent, userId) {
        const category = this.categorizeRequest(method, url);
        const requestBodyMode = (0, body_utils_1.resolveRequestBodyMode)(this.apiConfig);
        const responseBodyMode = (0, body_utils_1.resolveResponseBodyMode)(this.apiConfig);
        const includeRequestBody = (0, body_utils_1.shouldLogBody)(requestBodyMode, statusCode);
        const includeResponseBody = this.apiConfig.logResponses !== false && (0, body_utils_1.shouldLogBody)(responseBodyMode, statusCode);
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
            responseHeaders: this.apiConfig.logHeaders === false ? undefined : this.sanitizeHeaders(response.getHeaders()),
            requestBody: includeRequestBody
                ? (0, body_utils_1.prepareLogBody)(request.body, (0, body_utils_1.getMaxBodySize)(this.apiConfig))
                : undefined,
            responseBody: includeResponseBody
                ? (0, body_utils_1.prepareLogBody)(data, (0, body_utils_1.getMaxBodySize)(this.apiConfig))
                : undefined,
            timestamp: new Date().toISOString(),
        });
    }
    logRequestError(request, response, error, duration, requestId, method, url, statusCode, ip, userAgent, userId) {
        const category = this.categorizeRequest(method, url);
        const requestBodyMode = (0, body_utils_1.resolveRequestBodyMode)(this.apiConfig);
        const includeRequestBody = (0, body_utils_1.shouldLogBody)(requestBodyMode, statusCode, true);
        this.logger.error(`API Request Failed: ${method} ${url}`, error?.stack, 'API', {
            requestId,
            method,
            url,
            statusCode,
            duration: Math.round(duration),
            ip,
            userAgent,
            userId,
            category,
            errorName: error?.name,
            errorMessage: error?.message,
            requestBody: includeRequestBody
                ? (0, body_utils_1.prepareLogBody)(request.body, (0, body_utils_1.getMaxBodySize)(this.apiConfig))
                : undefined,
            requestHeaders: this.apiConfig.logHeaders === false ? undefined : this.sanitizeHeaders(request.headers),
            timestamp: new Date().toISOString(),
        });
    }
    shouldExcludePath(path) {
        const excludePaths = this.apiConfig.excludePaths || [];
        return excludePaths.some((excludePath) => {
            if (excludePath.endsWith('*')) {
                return path.startsWith(excludePath.slice(0, -1));
            }
            return path === excludePath;
        });
    }
    categorizeRequest(method, url) {
        const path = url.toLowerCase();
        if (path.includes('/auth') || path.includes('/login') || path.includes('/register') || path.includes('/logout')) {
            return 'AUTH';
        }
        if (path.includes('/users') || path.includes('/user') || path.includes('/profile')) {
            return 'USER_MANAGEMENT';
        }
        if (path.includes('/payment') || path.includes('/billing') || path.includes('/invoice') || path.includes('/subscription')) {
            return 'PAYMENT';
        }
        if (path.includes('/upload') || path.includes('/file') || path.includes('/image') || path.includes('/document')) {
            return 'FILE_OPERATIONS';
        }
        if (path.includes('/data') || path.includes('/export') || path.includes('/import') || path.includes('/report')) {
            return 'DATA_OPERATIONS';
        }
        if (path.includes('/search') || path.includes('/query') || path.includes('/filter')) {
            return 'SEARCH';
        }
        if (path.includes('/health') || path.includes('/status') || path.includes('/metrics')) {
            return 'HEALTH';
        }
        if (path.includes('/admin') || path.includes('/management') || path.includes('/config')) {
            return 'ADMIN';
        }
        if (path.includes('/api/')) {
            return 'API';
        }
        return 'GENERAL';
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = this.apiConfig.sensitiveHeaders || [
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token',
            'x-access-token',
            'x-refresh-token',
        ];
        sensitiveHeaders.forEach((header) => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    getClientIp(request) {
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            'unknown');
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.UniversalLoggerInterceptor = UniversalLoggerInterceptor;
exports.UniversalLoggerInterceptor = UniversalLoggerInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(universal_logger_config_1.UniversalLoggerConfig)),
    __metadata("design:paramtypes", [universal_logger_client_1.UniversalLoggerClient, Object])
], UniversalLoggerInterceptor);
