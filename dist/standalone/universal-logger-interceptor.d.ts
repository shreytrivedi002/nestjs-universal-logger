import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UniversalLoggerClient } from './universal-logger-client';
import { UniversalLoggerConfig } from '../universal-logger.config';
export declare class UniversalLoggerInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly apiConfig;
    constructor(logger: UniversalLoggerClient, config?: UniversalLoggerConfig | Record<string, any>);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private logRequestStart;
    private logRequestSuccess;
    private logRequestError;
    private shouldExcludePath;
    private categorizeRequest;
    private sanitizeHeaders;
    private getClientIp;
    private generateRequestId;
}
