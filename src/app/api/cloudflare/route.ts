import { NextRequest, NextResponse } from 'next/server';

interface CloudflareTraceData {
  fl: string;
  h: string;
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
  [key: string]: string;
}

interface CloudflareSpeedMeta {
  hostname: string;
  clientIp: string;
  httpProtocol: string;
  asn: string;
  asOrganization: string;
  colo: string;
  country: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: string;
  longitude: string;
}

interface CloudflareInfo {
  ip: string;
  location: {
    country: string;
    region: string;
    city: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  network: {
    datacenter: string;
    asn: string;
    organization: string;
    http: string;
    tls: string;
    warp: string;
  };
  connection: {
    protocol: string;
    browserType: string;
    sliver: string;
    sni: string;
    gateway: string;
    rbi: string;
    kex: string;
  };
  timestamp: string;
  [key: string]: any;
}

async function getCloudflareTrace(): Promise<CloudflareTraceData | null> {
  try {
    const response = await fetch('https://1.1.1.1/cdn-cgi/trace');
    if (!response.ok) {
      console.error('Cloudflare Trace请求失败:', response.status);
      return null;
    }

    const text = await response.text();
    const data = text.split('\n').reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as CloudflareTraceData);

    // 验证必要字段
    const requiredFields = ['ip', 'loc', 'colo', 'http', 'tls'];
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      console.error('Cloudflare Trace缺少必要字段:', missingFields);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Cloudflare Trace查询失败:', error);
    return null;
  }
}

async function getCloudflareSpeedMeta(): Promise<CloudflareSpeedMeta | null> {
  try {
    const response = await fetch('https://speed.cloudflare.com/meta', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Cloudflare Speed Meta请求失败:', response.status);
      return null;
    }

    const data = await response.json();

    // 验证必要字段
    const requiredFields = ['clientIp', 'asn', 'city', 'country'];
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      console.error('Cloudflare Speed Meta缺少必要字段:', missingFields);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Cloudflare Speed Meta查询失败:', error);
    return null;
  }
}

async function getCloudflareInfo(): Promise<CloudflareInfo | null> {
  try {
    const [traceData, metaData] = await Promise.all([
      getCloudflareTrace(),
      getCloudflareSpeedMeta()
    ]);

    if (!traceData || !metaData) return null;

    const info: CloudflareInfo = {
      ip: metaData.clientIp || traceData.ip,
      location: {
        country: metaData.country || traceData.loc,
        region: metaData.region || '',
        city: metaData.city || '',
        postalCode: metaData.postalCode,
        latitude: metaData.latitude ? parseFloat(metaData.latitude) : undefined,
        longitude: metaData.longitude ? parseFloat(metaData.longitude) : undefined,
      },
      network: {
        datacenter: metaData.colo || traceData.colo,
        asn: metaData.asn,
        organization: metaData.asOrganization,
        http: traceData.http,
        tls: traceData.tls,
        warp: traceData.warp,
      },
      connection: {
        protocol: traceData.visit_scheme,
        browserType: traceData.uag,
        sliver: traceData.sliver,
        sni: traceData.sni,
        gateway: traceData.gateway,
        rbi: traceData.rbi,
        kex: traceData.kex,
      },
      timestamp: new Date().toISOString(),
    };

    // 清理空值
    Object.keys(info).forEach(key => {
      if (typeof info[key] === 'object' && info[key] !== null) {
        Object.keys(info[key]).forEach(subKey => {
          if (info[key][subKey] === undefined || info[key][subKey] === '') {
            delete info[key][subKey];
          }
        });
      }
    });

    return info;
  } catch (error) {
    console.error('Cloudflare信息查询失败:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';

    // 检查 IP 参数
    const ip = searchParams.get('ip');
    if (ip) {
      return NextResponse.json(
        {
          error: 'API限制',
          message: 'Cloudflare公共API不支持查询特定IP地址，只能获取当前访问者的信息。',
          documentation: 'https://developers.cloudflare.com/fundamentals/api/',
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    let data: any = null;

    switch (type) {
      case 'trace':
        data = await getCloudflareTrace();
        break;
      case 'meta':
        data = await getCloudflareSpeedMeta();
        break;
      case 'all':
      default:
        data = await getCloudflareInfo();
        break;
    }

    if (!data) {
      return NextResponse.json(
        {
          error: '查询失败',
          message: '无法获取Cloudflare数据',
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Cloudflare API错误:', error);
    return NextResponse.json(
      {
        error: '服务器错误',
        message: '处理请求时发生错误',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
} 
