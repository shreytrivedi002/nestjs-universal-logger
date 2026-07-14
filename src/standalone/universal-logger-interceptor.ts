import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { UniversalLoggerClient } from './universal-logger-client';
import { UniversalLoggerConfig } from '../universal-logger.config';
import {
  getMaxBodySize,
  prepareLogBody,
  resolveRequestBodyMode,
  resolveResponseBodyMode,
  shouldLogBody,
} from './body-utils';

@Injectable()
export class UniversalLoggerInterceptor implements NestInterceptor {
  private readonly apiConfig: NonNullable<import('../interfaces/config.interface').UniversalLoggerConfig['api']>;

  constructor(
    private readonly logger: UniversalLoggerClient,
    @Optional() @Inject(UniversalLoggerConfig) config?: UniversalLoggerConfig | Record<string, any>,
  ) {
    this.apiConfig = (config as any)?.api || {};
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (this.apiConfig.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const url = request.originalUrl || request.url;

    if (this.shouldExcludePath(url)) {
      return next.handle();
    }

    const startTime = performance.now();

    if (!request.headers['x-request-id']) {
      request.headers['x-request-id'] = this.generateRequestId();
    }

    const requestId = request.headers['x-request-id'] as string;
    const method = request.method;
    const userAgent = request.headers['user-agent'] || '';
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;

    // Request-start logs omit bodies when mode is 'errors' (status unknown yet)
    this.logRequestStart(request, requestId, method, url, ip, userAgent, userId);

    return next.handle().pipe(
      tap((data) => {
        const duration = performance.now() - startTime;
        const statusCode = response.statusCode;
        this.logRequestSuccess(
          request,
          response,
          data,
          duration,
          requestId,
          method,
          url,
          statusCode,
          ip,
          userAgent,
          userId,
        );
      }),
      catchError((error) => {
        const duration = performance.now() - startTime;
        const statusCode = response.statusCode || error?.status || 500;
        this.logRequestError(
          request,
          response,
          error,
          duration,
          requestId,
          method,
          url,
          statusCode,
          ip,
          userAgent,
          userId,
        );
        throw error;
      }),
    );
  }

  private logRequestStart(
    request: Request,
    requestId: string,
    method: string,
    url: string,
    ip: string,
    userAgent: string,
    userId?: string,
  ): void {
    if (this.apiConfig.logRequests === false) {
      return;
    }

    const category = this.categorizeRequest(method, url);
    const bodyMode = resolveRequestBodyMode(this.apiConfig);
    // On start we only attach bodies when mode is 'all'
    const includeBody = shouldLogBody(bodyMode, undefined, false) && bodyMode === 'all';

    this.logger.log(`API Request Started: ${method} ${url}`, 'API', {
      requestId,
      method,
      url,
      ip,
      userAgent,
      userId,
      category,
      headers: this.apiConfig.logHeaders === false ? undefined : this.sanitizeHeaders(request.headers),
      query: this.apiConfig.logQuery === false ? undefined : request.query,
      body: includeBody
        ? prepareLogBody(request.body, getMaxBodySize(this.apiConfig))
        : undefined,
      timestamp: new Date().toISOString(),
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
    userId?: string,
  ): void {
    const category = this.categorizeRequest(method, url);
    const requestBodyMode = resolveRequestBodyMode(this.apiConfig);
    const responseBodyMode = resolveResponseBodyMode(this.apiConfig);
    const includeRequestBody = shouldLogBody(requestBodyMode, statusCode);
    const includeResponseBody =
      this.apiConfig.logResponses !== false && shouldLogBody(responseBodyMode, statusCode);

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
      responseHeaders:
        this.apiConfig.logHeaders === false ? undefined : this.sanitizeHeaders(response.getHeaders()),
      requestBody: includeRequestBody
        ? prepareLogBody(request.body, getMaxBodySize(this.apiConfig))
        : undefined,
      responseBody: includeResponseBody
        ? prepareLogBody(data, getMaxBodySize(this.apiConfig))
        : undefined,
      timestamp: new Date().toISOString(),
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
    userId?: string,
  ): void {
    const category = this.categorizeRequest(method, url);
    const requestBodyMode = resolveRequestBodyMode(this.apiConfig);
    const includeRequestBody = shouldLogBody(requestBodyMode, statusCode, true);

    this.logger.error(`API Request Failed: ${method} ${url}`, error?.stack, 'API', {
      requestId,
      method,
      url,
      statusCode,
      duration: Math.round(duration),
      ip,
      userAgent,
      userId,
      category,
      errorName: error?.name,
      errorMessage: error?.message,
      requestBody: includeRequestBody
        ? prepareLogBody(request.body, getMaxBodySize(this.apiConfig))
        : undefined,
      requestHeaders:
        this.apiConfig.logHeaders === false ? undefined : this.sanitizeHeaders(request.headers),
      timestamp: new Date().toISOString(),
    });
  }

  private shouldExcludePath(path: string): boolean {
    const excludePaths = this.apiConfig.excludePaths || [];
    return excludePaths.some((excludePath) => {
      if (excludePath.endsWith('*')) {
        return path.startsWith(excludePath.slice(0, -1));
      }
      return path === excludePath;
    });
  }

  private categorizeRequest(method: string, url: string): string {
    const path = url.toLowerCase();

    if (path.includes('/auth') || path.includes('/login') || path.includes('/register') || path.includes('/logout')) {
      return 'AUTH';
    }
    if (path.includes('/users') || path.includes('/user') || path.includes('/profile')) {
      return 'USER_MANAGEMENT';
    }
    if (path.includes('/payment') || path.includes('/billing') || path.includes('/invoice') || path.includes('/subscription')) {
      return 'PAYMENT';
    }
    if (path.includes('/upload') || path.includes('/file') || path.includes('/image') || path.includes('/document')) {
      return 'FILE_OPERATIONS';
    }
    if (path.includes('/data') || path.includes('/export') || path.includes('/import') || path.includes('/report')) {
      return 'DATA_OPERATIONS';
    }
    if (path.includes('/search') || path.includes('/query') || path.includes('/filter')) {
      return 'SEARCH';
    }
    if (path.includes('/health') || path.includes('/status') || path.includes('/metrics')) {
      return 'HEALTH';
    }
    if (path.includes('/admin') || path.includes('/management') || path.includes('/config')) {
      return 'ADMIN';
    }
    if (path.includes('/api/')) {
      return 'API';
    }
    return 'GENERAL';
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = this.apiConfig.sensitiveHeaders || [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-refresh-token',
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
