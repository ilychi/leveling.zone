import { NextRequest, NextResponse } from 'next/server';

async function getIpInfoData(ip: string) {
  try {
    const response = await fetch(`https://ipinfo.io/widget/demo/${ip}`);
    if (!response.ok) return null;

    const jsonData = await response.json();
    const data = jsonData.data;

    // 构建标准化的响应格式
    return {
      ip: data.ip,
      hostname: data.hostname,
      location: {
        city: data.city,
        region: data.region,
        country: data.country,
        coordinates: data.loc,
        postal: data.postal,
        timezone: data.timezone,
      },
      network: {
        asn: {
          number: data.asn?.asn?.replace('AS', ''),
          name: data.asn?.name,
          domain: data.asn?.domain,
          route: data.asn?.route,
          type: data.asn?.type,
        },
        company: {
          name: data.company?.name,
          domain: data.company?.domain,
          type: data.company?.type,
        },
        org: data.org,
      },
      security: {
        isAnycast: data.is_anycast,
        isMobile: data.is_mobile,
        isAnonymous: data.is_anonymous,
        isSatellite: data.is_satellite,
        isHosting: data.is_hosting,
        privacy: {
          vpn: data.privacy?.vpn,
          proxy: data.privacy?.proxy,
          tor: data.privacy?.tor,
          relay: data.privacy?.relay,
          hosting: data.privacy?.hosting,
          service: data.privacy?.service,
        },
      },
      abuse: {
        address: data.abuse?.address,
        country: data.abuse?.country,
        email: data.abuse?.email,
        name: data.abuse?.name,
        network: data.abuse?.network,
        phone: data.abuse?.phone,
      },
    };
  } catch (error) {
    console.error('IPInfo查询失败:', error);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { ip: string } }) {
  try {
    const ip = params.ip;
    if (!ip) {
      return NextResponse.json(
        { error: 'IP parameter is required' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const data = await getIpInfoData(ip);
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('查询失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
