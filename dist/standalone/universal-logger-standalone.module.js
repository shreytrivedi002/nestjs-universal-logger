"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var UniversalLoggerStandaloneModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalLoggerStandaloneModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const core_1 = require("@nestjs/core");
const universal_logger_factory_1 = require("./universal-logger-factory");
const universal_logger_client_1 = require("./universal-logger-client");
const universal_logger_interceptor_1 = require("./universal-logger-interceptor");
const universal_logger_exception_filter_1 = require("./universal-logger-exception-filter");
const universal_logger_config_1 = require("../universal-logger.config");
const log_entry_schema_1 = require("../schemas/log-entry.schema");
const mongoose_2 = require("@nestjs/mongoose");
let UniversalLoggerStandaloneModule = UniversalLoggerStandaloneModule_1 = class UniversalLoggerStandaloneModule {
    static forRoot(config) {
        const serviceName = config?.logging?.serviceName || 'default-service';
        const collectionName = (0, log_entry_schema_1.getLogCollectionName)(serviceName);
        const modelName = `LogEntry_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const ttlConfig = config?.ttl;
        return {
            module: UniversalLoggerStandaloneModule_1,
            imports: [
                mongoose_1.MongooseModule.forFeature([
                    { name: modelName, schema: (0, log_entry_schema_1.createLogEntrySchema)(serviceName, ttlConfig), collection: collectionName }
                ])
            ],
            providers: [
                {
                    provide: universal_logger_config_1.UniversalLoggerConfig,
                    useValue: config || new universal_logger_config_1.UniversalLoggerConfig()
                },
                {
                    provide: universal_logger_factory_1.UniversalLoggerFactory,
                    useFactory: (logModel, config) => {
                        const factory = new universal_logger_factory_1.UniversalLoggerFactory(logModel);
                        factory.setConfig(config);
                        return factory;
                    },
                    inject: [(0, mongoose_2.getModelToken)(modelName), universal_logger_config_1.UniversalLoggerConfig]
                },
                {
                    provide: universal_logger_client_1.UniversalLoggerClient,
                    useFactory: (factory) => {
                        return new universal_logger_client_1.UniversalLoggerClient(factory, serviceName);
                    },
                    inject: [universal_logger_factory_1.UniversalLoggerFactory]
                },
                universal_logger_interceptor_1.UniversalLoggerInterceptor,
                universal_logger_exception_filter_1.UniversalLoggerExceptionFilter,
                {
                    provide: core_1.APP_INTERCEPTOR,
                    useClass: universal_logger_interceptor_1.UniversalLoggerInterceptor
                },
                {
                    provide: core_1.APP_FILTER,
                    useClass: universal_logger_exception_filter_1.UniversalLoggerExceptionFilter
                }
            ],
            exports: [
                universal_logger_factory_1.UniversalLoggerFactory,
                universal_logger_client_1.UniversalLoggerClient,
                universal_logger_interceptor_1.UniversalLoggerInterceptor,
                universal_logger_exception_filter_1.UniversalLoggerExceptionFilter
            ]
        };
    }
    static forRootAsync(options) {
        const serviceName = 'default-service';
        const collectionName = (0, log_entry_schema_1.getLogCollectionName)(serviceName);
        const modelName = `LogEntry_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        return {
            module: UniversalLoggerStandaloneModule_1,
            imports: [
                mongoose_1.MongooseModule.forFeature([
                    { name: modelName, schema: (0, log_entry_schema_1.createLogEntrySchema)(serviceName), collection: collectionName }
                ])
            ],
            providers: [
                {
                    provide: universal_logger_config_1.UniversalLoggerConfig,
                    useFactory: options.useFactory,
                    inject: options.inject || []
                },
                {
                    provide: universal_logger_factory_1.UniversalLoggerFactory,
                    useFactory: (logModel, config) => {
                        const factory = new universal_logger_factory_1.UniversalLoggerFactory(logModel);
                        factory.setConfig(config);
                        return factory;
                    },
                    inject: [(0, mongoose_2.getModelToken)(modelName), universal_logger_config_1.UniversalLoggerConfig]
                },
                {
                    provide: universal_logger_client_1.UniversalLoggerClient,
                    useFactory: (factory) => {
                        return new universal_logger_client_1.UniversalLoggerClient(factory, serviceName);
                    },
                    inject: [universal_logger_factory_1.UniversalLoggerFactory]
                },
                universal_logger_interceptor_1.UniversalLoggerInterceptor,
                universal_logger_exception_filter_1.UniversalLoggerExceptionFilter,
                {
                    provide: core_1.APP_INTERCEPTOR,
                    useClass: universal_logger_interceptor_1.UniversalLoggerInterceptor
                },
                {
                    provide: core_1.APP_FILTER,
                    useClass: universal_logger_exception_filter_1.UniversalLoggerExceptionFilter
                }
            ],
            exports: [
                universal_logger_factory_1.UniversalLoggerFactory,
                universal_logger_client_1.UniversalLoggerClient,
                universal_logger_interceptor_1.UniversalLoggerInterceptor,
                universal_logger_exception_filter_1.UniversalLoggerExceptionFilter
            ]
        };
    }
    static forService(serviceName, config) {
        const collectionName = (0, log_entry_schema_1.getLogCollectionName)(serviceName);
        const modelName = `LogEntry_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const ttlConfig = config?.ttl;
        return {
            module: UniversalLoggerStandaloneModule_1,
            imports: [
                mongoose_1.MongooseModule.forFeature([
                    { name: modelName, schema: (0, log_entry_schema_1.createLogEntrySchema)(serviceName, ttlConfig), collection: collectionName }
                ])
            ],
            providers: [
                {
                    provide: universal_logger_config_1.UniversalLoggerConfig,
                    useValue: config || new universal_logger_config_1.UniversalLoggerConfig()
                },
                {
                    provide: universal_logger_factory_1.UniversalLoggerFactory,
                    useFactory: (logModel, config) => {
                        const factory = new universal_logger_factory_1.UniversalLoggerFactory(logModel);
                        factory.setConfig(config);
                        return factory;
                    },
                    inject: [(0, mongoose_2.getModelToken)(modelName), universal_logger_config_1.UniversalLoggerConfig]
                },
                {
                    provide: universal_logger_client_1.UniversalLoggerClient,
                    useFactory: (factory) => {
                        return new universal_logger_client_1.UniversalLoggerClient(factory, serviceName);
                    },
                    inject: [universal_logger_factory_1.UniversalLoggerFactory]
                },
                universal_logger_interceptor_1.UniversalLoggerInterceptor,
                universal_logger_exception_filter_1.UniversalLoggerExceptionFilter,
                {
                    provide: core_1.APP_INTERCEPTOR,
                    useClass: universal_logger_interceptor_1.UniversalLoggerInterceptor
                },
                {
                    provide: core_1.APP_FILTER,
                    useClass: universal_logger_exception_filter_1.UniversalLoggerExceptionFilter
                }
            ],
            exports: [
                universal_logger_factory_1.UniversalLoggerFactory,
                universal_logger_client_1.UniversalLoggerClient,
                universal_logger_interceptor_1.UniversalLoggerInterceptor,
                universal_logger_exception_filter_1.UniversalLoggerExceptionFilter
            ]
        };
    }
};
exports.UniversalLoggerStandaloneModule = UniversalLoggerStandaloneModule;
exports.UniversalLoggerStandaloneModule = UniversalLoggerStandaloneModule = UniversalLoggerStandaloneModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], UniversalLoggerStandaloneModule);
