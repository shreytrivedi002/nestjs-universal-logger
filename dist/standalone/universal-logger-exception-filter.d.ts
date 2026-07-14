import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { UniversalLoggerClient } from './universal-logger-client';
export declare class UniversalLoggerExceptionFilter implements ExceptionFilter {
    private readonly logger;
    constructor(logger: UniversalLoggerClient);
    catch(exception: unknown, host: ArgumentsHost): void;
    private categorizeError;
    private isDatabaseError;
    private isExternalServiceError;
    private sanitizeHeaders;
    private sanitizeBody;
    private getClientIp;
}
