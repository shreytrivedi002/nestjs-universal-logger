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
}
