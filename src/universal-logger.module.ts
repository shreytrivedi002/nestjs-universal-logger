import { DynamicModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UniversalLoggerService } from './universal-logger.service';
import { UniversalLoggingMiddleware } from './universal-logging.middleware';
import { UniversalLoggerConfig } from './universal-logger.config';
import { logEntrySchema } from './schemas/log-entry.schema';
import { UniversalLoggerConfig as ConfigInterface } from './interfaces/config.interface';

/**
 * Legacy NestJS module API.
 *
 * Note: published builds referenced a UniversalLoggerController that was never
 * shipped on npm. That dependency is intentionally omitted so the module builds.
 * Prefer UniversalLoggerStandaloneModule for new integrations.
 */
@Global()
@Module({})
export class UniversalLoggerModule {
  static forRoot(config?: ConfigInterface): DynamicModule {
    return {
      module: UniversalLoggerModule,
      imports: [
        MongooseModule.forFeature([
          { name: 'LogEntry', schema: logEntrySchema },
        ]),
      ],
      providers: [
        {
          provide: UniversalLoggerConfig,
          useValue: new UniversalLoggerConfig(config),
        },
        UniversalLoggerService,
        UniversalLoggingMiddleware,
      ],
      exports: [
        UniversalLoggerService,
        UniversalLoggingMiddleware,
        UniversalLoggerConfig,
      ],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => ConfigInterface | Promise<ConfigInterface>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: UniversalLoggerModule,
      imports: [
        MongooseModule.forFeature([
          { name: 'LogEntry', schema: logEntrySchema },
        ]),
      ],
      providers: [
        {
          provide: UniversalLoggerConfig,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return config instanceof UniversalLoggerConfig
              ? config
              : new UniversalLoggerConfig(config);
          },
          inject: options.inject || [],
        },
        UniversalLoggerService,
        UniversalLoggingMiddleware,
      ],
      exports: [
        UniversalLoggerService,
        UniversalLoggingMiddleware,
        UniversalLoggerConfig,
      ],
    };
  }
}
