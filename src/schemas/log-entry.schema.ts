import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';

// Base schema without collection name - will be set dynamically
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})
export class LogEntrySchema {
  @Prop({ required: true, unique: true })
  id?: string;

  @Prop({ required: true, index: true })
  timestamp?: Date;

  @Prop({ required: true, enum: ['error', 'warn', 'info', 'debug', 'verbose'], index: true })
  level?: string;

  @Prop({ required: true, index: true })
  service?: string;

  @Prop({ index: true })
  module?: string;

  @Prop()
  method?: string;

  @Prop({ required: true })
  message?: string;

  @Prop()
  trace?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ index: true })
  userId?: string;

  @Prop()
  sessionId?: string;

  @Prop({ index: true })
  requestId?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  duration?: number;

  @Prop({ index: true })
  statusCode?: number;

  @Prop()
  errorCode?: string;

  @Prop({ type: [String], index: true })
  tags?: string[];

  @Prop({ enum: ['low', 'medium', 'high', 'critical'], index: true })
  severity?: string;

  @Prop({ required: true, index: true })
  environment?: string;

  @Prop()
  version?: string;

  // API Call specific fields
  @Prop({ type: Object })
  apiCall?: {
    method?: string;
    path?: string;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, any>;
    response?: {
      statusCode?: number;
      body?: any;
      headers?: Record<string, any>;
    };
  };

  // Performance specific fields
  @Prop({ type: Object })
  performance?: {
    memoryUsage?: {
      heapUsed?: number;
      heapTotal?: number;
      external?: number;
      rss?: number;
    };
    cpuUsage?: {
      user?: number;
      system?: number;
    };
    databaseQueries?: Array<{
      query?: string;
      duration?: number;
      table?: string;
      operation?: string;
    }>;
    externalCalls?: Array<{
      url?: string;
      method?: string;
      duration?: number;
      statusCode?: number;
    }>;
  };
}

export type LogEntryDocument = HydratedDocument<LogEntrySchema>;
export const logEntrySchema = SchemaFactory.createForClass(LogEntrySchema);
export type LogEntryModel = Model<LogEntrySchema, {}, {}, {}, any>;

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
export function createLogEntrySchema(serviceName: string, ttlConfig?: { enabled?: boolean; expireAfterSeconds?: number; indexField?: 'timestamp' | 'created_at' | 'updated_at' }) {
  const schema = SchemaFactory.createForClass(LogEntrySchema);

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
export function getLogCollectionName(serviceName: string): string {
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
export function addTTLIndexToSchema(schema: any, ttlConfig: { enabled?: boolean; expireAfterSeconds?: number; indexField?: 'timestamp' | 'created_at' | 'updated_at' }): void {
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
