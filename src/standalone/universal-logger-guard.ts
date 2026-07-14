import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { UniversalLoggerClient } from './universal-logger-client';

@Injectable()
export class UniversalLoggerGuard implements CanActivate {
  constructor(private readonly logger: UniversalLoggerClient) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.originalUrl || request.url;
    const userAgent = request.headers['user-agent'] || '';
    const ip = this.getClientIp(request);
    const requestId = request.headers['x-request-id'] as string;

    // Extract authentication info
    const authHeader = request.headers.authorization;
    const token = this.extractToken(authHeader);
    const userId = (request as any).user?.id;

    // Log authentication attempt
    this.logger.log('Authentication check started', 'AUTH', {
      requestId,
      method,
      url,
      ip,
      userAgent,
      userId,
      hasToken: !!token,
      tokenType: this.getTokenType(authHeader),
      timestamp: new Date().toISOString()
    });

    try {
      // Your authentication logic here
      const isAuthenticated = this.validateAuthentication(request);

      if (isAuthenticated) {
        // Log successful authentication
        this.logger.logAuthEvent('authentication_success', userId, true, {
          requestId,
          method,
          url,
          ip,
          userAgent,
          tokenType: this.getTokenType(authHeader)
        });

        return true;
      } else {
        // Log failed authentication
        this.logger.logAuthEvent('authentication_failed', userId, false, {
          requestId,
          method,
          url,
          ip,
          userAgent,
          reason: 'invalid_token',
          tokenType: this.getTokenType(authHeader)
        });

        throw new UnauthorizedException('Invalid authentication token');
      }
    } catch (error) {
      // Log authentication error
      this.logger.logAuthEvent('authentication_error', userId, false, {
        requestId,
        method,
        url,
        ip,
        userAgent,
        errorName: error.name,
        errorMessage: error.message,
        tokenType: this.getTokenType(authHeader)
      });

      throw error;
    }
  }

  private validateAuthentication(request: Request): boolean {
    // This is a placeholder - implement your actual authentication logic
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return false;
    }

    // Example: Check if token is valid
    const token = this.extractToken(authHeader);
    if (!token) {
      return false;
    }

    // Add your token validation logic here
    // For example: verify JWT, check against database, etc.

    return true; // Placeholder - replace with actual validation
  }

  private extractToken(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return null;
    }

    return parts[1];
  }

  private getTokenType(authHeader?: string): string {
    if (!authHeader) {
      return 'none';
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return 'invalid';
    }

    return parts[0].toLowerCase();
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
