import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface GeoInfo {
  ip: string;
  city?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
  countryRegion?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  asOrganization?: string;
}

async function getClientIP(request: NextRequest): Promise<string | null> {
  const headersList = headers();

  // 按优先级获取 IP
  const ip =
    headersList.get('cf-connecting-ip') ||
    headersList.get('x-real-ip') ||
    headersList.get('x-forwarded-for')?.split(',')[0] ||
    request.ip ||
    null;

  return ip ? ip.trim() : null;
}

async function getGeoInfo(request: NextRequest): Promise<GeoInfo | null> {
  try {
    const ip = await getClientIP(request);
    if (!ip) return null;

    // 从请求头中获取 Cloudflare 提供的地理信息
    const headersList = headers();
    const country = headersList.get('cf-ipcountry');
    const city = headersList.get('cf-ipcity');
    const region = headersList.get('cf-region');
    const latitude = headersList.get('cf-latitude');
    const longitude = headersList.get('cf-longitude');
    const timezone = headersList.get('cf-timezone');
    const asOrganization = headersList.get('cf-asorganization');

    // 获取国家旗帜表情
    const flag = country ? getFlagEmoji(country) : undefined;

    return {
      ip,
      city: city || undefined,
      country: country || undefined,
      countryCode: country || undefined,
      flag,
      countryRegion: region || undefined,
      region: region || undefined,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      timezone: timezone || undefined,
      asOrganization: asOrganization || undefined,
    };
  } catch (error) {
    console.error('获取地理信息失败:', error);
    return null;
  }
}

// 将国家代码转换为旗帜表情
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const geoInfo = await getGeoInfo(request);

    if (!geoInfo) {
      return NextResponse.json(
        { error: '无法获取IP信息' },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 返回完整的地理信息
    return new NextResponse(JSON.stringify(geoInfo, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'x-client-ip': geoInfo.ip,
      },
    });
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return NextResponse.json(
      {
        error: '获取IP信息失败',
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
