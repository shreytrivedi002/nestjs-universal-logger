import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UniversalLoggerService } from './universal-logger.service';
import { UniversalLoggerConfig } from './universal-logger.config';
export declare class UniversalLoggingMiddleware implements NestMiddleware {
    private readonly logger;
    private readonly config;
    constructor(logger: UniversalLoggerService, config: UniversalLoggerConfig);
    use(req: Request, res: Response, next: NextFunction): void;
    private generateRequestId;
    private shouldExcludePath;
    private shouldIncludePath;
    private logSecurityEvents;
    private isSuspiciousActivity;
}
