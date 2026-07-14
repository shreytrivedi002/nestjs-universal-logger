import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { UniversalLoggerService } from './universal-logger.service';
import { UniversalLoggerConfig } from './universal-logger.config';

@Injectable()
export class UniversalLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: UniversalLoggerService,
    private readonly config: UniversalLoggerConfig,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.config.isFeatureEnabled('api')) {
      return next();
    }

    const apiConfig = this.config.getApiConfig();
    const start = performance.now();
    const requestId =
      (req.headers['x-request-id'] as string) || this.generateRequestId();

    res.setHeader('x-request-id', requestId);

    if (this.shouldExcludePath(req.originalUrl, apiConfig.excludePaths)) {
      return next();
    }

    if (
      apiConfig.includePaths.length > 0 &&
      !this.shouldIncludePath(req.originalUrl, apiConfig.includePaths)
    ) {
      return next();
    }

    this.logger.log(`Request started: ${req.method} ${req.originalUrl}`, 'HTTP', {
      requestId,
      userId: (req as any).user?.id,
      sessionId: (req as any).session?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      const duration = performance.now() - start;
      this.logger.logApiCall(req, res, duration, res.statusCode);
      this.logSecurityEvents(req, res, duration);
      return originalSend(body);
    };

    res.on('finish', () => {
      const duration = performance.now() - start;

      if (this.config.isFeatureEnabled('performance')) {
        this.logger.logPerformance(`${req.method} ${req.originalUrl}`, duration, {
          requestId,
          statusCode: res.statusCode,
        });
      }

      if (Math.random() < 0.01) {
        this.logger.logSystemMetrics();
      }
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldExcludePath(path: string, excludePaths: string[]): boolean {
    return excludePaths.some((excludePath) => {
      if (excludePath.endsWith('*')) {
        return path.startsWith(excludePath.slice(0, -1));
      }
      return path === excludePath;
    });
  }

  private shouldIncludePath(path: string, includePaths: string[]): boolean {
    return includePaths.some((includePath) => {
      if (includePath.endsWith('*')) {
        return path.startsWith(includePath.slice(0, -1));
      }
      return path === includePath;
    });
  }

  private logSecurityEvents(req: Request, res: Response, _duration: number): void {
    if (!this.config.isFeatureEnabled('security')) return;

    const securityConfig = this.config.getSecurityConfig();

    if (res.statusCode === 401) {
      this.logger.logSecurity('Unauthorized access attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.originalUrl,
        method: req.method,
      });
    }

    if (res.statusCode === 403) {
      this.logger.logSecurity('Forbidden access attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.originalUrl,
        method: req.method,
        userId: (req as any).user?.id,
      });
    }

    if (securityConfig.ipBlacklist.includes(req.ip || '')) {
      this.logger.logSecurity('Blocked IP access attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.originalUrl,
      });
    }

    if (this.isSuspiciousActivity(req)) {
      this.logger.logSecurity('Suspicious activity detected', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.originalUrl,
        method: req.method,
        reason: 'Multiple rapid requests',
      });
    }
  }

  private isSuspiciousActivity(req: Request): boolean {
    const suspiciousPatterns = [/\.\.\//, /<script/i, /union\s+select/i, /eval\s*\(/i];
    const path = req.originalUrl.toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();

    return suspiciousPatterns.some(
      (pattern) => pattern.test(path) || pattern.test(userAgent),
    );
  }
}
