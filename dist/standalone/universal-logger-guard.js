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
exports.UniversalLoggerGuard = void 0;
const common_1 = require("@nestjs/common");
const universal_logger_client_1 = require("./universal-logger-client");
let UniversalLoggerGuard = class UniversalLoggerGuard {
    constructor(logger) {
        this.logger = logger;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const url = request.originalUrl || request.url;
        const userAgent = request.headers['user-agent'] || '';
        const ip = this.getClientIp(request);
        const requestId = request.headers['x-request-id'];
        // Extract authentication info
        const authHeader = request.headers.authorization;
        const token = this.extractToken(authHeader);
        const userId = request.user?.id;
        // Log authentication attempt
        this.logger.log('Authentication check started', 'AUTH', {
            requestId,
            method,
            url,
            ip,
            userAgent,
            userId,
            hasToken: !!token,
            tokenType: this.getTokenType(authHeader),
            timestamp: new Date().toISOString()
        });
        try {
            // Your authentication logic here
            const isAuthenticated = this.validateAuthentication(request);
            if (isAuthenticated) {
                // Log successful authentication
                this.logger.logAuthEvent('authentication_success', userId, true, {
                    requestId,
                    method,
                    url,
                    ip,
                    userAgent,
                    tokenType: this.getTokenType(authHeader)
                });
                return true;
            }
            else {
                // Log failed authentication
                this.logger.logAuthEvent('authentication_failed', userId, false, {
                    requestId,
                    method,
                    url,
                    ip,
                    userAgent,
                    reason: 'invalid_token',
                    tokenType: this.getTokenType(authHeader)
                });
                throw new common_1.UnauthorizedException('Invalid authentication token');
            }
        }
        catch (error) {
            // Log authentication error
            this.logger.logAuthEvent('authentication_error', userId, false, {
                requestId,
                method,
                url,
                ip,
                userAgent,
                errorName: error.name,
                errorMessage: error.message,
                tokenType: this.getTokenType(authHeader)
            });
            throw error;
        }
    }
    validateAuthentication(request) {
        // This is a placeholder - implement your actual authentication logic
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return false;
        }
        // Example: Check if token is valid
        const token = this.extractToken(authHeader);
        if (!token) {
            return false;
        }
        // Add your token validation logic here
        // For example: verify JWT, check against database, etc.
        return true; // Placeholder - replace with actual validation
    }
    extractToken(authHeader) {
        if (!authHeader) {
            return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2) {
            return null;
        }
        return parts[1];
    }
    getTokenType(authHeader) {
        if (!authHeader) {
            return 'none';
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2) {
            return 'invalid';
        }
        return parts[0].toLowerCase();
    }
    getClientIp(request) {
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown');
    }
};
exports.UniversalLoggerGuard = UniversalLoggerGuard;
exports.UniversalLoggerGuard = UniversalLoggerGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [universal_logger_client_1.UniversalLoggerClient])
], UniversalLoggerGuard);
