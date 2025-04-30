import { NextRequest, NextResponse } from 'next/server';
import { Reader } from '@maxmind/geoip2-node';
import path from 'path';
import fs from 'fs';
const IP2Location = require('ip2location-nodejs');
const IP2Proxy = require('ip2proxy-nodejs');
const maxmind = require('maxmind');
const Libqqwry = require('lib-qqwry');
import { getClientIP } from '@/utils/ip';
import { DatabaseService } from '@/services/database';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

interface LocationInfo {
  latitude?: number | string;
  longitude?: number | string;
  timezone?: string;
  zipcode?: string;
}

interface NetworkInfo {
  proxy: boolean;
  proxyType?: string;
  isp?: string;
  domain?: string;
  usageType?: string;
  threat?: string;
  network?: string;
  isAnonymous?: boolean;
  isAnonymousVpn?: boolean;
  isHostingProvider?: boolean;
  isPublicProxy?: boolean;
  isTorExitNode?: boolean;
}

interface IpInfo {
  ip: string;
  city?: string;
  country?: string;
  continent?: string;
  region?: string;
  asn?: number | string;
  asnOrg?: string;
  asnInfo?: {
    number?: string;
    name?: string;
    org?: string;
    aka?: string;
    country?: string;
  };
  location?: LocationInfo;
  network?: NetworkInfo;
  source?: string[];
  timestamp?: string;
  maxmind?: any;
  dbip?: any;
  ip2location?: any;
  ipinfo?: any;
  iptoasn?: any;
  geocn?: any;
  qqwry?: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');

    if (!ip) {
      return NextResponse.json({ error: 'IP parameter is required' }, { status: 400 });
    }

    const result: IpInfo = { ip };
    const sources: string[] = [];

