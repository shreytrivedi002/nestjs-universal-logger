import { DynamicModule } from '@nestjs/common';
import { UniversalLoggerConfig as ConfigInterface } from './interfaces/config.interface';
export declare class UniversalLoggerModule {
    static forRoot(config?: ConfigInterface): DynamicModule;
    static forRootAsync(options: {
        useFactory: (...args: any[]) => ConfigInterface | Promise<ConfigInterface>;
        inject?: any[];
    }): DynamicModule;
}
