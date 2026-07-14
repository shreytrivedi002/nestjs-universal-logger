import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UniversalLoggerStandalone } from './universal-logger-standalone';
import { UniversalLoggerConfig } from '../interfaces/config.interface';
import { LogEntry } from '../interfaces/config.interface';
import { createLogEntrySchema, getLogCollectionName } from '../schemas/log-entry.schema';

@Injectable()
export class UniversalLoggerFactory {
  private loggers: Map<string, UniversalLoggerStandalone> = new Map();
  private models: Map<string, Model<LogEntry>> = new Map();
  private config: UniversalLoggerConfig = {};

  constructor(
    @InjectModel('LogEntry') private readonly defaultLogModel: Model<LogEntry>
  ) { }

  /**
   * Set the configuration for the factory
   * @param config - Configuration object
   */
  setConfig(config: UniversalLoggerConfig): void {
    this.config = config;
  }

  /**
   * Create a logger instance for a specific service
   * @param serviceName - Name of the service
   * @param environment - Environment (optional, uses config default)
   * @param version - Version (optional, uses config default)
   * @returns UniversalLoggerStandalone instance
   */
  createLogger(
    serviceName: string,
    environment?: string,
    version?: string
  ): UniversalLoggerStandalone {
    const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;

    if (!this.loggers.has(key)) {
      // Get or create model for this service
      const logModel = this.getOrCreateModel(serviceName);

      const logger = new UniversalLoggerStandalone(
        logModel,
        this.config,
        serviceName,
        environment,
        version
      );
      this.loggers.set(key, logger);
    }

    return this.loggers.get(key)!;
  }

  /**
   * Get an existing logger instance
   * @param serviceName - Name of the service
   * @param environment - Environment
   * @param version - Version
   * @returns UniversalLoggerStandalone instance or null if not found
   */
  getLogger(
    serviceName: string,
    environment?: string,
    version?: string
  ): UniversalLoggerStandalone | null {
    const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;
    return this.loggers.get(key) || null;
  }

  /**
   * Get all active loggers
   * @returns Map of all logger instances
   */
  getAllLoggers(): Map<string, UniversalLoggerStandalone> {
    return new Map(this.loggers);
  }

  /**
   * Remove a logger instance
   * @param serviceName - Name of the service
   * @param environment - Environment
   * @param version - Version
   */
  removeLogger(
    serviceName: string,
    environment?: string,
    version?: string
  ): void {
    const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;
    this.loggers.delete(key);
  }

  /**
   * Clear all logger instances
   */
  clearAllLoggers(): void {
    this.loggers.clear();
  }

  /**
   * Get collection name for a service
   * @param serviceName - Name of the service
   * @returns Collection name
   */
  getCollectionName(serviceName: string): string {
    return getLogCollectionName(serviceName);
  }

  /**
   * Get all collection names
   * @returns Array of collection names
   */
  getAllCollectionNames(): string[] {
    return Array.from(this.models.keys()).map(key => getLogCollectionName(key));
  }

  private getOrCreateModel(serviceName: string): Model<LogEntry> {
    if (!this.models.has(serviceName)) {
      // For now, we'll use the default model but with service-specific collection
      // In a more advanced implementation, you might want to create separate models
      this.models.set(serviceName, this.defaultLogModel);
    }

    return this.models.get(serviceName)!;
  }
}
