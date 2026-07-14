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
    }
}
exports.UniversalLoggerConfig = UniversalLoggerConfig;
