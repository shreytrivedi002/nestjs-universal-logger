import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { UniversalLoggerClient } from './universal-logger-client';

@Injectable()
export class UniversalLoggerExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: UniversalLoggerClient) { }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorName = exception instanceof Error ? exception.name : 'UnknownError';
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    const requestId = request.headers['x-request-id'] as string;
    const method = request.method;
    const url = request.originalUrl || request.url;
    const userAgent = request.headers['user-agent'] || '';
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;

    // Categorize the error
    const category = this.categorizeError(status, errorName, url);

    // Log the error with full context
    this.logger.error(
      `Exception occurred: ${method} ${url}`,
      errorStack,
      'ERROR',
      {
        requestId,
        method,
        url,
        statusCode: status,
        ip,
        userAgent,
        userId,
        category,
        errorName,
        errorMessage: typeof message === 'string' ? message : JSON.stringify(message),
        errorCode: (exception as any).code,
        requestBody: this.sanitizeBody(request.body),
        requestHeaders: this.sanitizeHeaders(request.headers),
        query: request.query,
        timestamp: new Date().toISOString()
      }
    );

    // Log security events for certain errors
    if (status === 401 || status === 403) {
      this.logger.logSecurityViolation(
        `Unauthorized access: ${method} ${url}`,
        ip,
        userAgent,
        {
          requestId,
          statusCode: status,
          userId,
          category,
          errorName
        }
      );
    }

    // Log rate limiting errors
    if (status === 429) {
      this.logger.logSecurityViolation(
        `Rate limit exceeded: ${method} ${url}`,
        ip,
        userAgent,
        {
          requestId,
          statusCode: status,
          userId,
          category,
          errorName
        }
      );
    }

    // Log validation errors
    if (status === 400 && errorName === 'BadRequestException') {
      this.logger.log('Validation error occurred', 'VALIDATION', {
        requestId,
        method,
        url,
        statusCode: status,
        category,
        errorName,
        errorMessage: typeof message === 'string' ? message : JSON.stringify(message)
      });
    }

    // Log database errors
    if (this.isDatabaseError(errorName)) {
      this.logger.error(
        `Database error: ${method} ${url}`,
        errorStack,
        'DATABASE_ERROR',
        {
          requestId,
          method,
          url,
          statusCode: status,
          category,
          errorName,
          errorMessage: typeof message === 'string' ? message : JSON.stringify(message)
        }
      );
    }

    // Log external service errors
    if (this.isExternalServiceError(errorName)) {
      this.logger.error(
        `External service error: ${method} ${url}`,
        errorStack,
        'EXTERNAL_SERVICE_ERROR',
        {
          requestId,
          method,
          url,
          statusCode: status,
          category,
          errorName,
          errorMessage: typeof message === 'string' ? message : JSON.stringify(message)
        }
      );
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message || 'Internal server error',
      requestId
    });
  }

  private categorizeError(status: number, errorName: string, url: string): string {
    const path = url.toLowerCase();

    // Authentication errors
    if (status === 401 || status === 403) {
      return 'AUTH_ERROR';
    }

    // Validation errors
    if (status === 400) {
      return 'VALIDATION_ERROR';
    }

    // Not found errors
    if (status === 404) {
      return 'NOT_FOUND_ERROR';
    }

    // Rate limiting errors
    if (status === 429) {
      return 'RATE_LIMIT_ERROR';
    }

    // Server errors
    if (status >= 500) {
      if (this.isDatabaseError(errorName)) {
        return 'DATABASE_ERROR';
      }
      if (this.isExternalServiceError(errorName)) {
        return 'EXTERNAL_SERVICE_ERROR';
      }
      return 'SERVER_ERROR';
    }

    // Client errors
    if (status >= 400) {
      return 'CLIENT_ERROR';
    }

    return 'GENERAL_ERROR';
  }

  private isDatabaseError(errorName: string): boolean {
    const databaseErrors = [
      'MongoError',
      'MongooseError',
      'SequelizeError',
      'TypeORMError',
      'PrismaError',
      'DatabaseError',
      'ConnectionError',
      'QueryError'
    ];

    return databaseErrors.some(name => errorName.includes(name));
  }

  private isExternalServiceError(errorName: string): boolean {
    const externalServiceErrors = [
      'AxiosError',
      'FetchError',
      'HttpException',
      'ExternalServiceError',
      'APIError',
      'NetworkError',
      'TimeoutError'
    ];

    return externalServiceErrors.some(name => errorName.includes(name));
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
