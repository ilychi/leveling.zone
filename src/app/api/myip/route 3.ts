import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from '@/utils/ip';

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const result: any = {
      ip: clientIP,
      sources: {},
    };

    // 并行请求所有 API
    const [
      cloudflareResponse,
      identmeResponse,
      apipccResponse,
      zhaleResponse,
      zxincResponse,
      amapResponse,
      ipqueryResponse
    ] = await Promise.allSettled([
      // Cloudflare
      fetchWithTimeout('https://1.1.1.1/cdn-cgi/trace'),

      // ident.me
      fetchWithTimeout('https://v4.ident.me/json'),

      // APIP.CC
      fetchWithTimeout('https://api.apip.cc/ip'),

      // 知了IP
      fetchWithTimeout('https://ipv4cn.zhale.me/ip.php'),

      // 纯真IP
      fetchWithTimeout('https://v4.ip.zxinc.org/info.php?type=json'),

      // 高德地图
      fetchWithTimeout('https://restapi.amap.com/v3/ip?key=0113a13c88697dcea6a445584d535837'),

      // ipquery.io
      fetchWithTimeout('https://api.ipquery.io/?format=json')
    ]);

    // 处理 Cloudflare 响应
    if (cloudflareResponse.status === 'fulfilled') {
      const text = await cloudflareResponse.value.text();
      const data = Object.fromEntries(
        text.split('\n')
          .map(line => line.split('='))
          .filter(([key]) => key)
      );
      
      result.sources.cloudflare = {
        ip: data.ip,
        location: {
          country_code: data.loc,
          country: data.loc === 'CN' ? '中国' : 'United States',
        },
        network: {
          http: data.http,
          tls: data.tls,
          warp: data.warp === 'on',
        }
      };
    }

    // 处理 ident.me 响应
    if (identmeResponse.status === 'fulfilled') {
      const data = await identmeResponse.value.json();
      result.sources.identme = {
        ip: data.ip,
        location: {
          country_code: data.cc,
          country: data.country,
          city: data.city,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude
        },
        network: {
          asn: data.asn,
          org: data.aso
        }
      };

      // 如果还没有主要位置信息，使用 ident.me 的数据
      if (!result.location) {
        result.location = result.sources.identme.location;
        result.network = result.sources.identme.network;
      }
    }

    // 处理 APIP.CC 响应
    if (apipccResponse.status === 'fulfilled') {
      const data = await apipccResponse.value.json();
      result.sources.apipcc = {
        ip: data.ip,
        location: {
          country: data.country,
          region: data.region,
          city: data.city,
          isp: data.isp
        }
      };
    }

    // 处理知了IP响应
    if (zhaleResponse.status === 'fulfilled') {
      const data = await zhaleResponse.value.json();
      result.sources.zhale = {
        ip: data.ip,
        location: {
          country: data.location?.split('–')[0] || '',
          region: data.location?.split('–')[1] || '',
          city: data.location?.split('–')[2] || ''
        }
      };
    }

    // 处理纯真IP响应
    if (zxincResponse.status === 'fulfilled') {
      const data = await zxincResponse.value.json();
      if (data.code === 0) {
        result.sources.zxinc = {
          ip: data.data.myip,
          location: {
            country: data.data.location?.split('–')[0] || '',
            region: data.data.location?.split('–')[1] || '',
            city: data.data.location?.split('–')[2] || ''
          }
        };
      }
    }

    // 处理高德地图响应
    if (amapResponse.status === 'fulfilled') {
      const data = await amapResponse.value.json();
      if (data.status === '1') {
        result.sources.amap = {
          ip: clientIP,
          location: {
            country: '中国',
            region: data.province || '',
            city: data.city || ''
          }
        };
      }
    }

    // 处理 ipquery.io 响应
    if (ipqueryResponse.status === 'fulfilled') {
      const data = await ipqueryResponse.value.json();
      result.sources.ipquery = {
        ip: data.ip,
        location: {
          country_code: data.country_code,
          country: data.country,
          region: data.state,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude
        },
        network: {
          asn: data.isp?.asn?.replace('AS', ''),
          org: data.isp?.org,
          isp: data.isp?.isp
        }
      };

      // 优先使用 ipquery.io 的数据作为主要位置信息
      result.location = result.sources.ipquery.location;
      result.network = result.sources.ipquery.network;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('MyIP查询失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}
