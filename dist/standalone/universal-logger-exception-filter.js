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
exports.UniversalLoggerExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const universal_logger_client_1 = require("./universal-logger-client");
let UniversalLoggerExceptionFilter = class UniversalLoggerExceptionFilter {
    constructor(logger) {
        this.logger = logger;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception instanceof common_1.HttpException
            ? exception.getResponse()
            : 'Internal server error';
        const errorName = exception instanceof Error ? exception.name : 'UnknownError';
        const errorStack = exception instanceof Error ? exception.stack : undefined;
        const requestId = request.headers['x-request-id'];
        const method = request.method;
        const url = request.originalUrl || request.url;
        const userAgent = request.headers['user-agent'] || '';
        const ip = this.getClientIp(request);
        const userId = request.user?.id;
        // Categorize the error
        const category = this.categorizeError(status, errorName, url);
        // Log the error with full context
        this.logger.error(`Exception occurred: ${method} ${url}`, errorStack, 'ERROR', {
            requestId,
            method,
            url,
            statusCode: status,
            ip,
            userAgent,
            userId,
            category,
            errorName,
            errorMessage: typeof message === 'string' ? message : JSON.stringify(message),
            errorCode: exception.code,
            requestBody: this.sanitizeBody(request.body),
            requestHeaders: this.sanitizeHeaders(request.headers),
            query: request.query,
            timestamp: new Date().toISOString()
        });
        // Log security events for certain errors
        if (status === 401 || status === 403) {
            this.logger.logSecurityViolation(`Unauthorized access: ${method} ${url}`, ip, userAgent, {
                requestId,
                statusCode: status,
                userId,
                category,
                errorName
            });
        }
        // Log rate limiting errors
        if (status === 429) {
            this.logger.logSecurityViolation(`Rate limit exceeded: ${method} ${url}`, ip, userAgent, {
                requestId,
                statusCode: status,
                userId,
                category,
                errorName
            });
        }
        // Log validation errors
        if (status === 400 && errorName === 'BadRequestException') {
            this.logger.log('Validation error occurred', 'VALIDATION', {
                requestId,
                method,
                url,
                statusCode: status,
                category,
                errorName,
                errorMessage: typeof message === 'string' ? message : JSON.stringify(message)
            });
        }
        // Log database errors
        if (this.isDatabaseError(errorName)) {
            this.logger.error(`Database error: ${method} ${url}`, errorStack, 'DATABASE_ERROR', {
                requestId,
                method,
                url,
                statusCode: status,
                category,
                errorName,
                errorMessage: typeof message === 'string' ? message : JSON.stringify(message)
            });
        }
        // Log external service errors
        if (this.isExternalServiceError(errorName)) {
            this.logger.error(`External service error: ${method} ${url}`, errorStack, 'EXTERNAL_SERVICE_ERROR', {
                requestId,
                method,
                url,
                statusCode: status,
                category,
                errorName,
                errorMessage: typeof message === 'string' ? message : JSON.stringify(message)
            });
        }
        // Send response
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: typeof message === 'string' ? message : message.message || 'Internal server error',
            requestId
        });
    }
    categorizeError(status, errorName, url) {
        const path = url.toLowerCase();
        // Authentication errors
        if (status === 401 || status === 403) {
            return 'AUTH_ERROR';
        }
        // Validation errors
        if (status === 400) {
            return 'VALIDATION_ERROR';
        }
        // Not found errors
        if (status === 404) {
            return 'NOT_FOUND_ERROR';
        }
        // Rate limiting errors
        if (status === 429) {
            return 'RATE_LIMIT_ERROR';
        }
        // Server errors
        if (status >= 500) {
            if (this.isDatabaseError(errorName)) {
                return 'DATABASE_ERROR';
            }
            if (this.isExternalServiceError(errorName)) {
                return 'EXTERNAL_SERVICE_ERROR';
            }
            return 'SERVER_ERROR';
        }
        // Client errors
        if (status >= 400) {
            return 'CLIENT_ERROR';
        }
        return 'GENERAL_ERROR';
    }
    isDatabaseError(errorName) {
        const databaseErrors = [
            'MongoError',
            'MongooseError',
            'SequelizeError',
            'TypeORMError',
            'PrismaError',
            'DatabaseError',
            'ConnectionError',
            'QueryError'
        ];
        return databaseErrors.some(name => errorName.includes(name));
    }
    isExternalServiceError(errorName) {
        const externalServiceErrors = [
            'AxiosError',
            'FetchError',
            'HttpException',
            'ExternalServiceError',
            'APIError',
            'NetworkError',
            'TimeoutError'
        ];
        return externalServiceErrors.some(name => errorName.includes(name));
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
    getClientIp(request) {
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown');
    }
};
exports.UniversalLoggerExceptionFilter = UniversalLoggerExceptionFilter;
exports.UniversalLoggerExceptionFilter = UniversalLoggerExceptionFilter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [universal_logger_client_1.UniversalLoggerClient])
], UniversalLoggerExceptionFilter);
