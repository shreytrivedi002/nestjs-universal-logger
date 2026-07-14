import { DynamicModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { UniversalLoggerStandalone } from './universal-logger-standalone';
import { UniversalLoggerFactory } from './universal-logger-factory';
import { UniversalLoggerClient } from './universal-logger-client';
import { UniversalLoggerInterceptor } from './universal-logger-interceptor';
import { UniversalLoggerExceptionFilter } from './universal-logger-exception-filter';
import { UniversalLoggerGuard } from './universal-logger-guard';
import { UniversalLoggerConfig } from '../universal-logger.config';
import { LogEntrySchema, createLogEntrySchema, getLogCollectionName } from '../schemas/log-entry.schema';
import { getModelToken } from '@nestjs/mongoose';

@Global()
@Module({})
export class UniversalLoggerStandaloneModule {
  static forRoot(config?: UniversalLoggerConfig): DynamicModule {
    const serviceName = config?.logging?.serviceName || 'default-service';
    const collectionName = getLogCollectionName(serviceName);
    const modelName = `LogEntry_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const ttlConfig = config?.ttl;

    return {
      module: UniversalLoggerStandaloneModule,
      imports: [
        MongooseModule.forFeature([
          { name: modelName, schema: createLogEntrySchema(serviceName, ttlConfig), collection: collectionName }
        ])
      ],
      providers: [
        {
          provide: UniversalLoggerConfig,
          useValue: config || new UniversalLoggerConfig()
        },
        {
          provide: UniversalLoggerFactory,
          useFactory: (logModel: any, config: UniversalLoggerConfig) => {
            const factory = new UniversalLoggerFactory(logModel);
            factory.setConfig(config);
            return factory;
          },
          inject: [getModelToken(modelName), UniversalLoggerConfig]
        },
        {
          provide: UniversalLoggerClient,
          useFactory: (factory: UniversalLoggerFactory) => {
            return new UniversalLoggerClient(factory, serviceName);
          },
          inject: [UniversalLoggerFactory]
        },
        UniversalLoggerInterceptor,
        UniversalLoggerExceptionFilter,
        // UniversalLoggerGuard, // Removed automatic guard registration
        {
          provide: APP_INTERCEPTOR,
          useClass: UniversalLoggerInterceptor
        },
        {
          provide: APP_FILTER,
          useClass: UniversalLoggerExceptionFilter
        }
        // Removed automatic guard registration - use manually if needed
      ],
      exports: [
        UniversalLoggerFactory,
        UniversalLoggerClient,
        UniversalLoggerInterceptor,
        UniversalLoggerExceptionFilter
        // UniversalLoggerGuard // Removed from exports
      ]
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => UniversalLoggerConfig | Promise<UniversalLoggerConfig>;
    inject?: any[];
  }): DynamicModule {
    const serviceName = 'default-service';
    const collectionName = getLogCollectionName(serviceName);
    const modelName = `LogEntry_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // For async config, we can't access TTL config at schema creation time
    // The TTL index will need to be created later when config is available
    return {
      module: UniversalLoggerStandaloneModule,
      imports: [
        MongooseModule.forFeature([
          { name: modelName, schema: createLogEntrySchema(serviceName), collection: collectionName }
        ])
      ],
      providers: [
        {
          provide: UniversalLoggerConfig,
          useFactory: options.useFactory,
          inject: options.inject || []
        },
        {
          provide: UniversalLoggerFactory,
          useFactory: (logModel: any, config: UniversalLoggerConfig) => {
            const factory = new UniversalLoggerFactory(logModel);
            factory.setConfig(config);
            return factory;
          },
          inject: [getModelToken(modelName), UniversalLoggerConfig]
        },
        {
          provide: UniversalLoggerClient,
          useFactory: (factory: UniversalLoggerFactory) => {
            return new UniversalLoggerClient(factory, serviceName);
          },
          inject: [UniversalLoggerFactory]
        },
        UniversalLoggerInterceptor,
        UniversalLoggerExceptionFilter,
        // UniversalLoggerGuard, // Removed automatic guard registration
        {
          provide: APP_INTERCEPTOR,
          useClass: UniversalLoggerInterceptor
        },
        {
          provide: APP_FILTER,
          useClass: UniversalLoggerExceptionFilter
        }
        // Removed automatic guard registration - use manually if needed
      ],
      exports: [
        UniversalLoggerFactory,
        UniversalLoggerClient,
        UniversalLoggerInterceptor,
        UniversalLoggerExceptionFilter
        // UniversalLoggerGuard // Removed from exports
      ]
    };
  }

  static forService(serviceName: string, config?: UniversalLoggerConfig): DynamicModule {
    const collectionName = getLogCollectionName(serviceName);
    const modelName = `LogEntry_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const ttlConfig = config?.ttl;

    return {
      module: UniversalLoggerStandaloneModule,
      imports: [
        MongooseModule.forFeature([
          { name: modelName, schema: createLogEntrySchema(serviceName, ttlConfig), collection: collectionName }
        ])
      ],
      providers: [
        {
          provide: UniversalLoggerConfig,
          useValue: config || new UniversalLoggerConfig()
        },
        {
          provide: UniversalLoggerFactory,
          useFactory: (logModel: any, config: UniversalLoggerConfig) => {
            const factory = new UniversalLoggerFactory(logModel);
            factory.setConfig(config);
            return factory;
          },
          inject: [getModelToken(modelName), UniversalLoggerConfig]
        },
        {
          provide: UniversalLoggerClient,
          useFactory: (factory: UniversalLoggerFactory) => {
            return new UniversalLoggerClient(factory, serviceName);
          },
          inject: [UniversalLoggerFactory]
        },
        UniversalLoggerInterceptor,
        UniversalLoggerExceptionFilter,
        // UniversalLoggerGuard, // Removed automatic guard registration
        {
          provide: APP_INTERCEPTOR,
          useClass: UniversalLoggerInterceptor
        },
        {
          provide: APP_FILTER,
          useClass: UniversalLoggerExceptionFilter
        }
        // Removed automatic guard registration - use manually if needed
      ],
      exports: [
        UniversalLoggerFactory,
        UniversalLoggerClient,
        UniversalLoggerInterceptor,
        UniversalLoggerExceptionFilter
        // UniversalLoggerGuard // Removed from exports
      ]
    };
  }
}
