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
export declare function getLogCollectionName(serviceName: string): string;
export declare function addTTLIndexToSchema(schema: any, ttlConfig: {
    enabled?: boolean;
    expireAfterSeconds?: number;
    indexField?: 'timestamp' | 'created_at' | 'updated_at';
}): void;
