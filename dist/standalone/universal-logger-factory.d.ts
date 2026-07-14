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
    /**
     * Get an existing logger instance
     * @param serviceName - Name of the service
     * @param environment - Environment
     * @param version - Version
     * @returns UniversalLoggerStandalone instance or null if not found
     */
    getLogger(serviceName: string, environment?: string, version?: string): UniversalLoggerStandalone | null;
    /**
     * Get all active loggers
     * @returns Map of all logger instances
     */
    getAllLoggers(): Map<string, UniversalLoggerStandalone>;
    /**
     * Remove a logger instance
     * @param serviceName - Name of the service
     * @param environment - Environment
     * @param version - Version
     */
    removeLogger(serviceName: string, environment?: string, version?: string): void;
    /**
     * Clear all logger instances
     */
    clearAllLoggers(): void;
    /**
     * Get collection name for a service
     * @param serviceName - Name of the service
     * @returns Collection name
     */
    getCollectionName(serviceName: string): string;
    /**
     * Get all collection names
     * @returns Array of collection names
     */
    getAllCollectionNames(): string[];
    private getOrCreateModel;
}
