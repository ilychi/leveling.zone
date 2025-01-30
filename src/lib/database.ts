import path from 'path';
import { Reader } from '@maxmind/geoip2-node';
import { IP2Location } from 'ip2location-nodejs';
import { IP2LocationResult, IP2LocationResponse } from '../types/ip2location';

export interface IPQueryResult {
  city?: string;
  country?: string;
  region?: string;
  asn?: number;
  asnOrg?: string;
  continent?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    timezone?: string;
    zipcode?: string;
  };
  network?: {
    proxy?: boolean;
    isp?: string;
    domain?: string;
    usageType?: string;
  };
  source?: string[];
}

export class DatabaseService {
  private static instance: DatabaseService;
  // MaxMind 数据库
  private maxmindCity!: any;
  private maxmindASN!: any;
  // DB-IP 数据库
  private dbipCity!: any;
  private dbipASN!: any;
  // IPinfo 数据库
  private ipinfoCountryASN!: any;
  // IP2Location 数据库
  private ip2locationDB!: any;
  private ip2locationCity!: IP2Location;
  private ip2locationASN!: IP2Location;
  private ip2locationProxy!: IP2Location;
  // iptoasn 数据库
  private iptoasnV4!: any;
  private iptoasnV6!: any;

  private initialized: boolean = false;

  private constructor() {
    this.ip2locationCity = new IP2Location();
    this.ip2locationASN = new IP2Location();
    this.ip2locationProxy = new IP2Location();
  }

  static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      const instance = new DatabaseService();
      await instance.initialize();
      DatabaseService.instance = instance;
    }
    return DatabaseService.instance;
  }

  private isLocalAddress(ip: string): boolean {
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === 'localhost' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.')
    );
  }

  private async initialize() {
    if (this.initialized) return;

    const DB_DIR = path.join(process.cwd(), 'data', 'db');
    try {
      // 初始化 MaxMind 数据库
      this.maxmindCity = await Reader.open(path.join(DB_DIR, 'GeoLite2-City.mmdb'));
      this.maxmindASN = await Reader.open(path.join(DB_DIR, 'GeoLite2-ASN.mmdb'));

      // 初始化 DB-IP 数据库
      this.dbipCity = await Reader.open(path.join(DB_DIR, 'dbip-city-lite.mmdb'));
      this.dbipASN = await Reader.open(path.join(DB_DIR, 'dbip-asn-lite.mmdb'));

      // 初始化 IPinfo 数据库
      this.ipinfoCountryASN = await Reader.open(path.join(DB_DIR, 'ipinfo-country_asn.mmdb'));

      // 初始化 IP2Location 数据库（使用 BIN 格式）
      this.ip2locationCity.open(path.join(DB_DIR, 'IP2LOCATION-LITE-DB11.BIN'));
      this.ip2locationASN.open(path.join(DB_DIR, 'IP2LOCATION-LITE-ASN.BIN'));
      this.ip2locationProxy.open(path.join(DB_DIR, 'IP2LOCATION-LITE-PX11.BIN'));

      // 初始化 iptoasn 数据库
      this.iptoasnV4 = await Reader.open(path.join(DB_DIR, 'iptoasn-asn-ipv4.mmdb'));
      this.iptoasnV6 = await Reader.open(path.join(DB_DIR, 'iptoasn-asn-ipv6.mmdb'));

      this.initialized = true;
    } catch (error) {
      console.error('初始化数据库时出错:', error);
      throw error;
    }
  }

  async queryIP(ip: string): Promise<IPQueryResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    // 检查是否为本地地址
    if (this.isLocalAddress(ip)) {
      return {
        city: 'Local',
        country: 'Local Network',
        region: 'Local',
        asn: 0,
        asnOrg: 'Local Network',
        network: {
          proxy: false,
          isp: 'Local Network',
          domain: 'local',
          usageType: 'Local',
        },
        source: ['Local'],
      };
    }

    const result: IPQueryResult = {
      source: [],
    };

    // MaxMind 查询
    try {
      const cityResult = await this.maxmindCity.city(ip);
      const asnResult = await this.maxmindASN.asn(ip);

      result.city = cityResult.city?.names?.zh_CN || cityResult.city?.names?.en;
      result.country = cityResult.country?.names?.zh_CN || cityResult.country?.names?.en;
      result.continent = cityResult.continent?.names?.zh_CN || cityResult.continent?.names?.en;
      result.asn = asnResult.autonomousSystemNumber;
      result.asnOrg = asnResult.autonomousSystemOrganization;
      result.location = {
        latitude: cityResult.location?.latitude,
        longitude: cityResult.location?.longitude,
        timezone: cityResult.location?.timeZone,
      };
      result.source!.push('MaxMind');
    } catch (error) {
      console.error('MaxMind 查询失败:', error);
    }

    // IP2Location 查询
    try {
      const cityResult = this.ip2locationCity.getAll(ip);
      const asnResult = this.ip2locationASN.getAll(ip);
      const proxyResult = this.ip2locationProxy.getAll(ip);

      if (!result.city) result.city = cityResult.city;
      if (!result.country) result.country = cityResult.countryLong;
      if (!result.region) result.region = cityResult.region;

      if (!result.location) result.location = {};

      // 位置信息
      if (cityResult?.latitude !== undefined) {
        result.location.latitude = cityResult.latitude;
      }
      if (cityResult?.longitude !== undefined) {
        result.location.longitude = cityResult.longitude;
      }
      if (cityResult?.zipCode) {
        result.location.zipcode = cityResult.zipCode;
      }

      // 网络信息
      if (!result.network) result.network = {};
      if (cityResult?.provider) {
        result.network.isp = cityResult.provider;
      }
      if (cityResult?.asn) {
        result.asn = cityResult.asn;
      }

      result.source!.push('IP2Location');
    } catch (error) {
      console.error('IP2Location 查询失败:', error);
    }

    // iptoasn 查询
    try {
      const iptoasnDb = ip.includes(':') ? this.iptoasnV6 : this.iptoasnV4;
      const iptoasnResult = await iptoasnDb.asn(ip);

      if (!result.asn) result.asn = iptoasnResult.autonomousSystemNumber;
      if (!result.asnOrg) result.asnOrg = iptoasnResult.autonomousSystemOrganization;

      result.source!.push('iptoasn');
    } catch (error) {
      console.error('iptoasn 查询失败:', error);
    }

    // DB-IP 查询
    try {
      const cityResult = await this.dbipCity.city(ip);
      const asnResult = await this.dbipASN.asn(ip);

      if (!result.city) result.city = cityResult.city?.names?.en;
      if (!result.country) result.country = cityResult.country?.names?.en;
      if (!result.asn) result.asn = asnResult.autonomousSystemNumber;
      if (!result.asnOrg) result.asnOrg = asnResult.autonomousSystemOrganization;

      if (!result.location) result.location = {};
      if (!result.location.latitude) result.location.latitude = cityResult.location?.latitude;
      if (!result.location.longitude) result.location.longitude = cityResult.location?.longitude;

      result.source!.push('DB-IP');
    } catch (error) {
      console.error('DB-IP 查询失败:', error);
    }

    if (result.source!.length === 0) {
      throw new Error('所有数据源查询失败');
    }

    return result;
  }
}
