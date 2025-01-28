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
        ip: jsonData.ip,
        location: {
          country: jsonData.country_name,
          countryCode: jsonData.country_code,
          region: jsonData.region_name,
          regionCode: jsonData.region?.code,
          city: jsonData.city_name,
          district: jsonData.district,
          coordinates: `${jsonData.latitude}, ${jsonData.longitude}`,
          timezone: jsonData.time_zone,
          zipCode: jsonData.zip_code,
          elevation: jsonData.elevation,
          weatherStation: {
            code: jsonData.weather_station_code,
            name: jsonData.weather_station_name,
          },
          areaCode: jsonData.area_code,
          iddCode: jsonData.idd_code,
        },
        network: {
          asn: jsonData.asn,
          organization: jsonData.as,
          isp: jsonData.isp,
          domain: jsonData.domain,
          type: jsonData.usage_type,
          netSpeed: jsonData.net_speed,
          addressType: jsonData.address_type,
          category: {
            code: jsonData.ads_category,
            name: jsonData.ads_category_name,
          },
        },
        security: {
          isProxy: jsonData.is_proxy,
          proxyType: jsonData.proxy?.proxy_type || '-',
          threat: jsonData.proxy?.threat || '-',
          fraudScore: jsonData.fraud_score,
          proxy: {
            lastSeen: jsonData.proxy?.last_seen,
            isVpn: jsonData.proxy?.is_vpn,
            isTor: jsonData.proxy?.is_tor,
            isDataCenter: jsonData.proxy?.is_data_center,
            isPublicProxy: jsonData.proxy?.is_public_proxy,
            isWebProxy: jsonData.proxy?.is_web_proxy,
            isWebCrawler: jsonData.proxy?.is_web_crawler,
            isResidentialProxy: jsonData.proxy?.is_residential_proxy,
            isConsumerPrivacyNetwork: jsonData.proxy?.is_consumer_privacy_network,
            isEnterprisePrivateNetwork: jsonData.proxy?.is_enterprise_private_network,
            isSpammer: jsonData.proxy?.is_spammer,
            isScanner: jsonData.proxy?.is_scanner,
            isBotnet: jsonData.proxy?.is_botnet,
          },
        },
        meta: {
          continent: jsonData.continent,
          country: {
            ...jsonData.country,
            population: Number(jsonData.country?.population),
            totalArea: Number(jsonData.country?.total_area),
          },
          region: jsonData.region,
          city: jsonData.city,
          timeZone: {
            ...jsonData.time_zone_info,
            gmtOffset: Number(jsonData.time_zone_info?.gmt_offset),
            isDst: Boolean(jsonData.time_zone_info?.is_dst),
          },
          geotargeting: jsonData.geotargeting,
          mobile: {
            mcc: jsonData.mcc,
            mnc: jsonData.mnc,
            brand: jsonData.mobile_brand,
          },
        },
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