    // MaxMind GeoLite2
    try {
      const cityReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'GeoLite2-City.mmdb'))
      );
      const countryReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'GeoLite2-Country.mmdb'))
      );
      const asnReader = Reader.openBuffer(fs.readFileSync(path.join(DB_DIR, 'GeoLite2-ASN.mmdb')));

      const cityData = cityReader.city(ip);
      const countryData = countryReader.country(ip);
      const asnData = asnReader.asn(ip);

      sources.push('MaxMind');
      result.maxmind = {
        city: cityData.city?.names?.en || '-',
        country: countryData.country?.names?.en || '-',
        continent: countryData.continent?.names?.en || '-',
        asn: asnData.autonomousSystemNumber || '-',
        asnOrg: asnData.autonomousSystemOrganization || '-',
        location: {
          latitude: cityData.location?.latitude || '-',
          longitude: cityData.location?.longitude || '-',
          timezone: cityData.location?.timeZone || '-',
          zipcode: cityData.postal?.code || '-',
        },
        region: cityData.subdivisions?.[0]?.names?.en || '-',
        network: countryData.traits?.network || '-',
      };

      // 设置主要结果
      result.city = result.maxmind.city;
      result.country = result.maxmind.country;
      result.continent = result.maxmind.continent;
      result.asn = result.maxmind.asn;
      result.asnOrg = result.maxmind.asnOrg;
      result.location = result.maxmind.location;
      result.region = result.maxmind.region;
      result.network = countryData.traits?.isAnonymous || false ? {
        proxy: true,
        network: result.maxmind.network,
        isAnonymous: true,
        isAnonymousVpn: countryData.traits?.isAnonymousVpn || false,
        isHostingProvider: countryData.traits?.isHostingProvider || false,
        isPublicProxy: countryData.traits?.isPublicProxy || false,
        isTorExitNode: countryData.traits?.isTorExitNode || false,
      } : {
        proxy: false,
        network: result.maxmind.network,
        isAnonymous: countryData.traits?.isAnonymous || false,
        isAnonymousVpn: countryData.traits?.isAnonymousVpn || false,
        isHostingProvider: countryData.traits?.isHostingProvider || false,
        isPublicProxy: countryData.traits?.isPublicProxy || false,
        isTorExitNode: countryData.traits?.isTorExitNode || false,
      };
    } catch (error) {
      console.error('MaxMind 查询失败:', error);
    }

    // DB-IP
    try {
      const dbipCityReader = await maxmind.open(path.join(DB_DIR, 'dbip-city-lite.mmdb'));
      const dbipCountryReader = await maxmind.open(path.join(DB_DIR, 'dbip-country-lite.mmdb'));
      const dbipAsnReader = await maxmind.open(path.join(DB_DIR, 'dbip-asn-lite.mmdb'));

      const cityData = dbipCityReader.get(ip);
      const countryData = dbipCountryReader.get(ip);
      const asnData = dbipAsnReader.get(ip);

      sources.push('DB-IP');
      result.dbip = {
        city: cityData?.city?.names?.en || '-',
        city_zh: cityData?.city?.names?.['zh-CN'] || '-',
        country: countryData?.country_code || '-',
        country_names: cityData?.country?.names || {},
        region: cityData?.subdivisions?.[0]?.names?.en || '-',
        region_zh: cityData?.subdivisions?.[0]?.names?.['zh-CN'] || '-',
        continent: {
          code: cityData?.continent?.code || '-',
          names: cityData?.continent?.names || {},
        },
        location: {
          latitude: cityData?.location?.latitude || '-',
          longitude: cityData?.location?.longitude || '-',
        },
        asn: asnData?.autonomous_system_number || '-',
        asnOrg: asnData?.autonomous_system_organization || '-',
        is_eu: cityData?.country?.is_in_european_union || false,
      };

      // 补充主要结果中的空值
      if (!result.city || result.city === '-') result.city = result.dbip.city;
      if (!result.country || result.country === '-') result.country = result.dbip.country_names?.en;
      if (!result.asn || result.asn === '-') result.asn = result.dbip.asn;
      if (!result.asnOrg || result.asnOrg === '-') result.asnOrg = result.dbip.asnOrg;
      if (!result.continent || result.continent === '-')
        result.continent = result.dbip.continent.names?.en;
      if (!result.region || result.region === '-') result.region = result.dbip.region;
      if (!result.location || !result.location.latitude || result.location.latitude === '-') {
        if (result.dbip.location.latitude !== '-') {
          result.location = {
            ...result.location,
            latitude: result.dbip.location.latitude,
            longitude: result.dbip.location.longitude,
          };
        }
      }
    } catch (error) {
      console.error('DB-IP 查询失败:', error);
    }

    // IP2Location
    try {
      // IP2Location 地理位置数据
      const ip2location = new IP2Location.IP2Location();
      ip2location.open(path.join(DB_DIR, 'IP2LOCATION-LITE-DB11.BIN'));
      const ip2locationData = ip2location.getAll(ip);

      // IP2Location ASN 数据
      const ip2locationAsn = new IP2Location.IP2Location();
      ip2locationAsn.open(path.join(DB_DIR, 'IP2LOCATION-LITE-ASN.BIN'));
      const ip2locationAsnData = ip2locationAsn.getAll(ip);

      // IP2Proxy 代理检测数据
      const ip2proxy = new IP2Proxy.IP2Proxy();
      ip2proxy.open(path.join(DB_DIR, 'IP2PROXY-LITE-PX11.BIN'));
      const ip2proxyData = ip2proxy.getAll(ip);

      sources.push('IP2Location');
      result.ip2location = {
        city: ip2locationData.city || '-',
        country: ip2locationData.country_long || '-',
        region: ip2locationData.region || '-',
        isp: '-',
        domain: '-',
        asn: ip2locationAsnData.asn || '-',
        as: ip2locationAsnData.as || '-',
        proxy: {
          isProxy: ip2proxyData.isProxy === 1,
          proxyType: '-',
          usageType: '-',
          threat: '-',
        },
      };

      // 补充主要结果中的空值
      if (!result.city || result.city === '-') result.city = result.ip2location.city;
      if (!result.country || result.country === '-') result.country = result.ip2location.country;
      if (!result.region || result.region === '-') result.region = result.ip2location.region;
      if (!result.asn || result.asn === '-') result.asn = result.ip2location.asn;

      // 更新网络信息
      if (result.network) {
        result.network.proxy = result.network.proxy || result.ip2location.proxy.isProxy;
        result.network.proxyType = '-';
        result.network.isp = '-';
        result.network.domain = '-';
        result.network.usageType = '-';
        result.network.threat = '-';
      }
    } catch (error) {
      console.error('IP2Location 查询失败:', error);
    }

    // IPinfo
    try {
      const ipinfoReader = await maxmind.open(path.join(DB_DIR, 'ipinfo-country_asn.mmdb'));
      const ipinfoData = ipinfoReader.get(ip);

      sources.push('IPinfo');
      result.ipinfo = {
        asn: ipinfoData?.asn || '-',
        asnOrg: ipinfoData?.as_name || '-',
        country: ipinfoData?.country_name || '-',
        continent: ipinfoData?.continent_name || '-',
        asDomain: ipinfoData?.as_domain || '-',
      };

      // 补充主要结果中的空值
      if (!result.asn || result.asn === '-') result.asn = result.ipinfo.asn;
      if (!result.asnOrg || result.asnOrg === '-') result.asnOrg = result.ipinfo.asnOrg;
      if (!result.country || result.country === '-') result.country = result.ipinfo.country;
      if (!result.continent || result.continent === '-') result.continent = result.ipinfo.continent;
    } catch (error) {
      console.error('IPinfo 查询失败:', error);
    }

    // IPtoASN
    try {
      const iptoasnReader = await maxmind.open(path.join(DB_DIR, 'iptoasn-asn-ipv4.mmdb'));
      const iptoasnData = iptoasnReader.get(ip);

      sources.push('IPtoASN');
      result.iptoasn = {
        asn: iptoasnData?.autonomous_system_number || '-',
        asnOrg: iptoasnData?.autonomous_system_organization || '-',
      };

      // 补充主要结果中的空值
      if (!result.asn || result.asn === '-') result.asn = result.iptoasn.asn;
      if (!result.asnOrg || result.asnOrg === '-') result.asnOrg = result.iptoasn.asnOrg;
    } catch (error) {
      console.error('IPtoASN 查询失败:', error);
    }

    // 检查是否为中国IP
    let isChineseIp = false;

    // 从MaxMind和DB-IP结果中判断是否为中国IP
    if (
      result.maxmind?.country === 'China' ||
      result.maxmind?.country_code === 'CN' ||
      result.dbip?.country === 'CN' ||
      result.dbip?.country_names?.en === 'China'
    ) {
      isChineseIp = true;
    }

    // 如果是中国IP，添加额外的中文信息
    if (isChineseIp) {
      // GeoCN数据库查询
      try {
        const geocnReader = await maxmind.open(path.join(DB_DIR, 'geocn.mmdb'));
        const geocnData = geocnReader.get(ip);

        if (geocnData) {
          sources.push('GeoCN');
          result.geocn = geocnData;
        }
      } catch (error) {
        console.error('GeoCN 查询失败:', error);
      }

      // 纯真IP库查询
      try {
        const qqwry = Libqqwry.init();
        qqwry.speed();
        const qqwryData = qqwry.searchIP(ip);

        if (qqwryData) {
          sources.push('QQWry');
          result.qqwry = {
            country: qqwryData.Country,
            area: qqwryData.Area,
          };
        }
      } catch (error) {
        console.error('纯真IP库查询失败:', error);
      }
    }

    // ASN补充信息
    try {
      const asnInfoContent = fs.readFileSync(path.join(DB_DIR, 'asn-info.csv'), 'utf-8');
      const asnInfoLines = asnInfoContent.split('\n');
      const currentAsn = String(result.asn).replace(/[^0-9]/g, '');

      if (currentAsn) {
        const asnInfo = asnInfoLines.find(line => line.startsWith(`${currentAsn},`));
        if (asnInfo) {
          const [asn, name, country, org] = asnInfo
            .split(',')
            .map(field => field.replace(/^"|"$/g, '').trim());

          // 收集所有可能的ASN名称，按照完整性排序
          const possibleNames = [
            result.maxmind?.asnOrg,
            result.dbip?.asnOrg,
            result.ipinfo?.asnOrg,
            result.iptoasn?.asnOrg,
            result.ip2location?.as,
            org,
            name,
          ]
            .filter(n => n && n !== '-' && n.length > 3)
            .map(n => n.trim())
            .filter((n, i, arr) => arr.indexOf(n) === i); // 去重

          // 选择最完整的名称作为主要组织名称
          const mainName = possibleNames[0] || org || name;
          result.asnOrg = mainName;

          // 添加ASN补充信息
          result.asnInfo = {
            number: asn,
            name: name || mainName,
            org: mainName,
            country: country || mainName,
          };

          // 添加别名（排除主要名称和重复项）
          const altNames = possibleNames
            .slice(1) // 跳过主要名称
            .filter(n => {
              // 检查名称是否是主要名称的一部分或包含主要名称
              const mainWords = mainName.toLowerCase().split(/[\s,.-]+/);
              const altWords = n.toLowerCase().split(/[\s,.-]+/);
              return (
                !mainWords.some((w: string) => altWords.includes(w)) &&
                !altWords.some((w: string) => mainWords.includes(w))
              );
            });

          if (altNames.length > 0) {
            result.asnInfo.aka = altNames.join(' / ');
          }
        }
      }
    } catch (error) {
      console.error('ASN补充信息查询失败:', error);
    }

    // 清理结果中的空值
    Object.keys(result).forEach((key: string) => {
      if ((result as any)[key] === '-' || (result as any)[key] === undefined) {
        delete (result as any)[key];
      }
    });

    result.source = sources;
    result.timestamp = new Date().toISOString();

    return NextResponse.json(result);
  } catch (error) {
    console.error('IP 查询失败:', error);
    return NextResponse.json({ error: 'Failed to query IP information' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { ip } = body;

    if (!ip) {
      // 如果没有提供IP，则获取客户端IP
      try {
        ip = getClientIP(request);
      } catch (error) {
        return NextResponse.json({ error: '无法获取IP地址' }, { status: 400 });
      }
    }

    const dbService = await DatabaseService.getInstance();
    const result = await dbService.queryIP(ip);

    return NextResponse.json({
      ip,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('查询IP时出错:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询IP时出错' },
      { status: 500 }
    );
  }
}
