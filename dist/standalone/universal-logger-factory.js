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
exports.UniversalLoggerFactory = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const universal_logger_standalone_1 = require("./universal-logger-standalone");
const log_entry_schema_1 = require("../schemas/log-entry.schema");
let UniversalLoggerFactory = class UniversalLoggerFactory {
    constructor(defaultLogModel) {
        this.defaultLogModel = defaultLogModel;
        this.loggers = new Map();
        this.models = new Map();
        this.config = {};
    }
    /**
     * Set the configuration for the factory
     * @param config - Configuration object
     */
    setConfig(config) {
        this.config = config;
    }
    /**
     * Create a logger instance for a specific service
     * @param serviceName - Name of the service
     * @param environment - Environment (optional, uses config default)
     * @param version - Version (optional, uses config default)
     * @returns UniversalLoggerStandalone instance
     */
    createLogger(serviceName, environment, version) {
        const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;
        if (!this.loggers.has(key)) {
            // Get or create model for this service
            const logModel = this.getOrCreateModel(serviceName);
            const logger = new universal_logger_standalone_1.UniversalLoggerStandalone(logModel, this.config, serviceName, environment, version);
            this.loggers.set(key, logger);
        }
        return this.loggers.get(key);
    }
    /**
     * Get an existing logger instance
     * @param serviceName - Name of the service
     * @param environment - Environment
     * @param version - Version
     * @returns UniversalLoggerStandalone instance or null if not found
     */
    getLogger(serviceName, environment, version) {
        const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;
        return this.loggers.get(key) || null;
    }
    /**
     * Get all active loggers
     * @returns Map of all logger instances
     */
    getAllLoggers() {
        return new Map(this.loggers);
    }
    /**
     * Remove a logger instance
     * @param serviceName - Name of the service
     * @param environment - Environment
     * @param version - Version
     */
    removeLogger(serviceName, environment, version) {
        const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;
        this.loggers.delete(key);
    }
    /**
     * Clear all logger instances
     */
    clearAllLoggers() {
        this.loggers.clear();
    }
    /**
     * Get collection name for a service
     * @param serviceName - Name of the service
     * @returns Collection name
     */
    getCollectionName(serviceName) {
        return (0, log_entry_schema_1.getLogCollectionName)(serviceName);
    }
    /**
     * Get all collection names
     * @returns Array of collection names
     */
    getAllCollectionNames() {
        return Array.from(this.models.keys()).map(key => (0, log_entry_schema_1.getLogCollectionName)(key));
    }
    getOrCreateModel(serviceName) {
        if (!this.models.has(serviceName)) {
            // For now, we'll use the default model but with service-specific collection
            // In a more advanced implementation, you might want to create separate models
            this.models.set(serviceName, this.defaultLogModel);
        }
        return this.models.get(serviceName);
    }
};
exports.UniversalLoggerFactory = UniversalLoggerFactory;
exports.UniversalLoggerFactory = UniversalLoggerFactory = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('LogEntry')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UniversalLoggerFactory);
