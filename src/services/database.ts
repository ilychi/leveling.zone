import path from 'path';
import maxmind from 'maxmind';
import Libqqwry from 'lib-qqwry';
import { getDbPath } from '../utils/dbPath';

export class DatabaseService {
  private static instance: DatabaseService;
  private maxmindReader: any;
  private qqwryReader: any;
  private geoCnReader: any;

  private constructor() {}

  public static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      await DatabaseService.instance.initialize();
    }
    return DatabaseService.instance;
  }

  private async initialize() {
    // 使用工具函数获取数据库路径
    try {
      // 初始化 MaxMind 数据库
      const maxmindPath = getDbPath('GeoLite2-City.mmdb');
      this.maxmindReader = await maxmind.open(maxmindPath);

      // 初始化纯真数据库
      this.qqwryReader = Libqqwry();
      this.qqwryReader.speed();

      // 初始化 GeoCN 数据库
      const geoCnPath = getDbPath('geocn.mmdb');
      this.geoCnReader = await maxmind.open(geoCnPath);
      console.log('GeoCN数据库初始化成功');
    } catch (error) {
      console.error('数据库初始化错误:', error);
    }
  }

  public async queryIP(ip: string) {
    const result: any = {
      maxmind: await this.queryMaxMind(ip),
      qqwry: await this.queryQQwry(ip),
      geoCn: await this.queryGeoCN(ip),
    };

    return result;
  }

  private async queryMaxMind(ip: string) {
    try {
      const data = await this.maxmindReader.city(ip);
      return {
        country: data.country?.names?.en || '-',
        region: data.subdivisions?.[0]?.names?.en || '-',
        city: data.city?.names?.en || '-',
        location: {
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
          accuracy_radius: data.location?.accuracy_radius,
        },
        network: data.traits?.network || '-',
      };
    } catch (error) {
      console.error('MaxMind query error:', error);
      return null;
    }
  }

  private async queryQQwry(ip: string) {
    try {
      const data = this.qqwryReader.searchIP(ip);
      return {
        country: data.Country || '-',
        area: data.Area || '-',
      };
    } catch (error) {
      console.error('QQwry query error:', error);
      return null;
    }
  }

  private async queryGeoCN(ip: string) {
    if (!this.geoCnReader) return null;

    try {
      const data = await this.geoCnReader.get(ip);
      return {
        country: data?.country?.names?.zh || data?.country?.names?.en || '-',
        province: data?.province?.names?.zh || data?.subdivisions?.[0]?.names?.zh || '-',
        city: data?.city?.names?.zh || '-',
        isp: data?.isp?.name || '-',
        asn: data?.asn || '-',
        location: {
          latitude: data?.location?.latitude,
          longitude: data?.location?.longitude,
        },
      };
    } catch (error) {
      console.error('GeoCN query error:', error);
      return null;
    }
  }
}
