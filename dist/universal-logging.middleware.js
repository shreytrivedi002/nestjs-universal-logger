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
exports.UniversalLoggingMiddleware = void 0;
const common_1 = require("@nestjs/common");
const perf_hooks_1 = require("perf_hooks");
const universal_logger_service_1 = require("./universal-logger.service");
const universal_logger_config_1 = require("./universal-logger.config");
let UniversalLoggingMiddleware = class UniversalLoggingMiddleware {
    constructor(logger, config) {
        this.logger = logger;
        this.config = config;
    }
    use(req, res, next) {
        if (!this.config.isFeatureEnabled('api')) {
            return next();
        }
        const apiConfig = this.config.getApiConfig();
        const start = perf_hooks_1.performance.now();
        const requestId = req.headers['x-request-id'] || this.generateRequestId();
        res.setHeader('x-request-id', requestId);
        if (this.shouldExcludePath(req.originalUrl, apiConfig.excludePaths)) {
            return next();
        }
        if (apiConfig.includePaths.length > 0 && !this.shouldIncludePath(req.originalUrl, apiConfig.includePaths)) {
            return next();
        }
        this.logger.log(`Request started: ${req.method} ${req.originalUrl}`, 'HTTP', {
            requestId,
            userId: req.user?.id,
            sessionId: req.session?.id,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        const originalSend = res.send;
        res.send = function (body) {
            const duration = perf_hooks_1.performance.now() - start;
            this.logger.logApiCall(req, res, duration, res.statusCode);
            this.logSecurityEvents(req, res, duration);
            return originalSend.call(this, body);
        }.bind(this);
        res.on('finish', () => {
            const duration = perf_hooks_1.performance.now() - start;
            if (this.config.isFeatureEnabled('performance')) {
                this.logger.logPerformance(`${req.method} ${req.originalUrl}`, duration, {
                    requestId,
                    statusCode: res.statusCode
                });
            }
            if (Math.random() < 0.01) {
                this.logger.logSystemMetrics();
            }
        });
        next();
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    shouldExcludePath(path, excludePaths) {
        return excludePaths.some(excludePath => {
            if (excludePath.endsWith('*')) {
                return path.startsWith(excludePath.slice(0, -1));
            }
            return path === excludePath;
        });
    }
    shouldIncludePath(path, includePaths) {
        return includePaths.some(includePath => {
            if (includePath.endsWith('*')) {
                return path.startsWith(includePath.slice(0, -1));
            }
            return path === includePath;
        });
    }
    logSecurityEvents(req, res, duration) {
        if (!this.config.isFeatureEnabled('security'))
            return;
        const securityConfig = this.config.getSecurityConfig();
        if (res.statusCode === 401) {
            this.logger.logSecurity('Unauthorized access attempt', {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.originalUrl,
                method: req.method
            });
        }
        if (res.statusCode === 403) {
            this.logger.logSecurity('Forbidden access attempt', {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.originalUrl,
                method: req.method,
                userId: req.user?.id
            });
        }
        if (securityConfig.ipBlacklist.includes(req.ip)) {
            this.logger.logSecurity('Blocked IP access attempt', {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.originalUrl
            });
        }
        if (this.isSuspiciousActivity(req)) {
            this.logger.logSecurity('Suspicious activity detected', {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.originalUrl,
                method: req.method,
                reason: 'Multiple rapid requests'
            });
        }
    }
    isSuspiciousActivity(req) {
        const suspiciousPatterns = [
            /\.\.\//,
            /<script/i,
            /union\s+select/i,
            /eval\s*\(/i,
        ];
        const path = req.originalUrl.toLowerCase();
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        return suspiciousPatterns.some(pattern => pattern.test(path) || pattern.test(userAgent));
    }
};
exports.UniversalLoggingMiddleware = UniversalLoggingMiddleware;
exports.UniversalLoggingMiddleware = UniversalLoggingMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [universal_logger_service_1.UniversalLoggerService,
        universal_logger_config_1.UniversalLoggerConfig])
], UniversalLoggingMiddleware);
