import { DynamicModule } from '@nestjs/common';
import { UniversalLoggerConfig as ConfigInterface } from './interfaces/config.interface';
/**
 * Legacy NestJS module API.
 *
 * Note: published builds referenced a UniversalLoggerController that was never
 * shipped on npm. That dependency is intentionally omitted so the module builds.
 * Prefer UniversalLoggerStandaloneModule for new integrations.
 */
export declare class UniversalLoggerModule {
    static forRoot(config?: ConfigInterface): DynamicModule;
    static forRootAsync(options: {
        useFactory: (...args: any[]) => ConfigInterface | Promise<ConfigInterface>;
        inject?: any[];
    }): DynamicModule;
}
