import { OnModuleDestroy } from '@nestjs/common';
import { Model } from 'mongoose';
import { UniversalLoggerStandalone } from './universal-logger-standalone';
import { UniversalLoggerConfig } from '../interfaces/config.interface';
import { LogEntry } from '../interfaces/config.interface';
export declare class UniversalLoggerFactory implements OnModuleDestroy {
    private readonly defaultLogModel;
    private loggers;
    private models;
    private config;
    constructor(defaultLogModel: Model<LogEntry>);
    /**
     * Set the configuration for the factory
     * @param config - Configuration object
     */
    setConfig(config: UniversalLoggerConfig): void;
    /**
     * Create a logger instance for a specific service
     * @param serviceName - Name of the service
     * @param environment - Environment (optional, uses config default)
     * @param version - Version (optional, uses config default)
     * @returns UniversalLoggerStandalone instance
     */
    createLogger(serviceName: string, environment?: string, version?: string): UniversalLoggerStandalone;
    getLogger(serviceName: string, environment?: string, version?: string): UniversalLoggerStandalone | null;
    getAllLoggers(): Map<string, UniversalLoggerStandalone>;
    removeLogger(serviceName: string, environment?: string, version?: string): Promise<void>;
    clearAllLoggers(): Promise<void>;
    getCollectionName(serviceName: string): string;
    getAllCollectionNames(): string[];
    flushAll(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private getOrCreateModel;
}
