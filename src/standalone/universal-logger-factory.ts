import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UniversalLoggerStandalone } from './universal-logger-standalone';
import { UniversalLoggerConfig } from '../interfaces/config.interface';
import { LogEntry } from '../interfaces/config.interface';
import { getLogCollectionName } from '../schemas/log-entry.schema';

@Injectable()
export class UniversalLoggerFactory implements OnModuleDestroy {
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

  getLogger(
    serviceName: string,
    environment?: string,
    version?: string
  ): UniversalLoggerStandalone | null {
    const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;
    return this.loggers.get(key) || null;
  }

  getAllLoggers(): Map<string, UniversalLoggerStandalone> {
    return new Map(this.loggers);
  }

  async removeLogger(
    serviceName: string,
    environment?: string,
    version?: string
  ): Promise<void> {
    const key = `${serviceName}-${environment || 'default'}-${version || 'default'}`;
    const logger = this.loggers.get(key);
    if (logger) {
      await logger.destroy();
      this.loggers.delete(key);
    }
  }

  async clearAllLoggers(): Promise<void> {
    await Promise.all([...this.loggers.values()].map((logger) => logger.destroy()));
    this.loggers.clear();
  }

  getCollectionName(serviceName: string): string {
    return getLogCollectionName(serviceName);
  }

  getAllCollectionNames(): string[] {
    return Array.from(this.models.keys()).map(key => getLogCollectionName(key));
  }

  async flushAll(): Promise<void> {
    await Promise.all([...this.loggers.values()].map((logger) => logger.flush()));
  }

  async onModuleDestroy(): Promise<void> {
    await this.clearAllLoggers();
  }

  private getOrCreateModel(serviceName: string): Model<LogEntry> {
    if (!this.models.has(serviceName)) {
      this.models.set(serviceName, this.defaultLogModel);
    }

    return this.models.get(serviceName)!;
  }
}
