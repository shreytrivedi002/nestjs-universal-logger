"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var UniversalLoggerModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalLoggerModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const universal_logger_service_1 = require("./universal-logger.service");
const universal_logging_middleware_1 = require("./universal-logging.middleware");
const universal_logger_controller_1 = require("./universal-logger.controller");
const universal_logger_config_1 = require("./universal-logger.config");
const log_entry_schema_1 = require("./schemas/log-entry.schema");
let UniversalLoggerModule = UniversalLoggerModule_1 = class UniversalLoggerModule {
    static forRoot(config) {
        return {
            module: UniversalLoggerModule_1,
            imports: [
                mongoose_1.MongooseModule.forFeature([
                    { name: 'LogEntry', schema: log_entry_schema_1.LogEntrySchema }
                ])
            ],
            providers: [
                {
                    provide: universal_logger_config_1.UniversalLoggerConfig,
                    useValue: new universal_logger_config_1.UniversalLoggerConfig(config)
                },
                universal_logger_service_1.UniversalLoggerService,
                universal_logging_middleware_1.UniversalLoggingMiddleware
            ],
            controllers: [universal_logger_controller_1.UniversalLoggerController],
            exports: [
                universal_logger_service_1.UniversalLoggerService,
                universal_logging_middleware_1.UniversalLoggingMiddleware,
                universal_logger_config_1.UniversalLoggerConfig
            ]
        };
    }
    static forRootAsync(options) {
        return {
            module: UniversalLoggerModule_1,
            imports: [
                mongoose_1.MongooseModule.forFeature([
                    { name: 'LogEntry', schema: log_entry_schema_1.LogEntrySchema }
                ])
            ],
            providers: [
                {
                    provide: universal_logger_config_1.UniversalLoggerConfig,
                    useFactory: options.useFactory,
                    inject: options.inject || []
                },
                universal_logger_service_1.UniversalLoggerService,
                universal_logging_middleware_1.UniversalLoggingMiddleware
            ],
            controllers: [universal_logger_controller_1.UniversalLoggerController],
            exports: [
                universal_logger_service_1.UniversalLoggerService,
                universal_logging_middleware_1.UniversalLoggingMiddleware,
                universal_logger_config_1.UniversalLoggerConfig
            ]
        };
    }
};
exports.UniversalLoggerModule = UniversalLoggerModule;
exports.UniversalLoggerModule = UniversalLoggerModule = UniversalLoggerModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], UniversalLoggerModule);
