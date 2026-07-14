import { Model } from 'mongoose';
import { UniversalLoggerStandalone } from './universal-logger-standalone';
import { UniversalLoggerConfig } from '../interfaces/config.interface';
import { LogEntry } from '../interfaces/config.interface';
export declare class UniversalLoggerFactory {
    private readonly defaultLogModel;
    private loggers;
    private models;
    private config;
    constructor(defaultLogModel: Model<LogEntry>);
    setConfig(config: UniversalLoggerConfig): void;
    createLogger(serviceName: string, environment?: string, version?: string): UniversalLoggerStandalone;
    getLogger(serviceName: string, environment?: string, version?: string): UniversalLoggerStandalone | null;
    getAllLoggers(): Map<string, UniversalLoggerStandalone>;
    removeLogger(serviceName: string, environment?: string, version?: string): void;
    clearAllLoggers(): void;
    getCollectionName(serviceName: string): string;
    getAllCollectionNames(): string[];
    private getOrCreateModel;
}
