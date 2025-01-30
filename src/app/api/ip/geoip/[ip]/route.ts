import { NextRequest, NextResponse } from 'next/server';
import { Reader } from '@maxmind/geoip2-node';
import { readFile } from 'fs/promises';
import path from 'path';
import * as maxmind from 'maxmind';
import type { CityResponse, AsnResponse } from 'maxmind';
import { handleLocalhost } from '@/utils/ip';

export const dynamic = 'force-dynamic';

// GeoLite2 数据库路径
const DB_PATHS = {
  ASN: path.join(process.cwd(), 'data/db/GeoLite2-ASN.mmdb'),
  CITY: path.join(process.cwd(), 'data/db/GeoLite2-City.mmdb'),
  COUNTRY: path.join(process.cwd(), 'data/db/GeoLite2-Country.mmdb'),
};

interface GeoLite2Readers {
  asnReader: any;
  cityReader: any;
  countryReader: any;
}

let readers: Partial<GeoLite2Readers> = {};

// 初始化 GeoLite2 数据库读取器
async function initReaders(): Promise<GeoLite2Readers> {
  if (!readers.asnReader || !readers.cityReader || !readers.countryReader) {
    try {
      const [asnBuffer, cityBuffer, countryBuffer] = await Promise.all([
        readFile(DB_PATHS.ASN),
        readFile(DB_PATHS.CITY),
        readFile(DB_PATHS.COUNTRY),
      ]);

      readers = {
        asnReader: Reader.openBuffer(asnBuffer),
        cityReader: Reader.openBuffer(cityBuffer),
        countryReader: Reader.openBuffer(countryBuffer),
      };
    } catch (error) {
      console.error('GeoLite2 数据库加载失败:', error);
      throw new Error('无法加载 GeoLite2 数据库');
    }
  }
  return readers as GeoLite2Readers;
}

// 查询 IP 信息
async function queryIP(ip: string) {
  const { asnReader, cityReader, countryReader } = await initReaders();

  try {
    const [asnInfo, cityInfo, countryInfo] = await Promise.all([
      (asnReader as any).asn(ip),
      (cityReader as any).city(ip),
      (countryReader as any).country(ip),
    ]);

    return {
      asn: {
        number: asnInfo?.autonomousSystemNumber,
        organization: asnInfo?.autonomousSystemOrganization,
      },
      city: cityInfo?.city?.names,
      country: {
        name: countryInfo?.country?.names,
        code: countryInfo?.country?.isoCode,
      },
      location: {
        latitude: cityInfo?.location?.latitude,
        longitude: cityInfo?.location?.longitude,
        timezone: cityInfo?.location?.timeZone,
      },
    };
  } catch (error) {
    console.error('GeoLite2 查询失败:', error);
    throw error;
  }
}

interface RouteParams {
  params: {
    ip: string;
  };
}

// 清理对象，移除所有 undefined、null、空字符串的字段
function cleanupObject(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object') return obj;

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object') {
      const cleanedValue = cleanupObject(value);
      if (cleanedValue !== undefined && Object.keys(cleanedValue).length > 0) {
        cleaned[key] = cleanedValue;
      }
    } else {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

// 获取名称，优先使用中文
function getName(names?: { zh_CN?: string; en?: string }): string | undefined {
  return names?.zh_CN || names?.en;
}

export async function GET(request: NextRequest, { params }: { params: { ip: string } }) {
  try {
    const ip = params.ip;
    if (!ip) {
      return NextResponse.json({ error: 'IP parameter is required' }, { status: 400 });
    }

    const result = await queryIP(ip);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error querying IP:', error);
    return NextResponse.json({ error: 'Failed to query IP information' }, { status: 500 });
  }
}
