import { NextRequest, NextResponse } from 'next/server';

async function getIp2LocationInfo(ip: string) {
  try {
    const response = await fetch(`https://ip2location.io/${ip}`);
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // 提取 JSON 数据
    const jsonMatch = html.match(/class="language-json">(.*?)<\/code>/s);
    if (!jsonMatch) return null;
    
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      
      // 构建标准化的响应格式
      return {
        location: {
          country: jsonData.country_name,
          countryCode: jsonData.country_code,
          region: jsonData.region_name,
          city: jsonData.city_name,
          district: jsonData.district,
          coordinates: `${jsonData.latitude}, ${jsonData.longitude}`,
          timezone: jsonData.time_zone,
          zipCode: jsonData.zip_code
        },
        network: {
          asn: jsonData.asn,
          organization: jsonData.as,
          isp: jsonData.isp,
          domain: jsonData.domain,
          type: jsonData.usage_type
        },
        security: {
          isProxy: jsonData.is_proxy,
          proxyType: jsonData.proxy?.proxy_type || '-',
          threat: jsonData.proxy?.threat || '-',
          fraudScore: jsonData.fraud_score
        },
        meta: {
          continent: jsonData.continent,
          country: jsonData.country,
          region: jsonData.region,
          city: jsonData.city,
          timeZone: jsonData.time_zone_info
        }
      };
    } catch (error) {
      console.error('JSON解析失败:', error);
      return null;
    }
  } catch (error) {
    console.error('IP2Location.io查询失败:', error);
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

    const data = await getIp2LocationInfo(ip);
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
