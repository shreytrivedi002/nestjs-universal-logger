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
    constructor(config?: ConfigInterface);
}
