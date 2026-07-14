import { HydratedDocument, Model } from 'mongoose';
export declare class LogEntrySchema {
    id?: string;
    timestamp?: Date;
    level?: string;
    service?: string;
    module?: string;
    method?: string;
    message?: string;
    trace?: string;
    metadata?: Record<string, any>;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    duration?: number;
    statusCode?: number;
    errorCode?: string;
    tags?: string[];
    severity?: string;
    environment?: string;
    version?: string;
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
export declare const logEntrySchema: import("mongoose").Schema<LogEntrySchema, Model<LogEntrySchema, any, any, any, import("mongoose").Document<unknown, any, LogEntrySchema, any, {}> & LogEntrySchema & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LogEntrySchema, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<LogEntrySchema>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<LogEntrySchema> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
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
export declare function createLogEntrySchema(serviceName: string, ttlConfig?: {
    enabled?: boolean;
    expireAfterSeconds?: number;
    indexField?: 'timestamp' | 'created_at' | 'updated_at';
}): import("mongoose").Schema<LogEntrySchema, Model<LogEntrySchema, any, any, any, import("mongoose").Document<unknown, any, LogEntrySchema, any, {}> & LogEntrySchema & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LogEntrySchema, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<LogEntrySchema>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<LogEntrySchema> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
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
export declare function getLogCollectionName(serviceName: string): string;
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
export declare function addTTLIndexToSchema(schema: any, ttlConfig: {
    enabled?: boolean;
    expireAfterSeconds?: number;
    indexField?: 'timestamp' | 'created_at' | 'updated_at';
}): void;
