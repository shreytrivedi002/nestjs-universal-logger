import { UniversalLoggerConfig as ConfigInterface } from './interfaces/config.interface';
export declare class UniversalLoggerConfig implements ConfigInterface {
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
    batch?: ConfigInterface['batch'];
    constructor(config?: ConfigInterface);
    getLoggingConfig(): Required<Pick<NonNullable<ConfigInterface['logging']>, 'level' | 'serviceName' | 'environment' | 'version' | 'enableConsole' | 'enableFile' | 'logDirectory' | 'maxFileSize' | 'maxFiles'>>;
    getApiConfig(): Required<Pick<NonNullable<ConfigInterface['api']>, 'enabled' | 'logRequests' | 'logResponses' | 'logHeaders' | 'logBody' | 'logBodyMode' | 'logResponseBodyMode' | 'logQuery' | 'sensitiveHeaders' | 'excludePaths' | 'includePaths' | 'maxBodySize' | 'slowRequestThreshold'>>;
    getSecurityConfig(): Required<Pick<NonNullable<ConfigInterface['security']>, 'enabled' | 'trackAuthEvents' | 'trackFailedLogins' | 'trackSuspiciousActivity' | 'ipWhitelist' | 'ipBlacklist'>>;
    isFeatureEnabled(feature: 'api' | 'performance' | 'security' | 'business' | 'dashboard'): boolean;
}
