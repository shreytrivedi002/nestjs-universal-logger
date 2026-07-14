import { DynamicModule } from '@nestjs/common';
import { UniversalLoggerConfig } from '../universal-logger.config';
export declare class UniversalLoggerStandaloneModule {
    static forRoot(config?: UniversalLoggerConfig): DynamicModule;
    static forRootAsync(options: {
        useFactory: (...args: any[]) => UniversalLoggerConfig | Promise<UniversalLoggerConfig>;
        inject?: any[];
    }): DynamicModule;
    static forService(serviceName: string, config?: UniversalLoggerConfig): DynamicModule;
}
