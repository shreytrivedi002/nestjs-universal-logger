import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { UniversalLoggerClient } from './universal-logger-client';

@Injectable()
export class UniversalLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: UniversalLoggerClient) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = performance.now();

    // Generate request ID if not present
    if (!request.headers['x-request-id']) {
      request.headers['x-request-id'] = this.generateRequestId();
    }

    const requestId = request.headers['x-request-id'] as string;
    const method = request.method;
    const url = request.originalUrl || request.url;
    const userAgent = request.headers['user-agent'] || '';
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;

    // Log request start with payload
    this.logRequestStart(request, requestId, method, url, ip, userAgent, userId);

    return next.handle().pipe(
      tap((data) => {
        const duration = performance.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful response with payload
        this.logRequestSuccess(request, response, data, duration, requestId, method, url, statusCode, ip, userAgent, userId);
      }),
      catchError((error) => {
        const duration = performance.now() - startTime;
        const statusCode = response.statusCode || 500;

        // Log error response with details
        this.logRequestError(request, response, error, duration, requestId, method, url, statusCode, ip, userAgent, userId);

        throw error;
      })
    );
  }

  private logRequestStart(
    request: Request,
    requestId: string,
    method: string,
    url: string,
    ip: string,
    userAgent: string,
    userId?: string
  ): void {
    const category = this.categorizeRequest(method, url);

    this.logger.log(`API Request Started: ${method} ${url}`, 'API', {
      requestId,
      method,
      url,
      ip,
      userAgent,
      userId,
      category,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query,
      body: this.sanitizeBody(request.body),
      timestamp: new Date().toISOString()
    });
  }

  private logRequestSuccess(
    request: Request,
    response: Response,
    data: any,
    duration: number,
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    ip: string,
    userAgent: string,
    userId?: string
  ): void {
    const category = this.categorizeRequest(method, url);

    this.logger.log(`API Request Completed: ${method} ${url}`, 'API', {
      requestId,
      method,
      url,
      statusCode,
      duration: Math.round(duration),
      ip,
      userAgent,
      userId,
      category,
      responseHeaders: this.sanitizeHeaders(response.getHeaders()),
      responseBody: this.sanitizeResponseBody(data, statusCode),
      timestamp: new Date().toISOString()
    });
  }

  private logRequestError(
    request: Request,
    response: Response,
    error: any,
    duration: number,
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    ip: string,
    userAgent: string,
    userId?: string
  ): void {
    const category = this.categorizeRequest(method, url);

    this.logger.error(
      `API Request Failed: ${method} ${url}`,
      error.stack,
      'API',
      {
        requestId,
        method,
        url,
        statusCode,
        duration: Math.round(duration),
        ip,
        userAgent,
        userId,
        category,
        errorName: error.name,
        errorMessage: error.message,
        requestBody: this.sanitizeBody(request.body),
        requestHeaders: this.sanitizeHeaders(request.headers),
        timestamp: new Date().toISOString()
      }
    );
  }

  private categorizeRequest(method: string, url: string): string {
    const path = url.toLowerCase();

    // Authentication & Authorization
    if (path.includes('/auth') || path.includes('/login') || path.includes('/register') || path.includes('/logout')) {
      return 'AUTH';
    }

    // User Management
    if (path.includes('/users') || path.includes('/user') || path.includes('/profile')) {
      return 'USER_MANAGEMENT';
    }

    // Payment & Billing
    if (path.includes('/payment') || path.includes('/billing') || path.includes('/invoice') || path.includes('/subscription')) {
      return 'PAYMENT';
    }

    // File Operations
    if (path.includes('/upload') || path.includes('/file') || path.includes('/image') || path.includes('/document')) {
      return 'FILE_OPERATIONS';
    }

    // Data Operations
    if (path.includes('/data') || path.includes('/export') || path.includes('/import') || path.includes('/report')) {
      return 'DATA_OPERATIONS';
    }

    // Search & Query
    if (path.includes('/search') || path.includes('/query') || path.includes('/filter')) {
      return 'SEARCH';
    }

    // Health & Monitoring
    if (path.includes('/health') || path.includes('/status') || path.includes('/metrics')) {
      return 'HEALTH';
    }

    // Admin Operations
    if (path.includes('/admin') || path.includes('/management') || path.includes('/config')) {
      return 'ADMIN';
    }

    // API Operations
    if (path.includes('/api/')) {
      return 'API';
    }

    // Default categorization
    return 'GENERAL';
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-refresh-token'
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'credential',
      'ssn',
      'credit_card',
      'card_number'
    ];

    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeResponseBody(data: any, statusCode: number): any {
    if (!data) return undefined;

    // Don't log response body for large responses or binary data
    const dataStr = JSON.stringify(data);
    if (dataStr.length > 10000) {
      return { message: '[RESPONSE_TOO_LARGE]', size: dataStr.length };
    }

    // Don't log binary data
    if (typeof data === 'string' && data.includes('')) {
      return { message: '[BINARY_DATA]' };
    }

    return data;
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

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
