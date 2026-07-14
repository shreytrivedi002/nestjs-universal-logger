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
exports.logEntrySchema = exports.LogEntrySchema = void 0;
exports.createLogEntrySchema = createLogEntrySchema;
exports.getLogCollectionName = getLogCollectionName;
exports.addTTLIndexToSchema = addTTLIndexToSchema;
const mongoose_1 = require("@nestjs/mongoose");
// Base schema without collection name - will be set dynamically
let LogEntrySchema = class LogEntrySchema {
};
exports.LogEntrySchema = LogEntrySchema;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], LogEntrySchema.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['error', 'warn', 'info', 'debug', 'verbose'], index: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "service", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "module", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "trace", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LogEntrySchema.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "sessionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "requestId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "ip", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "userAgent", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], LogEntrySchema.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", Number)
], LogEntrySchema.prototype, "statusCode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "errorCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], index: true }),
    __metadata("design:type", Array)
], LogEntrySchema.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['low', 'medium', 'high', 'critical'], index: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "severity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "environment", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LogEntrySchema.prototype, "version", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LogEntrySchema.prototype, "apiCall", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LogEntrySchema.prototype, "performance", void 0);
exports.LogEntrySchema = LogEntrySchema = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    })
], LogEntrySchema);
exports.logEntrySchema = mongoose_1.SchemaFactory.createForClass(LogEntrySchema);
/**
 * Factory function to create a log entry schema with dynamic collection name and optional TTL configuration.
 *
 * @param serviceName - The service name used to generate the collection name
 * @param ttlConfig - Optional TTL configuration for automatic document expiration
 * @param ttlConfig.enabled - Whether TTL indexing is enabled
 * @param ttlConfig.expireAfterSeconds - Time in seconds after which documents will be automatically deleted
 * @param ttlConfig.indexField - Field to use for TTL index ('timestamp', 'created_at', or 'updated_at')
 * @returns Mongoose schema configured with indexes and optional TTL
 * @example
 * ```typescript
 * // Create schema with 30-day TTL
 * const schema = createLogEntrySchema('my-service', {
 *   enabled: true,
 *   expireAfterSeconds: 2592000, // 30 days
 *   indexField: 'timestamp'
 * });
 * ```
 */
function createLogEntrySchema(serviceName, ttlConfig) {
    const schema = mongoose_1.SchemaFactory.createForClass(LogEntrySchema);
    // Set collection name based on service
    const collectionName = `logs_${serviceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    schema.set('collection', collectionName);
    // Add regular indexes
    schema.index({ timestamp: -1 });
    schema.index({ service: 1, timestamp: -1 });
    schema.index({ level: 1, timestamp: -1 });
    schema.index({ severity: 1, timestamp: -1 });
    schema.index({ userId: 1, timestamp: -1 });
    schema.index({ requestId: 1 });
    schema.index({ tags: 1 });
    schema.index({ environment: 1, timestamp: -1 });
    schema.index({ 'apiCall.path': 1, timestamp: -1 });
    schema.index({ 'apiCall.method': 1, timestamp: -1 });
    schema.index({ statusCode: 1, timestamp: -1 });
    // Add TTL index if configured
    if (ttlConfig?.enabled && ttlConfig.expireAfterSeconds) {
        const indexField = ttlConfig.indexField || 'timestamp';
        const ttlIndexOptions = { expireAfterSeconds: ttlConfig.expireAfterSeconds };
        switch (indexField) {
            case 'created_at':
                schema.index({ created_at: 1 }, ttlIndexOptions);
                break;
            case 'updated_at':
                schema.index({ updated_at: 1 }, ttlIndexOptions);
                break;
            default:
                schema.index({ timestamp: 1 }, ttlIndexOptions);
                break;
        }
    }
    return schema;
}
/**
 * Helper function to generate a consistent collection name for a service.
 *
 * @param serviceName - The service name to generate collection name for
 * @returns MongoDB collection name in format: logs_{sanitized_service_name}
 * @example
 * ```typescript
 * const collectionName = getLogCollectionName('my-service-name');
 * // Returns: 'logs_my_service_name'
 * ```
 */
function getLogCollectionName(serviceName) {
    return `logs_${serviceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}
/**
 * Helper function to add TTL index to an existing schema (useful for async configurations).
 * This function can be called after schema creation when TTL configuration becomes available.
 *
 * @param schema - The Mongoose schema to add TTL index to
 * @param ttlConfig - TTL configuration object
 * @param ttlConfig.enabled - Whether TTL indexing should be enabled
 * @param ttlConfig.expireAfterSeconds - Time in seconds after which documents will be automatically deleted
 * @param ttlConfig.indexField - Field to use for TTL index ('timestamp', 'created_at', or 'updated_at')
 * @example
 * ```typescript
 * const schema = SchemaFactory.createForClass(LogEntrySchema);
 * addTTLIndexToSchema(schema, {
 *   enabled: true,
 *   expireAfterSeconds: 604800, // 7 days
 *   indexField: 'created_at'
 * });
 * ```
 */
function addTTLIndexToSchema(schema, ttlConfig) {
    if (ttlConfig?.enabled && ttlConfig.expireAfterSeconds) {
        const indexField = ttlConfig.indexField || 'timestamp';
        const ttlIndexOptions = { expireAfterSeconds: ttlConfig.expireAfterSeconds };
        switch (indexField) {
            case 'created_at':
                schema.index({ created_at: 1 }, ttlIndexOptions);
                break;
            case 'updated_at':
                schema.index({ updated_at: 1 }, ttlIndexOptions);
                break;
            default:
                schema.index({ timestamp: 1 }, ttlIndexOptions);
                break;
        }
    }
}
