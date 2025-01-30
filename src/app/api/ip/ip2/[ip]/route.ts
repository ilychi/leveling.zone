import { NextResponse } from 'next/server';
import path from 'path';
import { IP2Location } from 'ip2location-nodejs';
import { IP2LocationResult, IP2LocationProxyResult } from '@/types/ip2location';
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

export async function GET(request: Request, { params }: RouteParams) {
  const cityDb = new IP2Location();
  const asnDb = new IP2Location();
  const proxyDb = new IP2Location();

  try {
    const ip = handleLocalhost(params.ip);
    if (!ip) {
      return NextResponse.json(
        {
          error: 'Invalid IP address',
          meta: { source: 'ip2location' },
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const DB_DIR = path.join(process.cwd(), 'data', 'db');

    try {
      // 打开数据库文件
      cityDb.open(path.join(DB_DIR, 'IP2LOCATION-LITE-DB11.BIN'));
      asnDb.open(path.join(DB_DIR, 'IP2LOCATION-LITE-ASN.BIN'));
      proxyDb.open(path.join(DB_DIR, 'IP2LOCATION-LITE-PX11.BIN'));
    } catch (error) {
      throw new Error('数据库文件不存在或无法访问');
    }

    // 查询所有数据库
    const cityResult = cityDb.getAll(ip) as IP2LocationResult;
    const asnResult = asnDb.getAll(ip) as IP2LocationResult;
    const proxyResult = proxyDb.getAll(ip) as IP2LocationProxyResult;

    // 构建响应数据
    const rawResponse = {
      ip,
      location: cityResult
        ? {
            country: cityResult.countryLong,
            countryCode: cityResult.countryShort,
            region: cityResult.region,
            city: cityResult.city,
            coordinates:
              cityResult.latitude && cityResult.longitude
                ? {
                    latitude: cityResult.latitude,
                    longitude: cityResult.longitude,
                  }
                : undefined,
            zipCode: cityResult.zipCode,
          }
        : undefined,
      network: {
        asn: asnResult?.asn ? `AS${asnResult.asn}` : undefined,
        organization: asnResult?.as,
        isp: cityResult?.provider,
      },
      security: proxyResult
        ? {
            isProxy: proxyResult.isProxy === 1,
            proxyType: proxyResult.proxyType,
            usageType: proxyResult.usageType,
            threat: proxyResult.threat,
          }
        : undefined,
      meta: {
        source: 'ip2location',
        timestamp: new Date().toISOString(),
        databases: {
          city: 'IP2LOCATION-LITE-DB11.BIN',
          asn: 'IP2LOCATION-LITE-ASN.BIN',
          proxy: 'IP2LOCATION-LITE-PX11.BIN',
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
    console.error('IP2Location 查询失败:', error);
    return NextResponse.json(
      {
        error: 'IP2Location query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          source: 'ip2location',
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
    // 确保关闭数据库连接
    try {
      cityDb.close();
      asnDb.close();
      proxyDb.close();
    } catch (error) {
      console.error('关闭数据库连接失败:', error);
    }
  }
}
