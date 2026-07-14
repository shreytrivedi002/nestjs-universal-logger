"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalLoggerConfig = void 0;
class UniversalLoggerConfig {
    constructor(config = {}) {
        this.mongodb = config.mongodb;
        this.logging = config.logging;
        this.api = config.api;
        this.performance = config.performance;
        this.security = config.security;
        this.business = config.business;
        this.dashboard = config.dashboard;
        this.retention = config.retention;
        this.ttl = config.ttl;
        this.export = config.export;
        this.alerts = config.alerts;
        this.batch = config.batch;
    }
    getLoggingConfig() {
        return {
            level: this.logging?.level || 'info',
            serviceName: this.logging?.serviceName || 'default-service',
            environment: this.logging?.environment || 'development',
            version: this.logging?.version || '1.0.0',
            enableConsole: this.logging?.enableConsole !== false,
            enableFile: this.logging?.enableFile || false,
            logDirectory: this.logging?.logDirectory || './logs',
            maxFileSize: this.logging?.maxFileSize || 5242880,
            maxFiles: this.logging?.maxFiles || 5,
        };
    }
    getApiConfig() {
        return {
            enabled: this.api?.enabled !== false,
            logRequests: this.api?.logRequests !== false,
            logResponses: this.api?.logResponses !== false,
            logHeaders: this.api?.logHeaders !== false,
            logBody: this.api?.logBody !== false,
            logBodyMode: this.api?.logBodyMode || (this.api?.logBody === false ? 'none' : this.api?.logBody === true ? 'all' : 'errors'),
            logResponseBodyMode: this.api?.logResponseBodyMode ||
                this.api?.logBodyMode ||
                (this.api?.logBody === false ? 'none' : this.api?.logBody === true ? 'all' : 'errors'),
            logQuery: this.api?.logQuery !== false,
            sensitiveHeaders: this.api?.sensitiveHeaders || [
                'authorization',
                'cookie',
                'x-api-key',
            ],
            excludePaths: this.api?.excludePaths || [],
            includePaths: this.api?.includePaths || [],
            maxBodySize: this.api?.maxBodySize || 1024,
            slowRequestThreshold: this.api?.slowRequestThreshold || 1000,
        };
    }
    getSecurityConfig() {
        return {
            enabled: this.security?.enabled !== false,
            trackAuthEvents: this.security?.trackAuthEvents !== false,
            trackFailedLogins: this.security?.trackFailedLogins !== false,
            trackSuspiciousActivity: this.security?.trackSuspiciousActivity !== false,
            ipWhitelist: this.security?.ipWhitelist || [],
            ipBlacklist: this.security?.ipBlacklist || [],
        };
    }
    isFeatureEnabled(feature) {
        switch (feature) {
            case 'api':
                return this.api?.enabled !== false;
            case 'performance':
                return this.performance?.enabled !== false;
            case 'security':
                return this.security?.enabled !== false;
            case 'business':
                return this.business?.enabled !== false;
            case 'dashboard':
                return this.dashboard?.enabled === true;
            default:
                return false;
        }
    }
}
exports.UniversalLoggerConfig = UniversalLoggerConfig;
