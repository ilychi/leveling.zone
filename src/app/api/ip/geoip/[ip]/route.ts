import { NextResponse } from 'next/server';
import path from 'path';
import maxmind, { CityResponse, ASNResponse } from 'maxmind';
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
  let asnReader: maxmind.Reader<ASNResponse> | null = null;

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
      asnReader = await maxmind.open<ASNResponse>(path.join(DB_DIR, 'GeoLite2-ASN.mmdb'));
    } catch (error) {
      throw new Error('数据库文件不存在或无法访问');
    }

    const cityResult = await cityReader.city(ip);
    const asnResult = await asnReader.asn(ip);

    // 构建响应数据
    const rawResponse = {
      ip,
      network: {
        asn: asnResult.autonomousSystemNumber ? `AS${asnResult.autonomousSystemNumber}` : undefined,
        organization: asnResult.autonomousSystemOrganization,
        route: cityResult.traits?.network?.toString(),
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
              code: cityResult.country.isoCode,
              name: getName(cityResult.country.names),
              isEU: cityResult.country.isInEuropeanUnion,
              confidence: cityResult.country.confidence,
            }
          : undefined,
        registeredCountry: cityResult.registeredCountry
          ? {
              code: cityResult.registeredCountry.isoCode,
              name: getName(cityResult.registeredCountry.names),
              isEU: cityResult.registeredCountry.isInEuropeanUnion,
            }
          : undefined,
        representedCountry: cityResult.representedCountry
          ? {
              code: cityResult.representedCountry.isoCode,
              name: getName(cityResult.representedCountry.names),
              type: cityResult.representedCountry.type,
              isEU: cityResult.representedCountry.isInEuropeanUnion,
            }
          : undefined,
        region: cityResult.subdivisions?.[0]
          ? {
              code: cityResult.subdivisions[0].isoCode,
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
              radius: cityResult.location.accuracyRadius,
            }
          : undefined,
        postal: cityResult.postal?.code,
        timezone: cityResult.location?.timeZone,
        metro: cityResult.location?.metroCode,
      },
      traits: {
        isp: cityResult.traits?.isp,
        organization: cityResult.traits?.organization,
        userType: cityResult.traits?.userType,
        connectionType: cityResult.traits?.connectionType,
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
  } finally {
    try {
      if (cityReader) await cityReader.close();
      if (asnReader) await asnReader.close();
    } catch (error) {
      console.error('关闭数据库连接失败:', error);
    }
  }
}
