import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UniversalLoggerClient } from './universal-logger-client';
export declare class UniversalLoggerInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: UniversalLoggerClient);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private logRequestStart;
    private logRequestSuccess;
    private logRequestError;
    private categorizeRequest;
    private sanitizeHeaders;
    private sanitizeBody;
    private sanitizeResponseBody;
    private getClientIp;
    private generateRequestId;
}
