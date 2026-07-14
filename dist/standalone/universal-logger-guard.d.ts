import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UniversalLoggerClient } from './universal-logger-client';
export declare class UniversalLoggerGuard implements CanActivate {
    private readonly logger;
    constructor(logger: UniversalLoggerClient);
    canActivate(context: ExecutionContext): boolean;
    private validateAuthentication;
    private extractToken;
    private getTokenType;
    private getClientIp;
}
