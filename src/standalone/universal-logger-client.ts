import { Injectable } from '@nestjs/common';
import { UniversalLoggerStandalone } from './universal-logger-standalone';
import { UniversalLoggerFactory } from './universal-logger-factory';

@Injectable()
export class UniversalLoggerClient {
  private logger: UniversalLoggerStandalone;

  constructor(
    private readonly factory: UniversalLoggerFactory,
    serviceName: string = 'default-service',
    environment?: string,
    version?: string
  ) {
    this.logger = this.factory.createLogger(serviceName, environment, version);
  }

  // Core logging methods
  async log(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.log(message, context, metadata);
  }

  async error(message: string, trace?: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.error(message, trace, context, metadata);
  }

  async warn(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.warn(message, context, metadata);
  }

  async debug(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.debug(message, context, metadata);
  }

  async verbose(message: string, context?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.verbose(message, context, metadata);
  }

  // API Call Logging
  async logApiCall(req: any, res: any, duration: number, statusCode: number): Promise<void> {
    await this.logger.logApiCall(req, res, duration, statusCode);
  }

  // Performance Logging
  async logPerformance(operation: string, duration: number, metadata?: Record<string, any>): Promise<void> {
    await this.logger.logPerformance(operation, duration, metadata);
  }

  async logDatabaseQuery(query: string, duration: number, table?: string, operation?: string): Promise<void> {
    await this.logger.logDatabaseQuery(query, duration, table, operation);
  }

  async logExternalCall(url: string, method: string, duration: number, statusCode: number, response?: any): Promise<void> {
    await this.logger.logExternalCall(url, method, duration, statusCode, response);
  }

  // Security Logging
  async logSecurity(event: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.logSecurity(event, metadata);
  }

  async logAuthEvent(event: string, userId?: string, success: boolean = true, metadata?: Record<string, any>): Promise<void> {
    await this.logger.logAuthEvent(event, userId, success, metadata);
  }

  // Business Logic Logging
  async logBusinessLogic(operation: string, data: any, context?: string): Promise<void> {
    await this.logger.logBusinessLogic(operation, data, context);
  }

  async logUserAction(action: string, userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.logUserAction(action, userId, metadata);
  }

  async logFeatureUsage(feature: string, userId?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.logFeatureUsage(feature, userId, metadata);
  }

  // System Metrics Logging
  async logSystemMetrics(): Promise<void> {
    await this.logger.logSystemMetrics();
  }

  // Query methods
  async getLogs(query: any): Promise<any[]> {
    return this.logger.getLogs(query);
  }

  async getLogStats(timeRange: { start: Date; end: Date }): Promise<any> {
    return this.logger.getLogStats(timeRange);
  }

  async getErrorTrends(days: number = 7): Promise<any> {
    return this.logger.getErrorTrends(days);
  }

  async getTopErrors(limit: number = 10, days: number = 7): Promise<any> {
    return this.logger.getTopErrors(limit, days);
  }

  async getPerformanceMetrics(hours: number = 24): Promise<any> {
    return this.logger.getPerformanceMetrics(hours);
  }

  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    return this.logger.cleanupOldLogs(daysToKeep);
  }

  // Convenience methods for common logging patterns
  async logUserLogin(userId: string, success: boolean, metadata?: Record<string, any>): Promise<void> {
    await this.logAuthEvent('login', userId, success, metadata);
  }

  async logUserLogout(userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.logAuthEvent('logout', userId, true, metadata);
  }

  async logUserRegistration(userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.logBusinessLogic('User Registration', { userId, ...metadata });
    await this.logUserAction('user_registered', userId, metadata);
  }

  async logUserProfileUpdate(userId: string, changes: Record<string, any>): Promise<void> {
    await this.logUserAction('profile_updated', userId, { changes });
  }

  async logPayment(userId: string, amount: number, currency: string, metadata?: Record<string, any>): Promise<void> {
    await this.logBusinessLogic('Payment', { userId, amount, currency, ...metadata });
    await this.logUserAction('payment_made', userId, { amount, currency, ...metadata });
  }

  async logErrorWithContext(error: Error, context: string, metadata?: Record<string, any>): Promise<void> {
    await this.error(error.message, error.stack, context, {
      errorName: error.name,
      errorCode: (error as any).code,
      ...metadata
    });
  }

  async logSlowOperation(operation: string, duration: number, threshold: number = 1000, metadata?: Record<string, any>): Promise<void> {
    if (duration > threshold) {
      await this.warn(`Slow operation: ${operation} took ${duration}ms`, 'PERFORMANCE', {
        operation,
        duration,
        threshold,
        ...metadata
      });
    } else {
      await this.logPerformance(operation, duration, metadata);
    }
  }

  async logDatabaseOperation(operation: string, table: string, duration: number, query?: string): Promise<void> {
    await this.logger.logDatabaseQuery(query || operation, duration, table, operation);
  }

  async logExternalApiCall(url: string, method: string, duration: number, statusCode: number, response?: any): Promise<void> {
    await this.logger.logExternalCall(url, method, duration, statusCode, response);
  }

  async logSecurityViolation(event: string, ip?: string, userAgent?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logger.logSecurity(event, {
      ip,
      userAgent,
      ...metadata
    });
  }

  async logBusinessMetric(metric: string, value: number, metadata?: Record<string, any>): Promise<void> {
    await this.logBusinessLogic(`Business Metric: ${metric}`, {
      metric,
      value,
      ...metadata
    });
  }

  async logFeatureAccess(feature: string, userId: string, success: boolean, metadata?: Record<string, any>): Promise<void> {
    await this.logFeatureUsage(feature, userId, {
      success,
      ...metadata
    });
  }
}
