import { UniversalLoggerConfig as ConfigInterface } from './interfaces/config.interface';

export class UniversalLoggerConfig implements ConfigInterface {
  mongodb?: ConfigInterface['mongodb'];
  logging?: ConfigInterface['logging'];
  api?: ConfigInterface['api'];
  performance?: ConfigInterface['performance'];
  security?: ConfigInterface['security'];
  business?: ConfigInterface['business'];
  dashboard?: ConfigInterface['dashboard'];
  retention?: ConfigInterface['retention'];
  ttl?: ConfigInterface['ttl'];
  export?: ConfigInterface['export'];
  alerts?: ConfigInterface['alerts'];

  constructor(config: ConfigInterface = {}) {
    this.mongodb = config.mongodb;
    this.logging = config.logging;
    this.api = config.api;
    this.performance = config.performance;
    this.security = config.security;
    this.business = config.business;
    this.dashboard = config.dashboard;
    this.retention = config.retention;
    this.ttl = config.ttl;
    this.export = config.export;
    this.alerts = config.alerts;
  }

  getLoggingConfig(): Required<
    Pick<
      NonNullable<ConfigInterface['logging']>,
      | 'level'
      | 'serviceName'
      | 'environment'
      | 'version'
      | 'enableConsole'
      | 'enableFile'
      | 'logDirectory'
      | 'maxFileSize'
      | 'maxFiles'
    >
  > {
    return {
      level: this.logging?.level || 'info',
      serviceName: this.logging?.serviceName || 'default-service',
      environment: this.logging?.environment || 'development',
      version: this.logging?.version || '1.0.0',
      enableConsole: this.logging?.enableConsole !== false,
      enableFile: this.logging?.enableFile || false,
      logDirectory: this.logging?.logDirectory || './logs',
      maxFileSize: this.logging?.maxFileSize || 5242880,
      maxFiles: this.logging?.maxFiles || 5,
    };
  }

  getApiConfig(): Required<
    Pick<
      NonNullable<ConfigInterface['api']>,
      | 'enabled'
      | 'logRequests'
      | 'logResponses'
      | 'logHeaders'
      | 'logBody'
      | 'logQuery'
      | 'sensitiveHeaders'
      | 'excludePaths'
      | 'includePaths'
      | 'maxBodySize'
      | 'slowRequestThreshold'
    >
  > {
    return {
      enabled: this.api?.enabled !== false,
      logRequests: this.api?.logRequests !== false,
      logResponses: this.api?.logResponses !== false,
      logHeaders: this.api?.logHeaders !== false,
      logBody: this.api?.logBody !== false,
      logQuery: this.api?.logQuery !== false,
      sensitiveHeaders: this.api?.sensitiveHeaders || [
        'authorization',
        'cookie',
        'x-api-key',
      ],
      excludePaths: this.api?.excludePaths || [],
      includePaths: this.api?.includePaths || [],
      maxBodySize: this.api?.maxBodySize || 1024,
      slowRequestThreshold: this.api?.slowRequestThreshold || 1000,
    };
  }

  getSecurityConfig(): Required<
    Pick<
      NonNullable<ConfigInterface['security']>,
      | 'enabled'
      | 'trackAuthEvents'
      | 'trackFailedLogins'
      | 'trackSuspiciousActivity'
      | 'ipWhitelist'
      | 'ipBlacklist'
    >
  > {
    return {
      enabled: this.security?.enabled !== false,
      trackAuthEvents: this.security?.trackAuthEvents !== false,
      trackFailedLogins: this.security?.trackFailedLogins !== false,
      trackSuspiciousActivity: this.security?.trackSuspiciousActivity !== false,
      ipWhitelist: this.security?.ipWhitelist || [],
      ipBlacklist: this.security?.ipBlacklist || [],
    };
  }

  isFeatureEnabled(
    feature: 'api' | 'performance' | 'security' | 'business' | 'dashboard',
  ): boolean {
    switch (feature) {
      case 'api':
        return this.api?.enabled !== false;
      case 'performance':
        return this.performance?.enabled !== false;
      case 'security':
        return this.security?.enabled !== false;
      case 'business':
        return this.business?.enabled !== false;
      case 'dashboard':
        return this.dashboard?.enabled === true;
      default:
        return false;
    }
  }
}
