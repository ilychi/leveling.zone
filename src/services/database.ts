import path from 'path';
import maxmind from 'maxmind';
import Libqqwry from 'lib-qqwry';

export class DatabaseService {
  private static instance: DatabaseService;
  private maxmindReader: any;
  private qqwryReader: any;

  private constructor() {}

  public static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      await DatabaseService.instance.initialize();
    }
    return DatabaseService.instance;
  }

  private async initialize() {
    const DB_DIR = path.join(process.cwd(), 'data', 'db');
    
    // 初始化 MaxMind 数据库
    this.maxmindReader = await maxmind.open(path.join(DB_DIR, 'GeoLite2-City.mmdb'));
    
    // 初始化纯真数据库
    this.qqwryReader = Libqqwry();
    this.qqwryReader.speed();
  }

  public async queryIP(ip: string) {
    const result: any = {
      maxmind: await this.queryMaxMind(ip),
      qqwry: await this.queryQQwry(ip)
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
          accuracy_radius: data.location?.accuracy_radius
        },
        network: data.traits?.network || '-'
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
        area: data.Area || '-'
      };
    } catch (error) {
      console.error('QQwry query error:', error);
      return null;
    }
  }
} 
