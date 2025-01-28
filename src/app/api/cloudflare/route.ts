import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface GeoInfo {
  ip: string;
  location: {
    city?: string;
    country?: string;
    countryCode?: string;
    region?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    flag?: string;
  };
  network: {
    datacenter?: string;
    asn?: string;
    organization?: string;
    http?: string;
    tls?: string;
    warp?: string;
  };
  connection: {
    protocol?: string;
    browserType?: string;
    sliver?: string;
    sni?: string;
    gateway?: string;
    rbi?: string;
    kex?: string;
  };
  timestamp: string;
}

interface CloudflareTraceData {
  ip: string;
  ts: string;
  visit_scheme: string;
  uag: string;
  colo: string;
  sliver: string;
  http: string;
  loc: string;
  tls: string;
  sni: string;
  warp: string;
  gateway: string;
  rbi: string;
  kex: string;
}

interface CloudflareSpeedMeta {
  clientIp: string;
  asn: string;
  asOrganization: string;
  colo: string;
  country: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

// 从请求头获取真实IP
function getClientIP(request: NextRequest): string | undefined {
  const headersList = headers();

  // 按优先级获取IP
  return (
    headersList.get('cf-connecting-ip') || // Cloudflare
    headersList.get('x-real-ip') || // 标准代理头
    headersList.get('x-forwarded-for')?.split(',')[0].trim() || // 代理链第一个IP
    request.ip || // 请求IP
    undefined
  );
}

// 从 Cloudflare 获取 trace 数据
async function getCloudflareTrace(clientIP?: string): Promise<Record<string, string> | null> {
  try {
    const response = await fetch('https://1.1.1.1/cdn-cgi/trace');
    if (!response.ok) return null;
    const text = await response.text();
    const data = Object.fromEntries(
      text
        .trim()
        .split('\n')
        .map(line => line.split('='))
    );
    // 如果有真实IP，替换trace数据中的IP
    if (clientIP) {
      data.ip = clientIP;
    }
    return data;
  } catch (error) {
    console.error('从Cloudflare获取trace失败:', error);
    return null;
  }
}

// 从 Cloudflare 获取 speed meta 数据
async function getCloudflareSpeedMeta(clientIP?: string): Promise<Record<string, string> | null> {
  try {
    const response = await fetch('https://speed.cloudflare.com/meta');
    if (!response.ok) return null;
    const data = await response.json();
    // 如果有真实IP，替换meta数据中的IP
    if (clientIP) {
      data.clientIp = clientIP;
    }
    return data;
  } catch (error) {
    console.error('从Cloudflare获取speed meta失败:', error);
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

async function getGeoInfo(request: NextRequest): Promise<GeoInfo | null> {
  try {
    const headersList = headers();
    const clientIP = getClientIP(request);

    // 优先使用 Cloudflare 请求头
    const cfHeaders = {
      ip: clientIP,
      city: headersList.get('cf-ipcity'),
      country: headersList.get('cf-ipcountry'),
      region: headersList.get('cf-region'),
      timezone: headersList.get('cf-timezone'),
      latitude: headersList.get('cf-latitude'),
      longitude: headersList.get('cf-longitude'),
      asOrganization: headersList.get('cf-asorganization'),
    };

    // 如果在本地环境或没有足够的CF头信息，从API获取补充数据
    const [traceData, metaData] = await Promise.all([
      getCloudflareTrace(clientIP),
      getCloudflareSpeedMeta(clientIP),
    ]);

    // 构建地理信息，优先使用CF头信息，其次使用API数据
    const geoInfo: GeoInfo = {
      ip: cfHeaders.ip || metaData?.clientIp || traceData?.ip || '',
      location: {
        city: cfHeaders.city || metaData?.city,
        country: cfHeaders.country || metaData?.country,
        countryCode: cfHeaders.country || metaData?.country,
        region: cfHeaders.region || metaData?.region,
        postalCode: metaData?.postalCode,
        latitude: cfHeaders.latitude
          ? parseFloat(cfHeaders.latitude)
          : metaData?.latitude
          ? parseFloat(metaData.latitude)
          : undefined,
        longitude: cfHeaders.longitude
          ? parseFloat(cfHeaders.longitude)
          : metaData?.longitude
          ? parseFloat(metaData.longitude)
          : undefined,
        timezone: cfHeaders.timezone || metaData?.timezone,
      },
      network: {
        datacenter: metaData?.colo || traceData?.colo,
        asn: metaData?.asn,
        organization: cfHeaders.asOrganization || metaData?.asOrganization,
        http: traceData?.http,
        tls: traceData?.tls,
        warp: traceData?.warp,
      },
      connection: {
        protocol: traceData?.visit_scheme,
        browserType: traceData?.uag,
        sliver: traceData?.sliver,
        sni: traceData?.sni,
        gateway: traceData?.gateway,
        rbi: traceData?.rbi,
        kex: traceData?.kex,
      },
      timestamp: new Date().toISOString(),
    };

    // 添加国旗表情
    if (geoInfo.location.countryCode) {
      geoInfo.location.flag = getFlagEmoji(geoInfo.location.countryCode);
    }

    // 在开发环境下，如果没有数据，添加模拟数据
    if (process.env.NODE_ENV === 'development' && (!traceData || !metaData)) {
      const mockData = {
        location: {
          city: '上海',
          country: '中国',
          countryCode: 'CN',
          region: '上海市',
          postalCode: '200000',
          latitude: 31.2222,
          longitude: 121.4581,
          timezone: 'Asia/Shanghai',
          flag: '🇨🇳',
        },
        network: {
          datacenter: 'SHA',
          asn: '4134',
          organization: 'China Telecom',
          http: 'http/2',
          tls: 'TLSv1.3',
          warp: 'off',
        },
        connection: {
          protocol: 'https',
          browserType: 'curl/7.64.1',
          sliver: 'none',
          sni: 'plaintext',
          gateway: 'off',
          rbi: 'off',
          kex: 'X25519',
        },
      };

      geoInfo.location = { ...geoInfo.location, ...mockData.location };
      geoInfo.network = { ...geoInfo.network, ...mockData.network };
      geoInfo.connection = { ...geoInfo.connection, ...mockData.connection };
    }

    return geoInfo;
  } catch (error) {
    console.error('获取地理信息失败:', error);
    return null;
  }
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

    return new NextResponse(JSON.stringify(geoInfo, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'x-client-ip': geoInfo.ip,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
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

export async function HEAD(request: NextRequest) {
  const geoInfo = await getGeoInfo(request);
  return new Response(null, {
    headers: {
      'x-client-ip': geoInfo?.ip || '',
    },
  });
}
