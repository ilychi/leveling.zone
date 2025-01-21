import path from 'path';
import maxmind from 'maxmind';
import Libqqwry from 'lib-qqwry';

export class DatabaseService {
  private static instance: DatabaseService;
  private maxmindReader: any;
  private qqwryReader: any;
  private dbDir: string;

  private constructor() {
    this.dbDir = path.join(process.cwd(), 'data', 'db');
  }

  public static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      await DatabaseService.instance.init();
    }
    return DatabaseService.instance;
  }

  private async init() {
    try {
      // 初始化 MaxMind 数据库
      this.maxmindReader = await maxmind.open(path.join(this.dbDir, 'GeoLite2-City.mmdb'));
      
      // 初始化纯真数据库
      this.qqwryReader = Libqqwry();
      this.qqwryReader.speed();
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  public async queryIP(ip: string) {
    const result: any = {
      ip,
      maxmind: await this.queryMaxMind(ip),
      qqwry: await this.queryQQWry(ip)
    };

    return result;
  }

  private async queryMaxMind(ip: string) {
    try {
      const data = this.maxmindReader.get(ip);
      if (!data) return null;

      return {
        country: data.country?.names?.zh || data.country?.names?.en,
        city: data.city?.names?.zh || data.city?.names?.en,
        location: {
          latitude: data.location?.latitude,
          longitude: data.location?.longitude
        },
        network: data.traits?.network
      };
    } catch (error) {
      console.error('MaxMind 查询失败:', error);
      return null;
    }
  }

  private async queryQQWry(ip: string) {
    try {
      const data = this.qqwryReader.searchIP(ip);
      if (!data) return null;

      return {
        country: data.Country,
        area: data.Area
      };
    } catch (error) {
      console.error('纯真数据库查询失败:', error);
      return null;
    }
  }
} 
