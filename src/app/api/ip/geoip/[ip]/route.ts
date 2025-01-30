import { NextResponse } from 'next/server';
import path from 'path';
import * as maxmind from 'maxmind';
import type { CityResponse, AsnResponse } from 'maxmind';
import { handleLocalhost } from '@/utils/ip';

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

export async function GET(request: Request, { params }: RouteParams) {
  let cityReader: maxmind.Reader<CityResponse> | null = null;
  let asnReader: maxmind.Reader<AsnResponse> | null = null;

  try {
    const ip = handleLocalhost(params.ip);
    if (!ip) {
      return NextResponse.json(
        {
          error: 'Invalid IP address',
          meta: { source: 'maxmind' },
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const DB_DIR = path.join(process.cwd(), 'data', 'db');

    try {
      cityReader = await maxmind.open<CityResponse>(path.join(DB_DIR, 'GeoLite2-City.mmdb'));
      asnReader = await maxmind.open<AsnResponse>(path.join(DB_DIR, 'GeoLite2-ASN.mmdb'));
    } catch (error) {
      throw new Error('数据库文件不存在或无法访问');
    }

    const cityResult = await cityReader.get(ip);
    const asnResult = await asnReader.get(ip);

    if (!cityResult || !asnResult) {
      throw new Error('IP not found in database');
    }

    // 构建响应数据
    const rawResponse = {
      ip,
      network: {
        asn: asnResult.autonomous_system_number
          ? `AS${asnResult.autonomous_system_number}`
          : undefined,
        organization: asnResult.autonomous_system_organization,
      },
      location: {
        continent: cityResult.continent
          ? {
              code: cityResult.continent.code,
              name: getName(cityResult.continent.names),
            }
          : undefined,
        country: cityResult.country
          ? {
              code: cityResult.country.iso_code,
              name: getName(cityResult.country.names),
              isEU: cityResult.country.is_in_european_union,
              confidence: cityResult.country.confidence,
            }
          : undefined,
        registeredCountry: cityResult.registered_country
          ? {
              code: cityResult.registered_country.iso_code,
              name: getName(cityResult.registered_country.names),
              isEU: cityResult.registered_country.is_in_european_union,
            }
          : undefined,
        representedCountry: cityResult.represented_country
          ? {
              code: cityResult.represented_country.iso_code,
              name: getName(cityResult.represented_country.names),
              type: cityResult.represented_country.type,
              isEU: cityResult.represented_country.is_in_european_union,
            }
          : undefined,
        region: cityResult.subdivisions?.[0]
          ? {
              code: cityResult.subdivisions[0].iso_code,
              name: getName(cityResult.subdivisions[0].names),
              confidence: cityResult.subdivisions[0].confidence,
            }
          : undefined,
        city: cityResult.city
          ? {
              name: getName(cityResult.city.names),
              confidence: cityResult.city.confidence,
            }
          : undefined,
        coords: cityResult.location
          ? {
              lat: cityResult.location.latitude,
              lon: cityResult.location.longitude,
              radius: cityResult.location.accuracy_radius,
            }
          : undefined,
        postal: cityResult.postal?.code,
        timezone: cityResult.location?.time_zone,
        metro: cityResult.location?.metro_code,
      },
      traits: {
        isp: cityResult.traits?.isp,
        organization: cityResult.traits?.organization,
        userType: cityResult.traits?.user_type,
        connectionType: cityResult.traits?.connection_type,
      },
      meta: {
        source: 'maxmind',
        type: 'geolite2',
        timestamp: new Date().toISOString(),
        db: {
          city: 'GeoLite2-City.mmdb',
          asn: 'GeoLite2-ASN.mmdb',
        },
      },
    };

    // 清理数据，移除空值
    const response = cleanupObject(rawResponse);

    return new NextResponse(JSON.stringify(response, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('MaxMind 查询失败:', error);
    return NextResponse.json(
      {
        error: 'MaxMind query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          source: 'maxmind',
          type: 'geolite2',
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
