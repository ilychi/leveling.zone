declare module 'ip2location-nodejs' {
  export class IP2Location {
    constructor();
    open(dbPath: string): void;
    close(): void;
    getAll(ip: string): {
      countryShort?: string;
      countryLong?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      zipCode?: string;
      asn?: number;
      as?: string;
      provider?: string;
    };
  }
}
