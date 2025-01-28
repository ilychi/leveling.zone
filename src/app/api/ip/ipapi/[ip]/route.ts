import { NextRequest, NextResponse } from 'next/server';

async function getIpApiData(ip: string) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=66846719&lang=zh-CN`);
    if (!response.ok) return null;

    const data = await response.json();

    // 构建标准化的响应格式
    return {
      ip: data.query,
      status: data.status,
      location: {
        continent: data.continent,
        continentCode: data.continentCode,
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        regionCode: data.region,
        city: data.city,
        district: data.district,
        zip: data.zip,
        coordinates: {
          lat: data.lat,
          lon: data.lon,
        },
        timezone: {
          id: data.timezone,
          offset: data.offset,
          current: data.timezone,
        },
      },
      network: {
        asn: data.as?.split(' ')[0]?.replace('AS', ''),
        asname: data.as,
        org: data.org,
        isp: data.isp,
        reverse: data.reverse,
        mobile: data.mobile,
        proxy: data.proxy,
        hosting: data.hosting,
      },
      security: {
        proxy: data.proxy,
        hosting: data.hosting,
        mobile: data.mobile,
        crawler: data.crawler,
        status: data.status,
      },
      meta: {
        currency: {
          code: data.currency,
          symbol: data.currencySymbol,
          rates: data.currencyRates,
        },
        languages: data.languages,
        countryPhone: data.countryPhone,
        countryNeighbours: data.countryNeighbours,
        timezone: {
          name: data.timezone,
          offset: data.offset,
          currentTime: data.currentTime,
          dstStart: data.dstStart,
          dstEnd: data.dstEnd,
        },
      },
    };
  } catch (error) {
    console.error('IP-API查询失败:', error);
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

    const data = await getIpApiData(ip);
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
