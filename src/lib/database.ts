import path from 'path';
import { Reader } from '@maxmind/geoip2-node';
import { IP2Location } from 'ip2location-nodejs';
import { IP2LocationResult, IP2LocationResponse } from '../types/ip2location';
import { DB_PATHS } from '@/constants/paths';

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

export class Database {
  private static instance: Database;
  private initialized = false;

  // MaxMind 数据库
  private maxmindCity: any;
  private maxmindASN: any;

  // DB-IP 数据库
  private dbipCity: any;
  private dbipASN: any;

  // IPinfo 数据库
  private ipinfoCountryASN: any;

  // IP2Location 数据库
  private ip2locationCity = new IP2Location();
  private ip2locationASN = new IP2Location();
  private ip2locationProxy = new IP2Location();

  // iptoasn 数据库
  private iptoasnV4: any;
  private iptoasnV6: any;

  private constructor() {}

  static async getInstance(): Promise<Database> {
    if (!Database.instance) {
      Database.instance = new Database();
      await Database.instance.initialize();
    }
    return Database.instance;
  }

  async query(ip: string): Promise<IPQueryResult> {
    await this.initialize();

    const result: IPQueryResult = {};
    const sources: string[] = [];

    // Query MaxMind
    try {
      const cityData = this.maxmindCity.city(ip);
      sources.push('maxmind');

      // Extract city information
      if (cityData) {
        result.city = cityData.city?.names?.en;
        result.country = cityData.country?.iso_code;
        result.region = cityData.subdivisions?.[0]?.iso_code;
        result.continent = cityData.continent?.names?.en;

        if (cityData.location) {
          result.location = {
            latitude: cityData.location.latitude,
            longitude: cityData.location.longitude,
            timezone: cityData.location.time_zone,
          };
        }
      }
    } catch (error) {
      // Silent fail for IP query
    }

    return { ...result, source: sources };
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      // 初始化 MaxMind 数据库
      this.maxmindCity = await Reader.open(DB_PATHS.MAXMIND.CITY);
      this.maxmindASN = await Reader.open(DB_PATHS.MAXMIND.ASN);

      // 初始化 DB-IP 数据库
      this.dbipCity = await Reader.open(DB_PATHS.DBIP.CITY);
      this.dbipASN = await Reader.open(DB_PATHS.DBIP.ASN);

      // 初始化 IPinfo 数据库
      this.ipinfoCountryASN = await Reader.open(DB_PATHS.IPINFO.COUNTRY_ASN);

      // 初始化 IP2Location 数据库（使用 BIN 格式）
      this.ip2locationCity.open(DB_PATHS.IP2LOCATION.CITY);
      this.ip2locationASN.open(DB_PATHS.IP2LOCATION.ASN);
      this.ip2locationProxy.open(DB_PATHS.IP2LOCATION.PROXY);

      // 初始化 iptoasn 数据库
      this.iptoasnV4 = await Reader.open(DB_PATHS.IPTOASN);
      // this.iptoasnV6 = await Reader.open(DB_PATHS.IPTOASN.IPV6);  // IPV6文件暂不使用

      this.initialized = true;
    } catch (error) {
      console.error('初始化数据库时出错:', error);
      throw error;
    }
  }
}
