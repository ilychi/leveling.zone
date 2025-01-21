import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import maxmind from 'maxmind';
import { parse } from 'csv-parse/sync';
import { IP2Location } from 'ip2location-nodejs';
import { IP2Proxy } from 'ip2proxy-nodejs';
import { cleanupObject } from '@/utils/cleanup';
const IPDB = require('ipdb');

const DB_DIR = './data/db';

interface LocationInfo {
  latitude?: number | string;
  longitude?: number | string;
  timezone?: string;
  zipcode?: string;
}

interface NetworkInfo {
  proxy?: {
    isProxy: boolean;
    proxyType?: string;
    provider?: string;
    region?: string;
    city?: string;
    threat?: string;
    usage?: string;
  };
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

interface GeoCNResponse {
  province?: string;
  city?: string;
  districts?: string;
  provinceCode?: string;
  cityCode?: string;
  districtsCode?: string;
  isp?: string;
  net?: string;
}

interface IPtoASNResponse {
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
}

// 保留必要的工具函数
function normalizeCoordinates(
  lat?: number,
  lon?: number
): { latitude?: number; longitude?: number } {
  if (!lat || !lon) return {};
  return {
    latitude: parseFloat(lat.toFixed(4)),
    longitude: parseFloat(lon.toFixed(4)),
  };
}

function formatAsn(asn: string | number | undefined): string | undefined {
  if (!asn) return undefined;
  const asnStr = asn.toString();
  return asnStr.startsWith('AS') ? asnStr : `AS${asnStr}`;
}

function handleLocalhost(ip: string) {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return '8.8.8.8'; // 使用Google DNS作为本地测试IP
  }
  return ip;
}

export async function GET(request: NextRequest, { params }: { params: { ip: string } }) {
  try {
    let ip = handleLocalhost(params.ip);
    const result: any = {
      ip,
      sources: {},
      timestamp: new Date().toISOString(),
    };

    // 先查询 MaxMind 判断是否是中国 IP
    const cityReader = await maxmind.open(path.join(DB_DIR, 'GeoLite2-City.mmdb'));
    const cityData = cityReader.get(ip) as any;
    const isChineseIp = cityData?.country?.iso_code === 'CN';

    if (isChineseIp) {
      // 中国 IP 的原有逻辑
      if (cityData) {
        result.sources.maxmind = {
          location: {
            country: cityData.country?.names?.en,
            countryCode: cityData.country?.iso_code,
            city: cityData.city?.names?.en,
            region: cityData.subdivisions?.[0]?.names?.en,
            regionCode: cityData.subdivisions?.[0]?.iso_code,
            continent: cityData.continent?.names?.en,
            continentCode: cityData.continent?.code,
            timezone: cityData.location?.time_zone,
          },
        };
      }

      // 加载其他必要的数据库
      const [asnReader, iptoasnReader] = await Promise.all([
        maxmind.open(path.join(DB_DIR, 'GeoLite2-ASN.mmdb')),
        maxmind.open(path.join(DB_DIR, 'iptoasn-asn-ipv4.mmdb')),
      ]);

      // QQWry数据库 (IPDB格式)
      try {
        const ipdb = new IPDB(fs.readFileSync(path.join(DB_DIR, 'qqwry.ipdb')));
        const qqwryData = ipdb.find(ip) as any;
        if (qqwryData && qqwryData.code === 0) {
          const data = qqwryData.data;
          result.sources.qqwry = {
            location: {
              country: data.country_name,
              region: data.region_name,
              city: data.city_name,
              district: data.district_name,
            },
            network: {
              isp: data.isp_domain,
              organization: data.owner_domain,
            },
          };
        }
      } catch (error) {
        console.error('QQWry IPDB查询失败:', error);
      }

      // GeoCN数据库
      try {
        const geocnReader = await maxmind.open(path.join(DB_DIR, 'geocn.mmdb'));
        const geocnData = geocnReader.get(ip) as GeoCNResponse;
        if (geocnData) {
          result.sources.geocn = {
            location: {
              country: '中国',
              province: geocnData.province,
              city: geocnData.city,
              district: geocnData.districts,
              provinceCode: geocnData.provinceCode,
              cityCode: geocnData.cityCode,
              districtCode: geocnData.districtsCode,
            },
            network: {
              isp: geocnData.isp,
              type: geocnData.net,
            },
          };
        }
      } catch (error) {
        console.error('GeoCN查询失败:', error);
      }

      // IPtoASN数据
      try {
        const iptoasnData = iptoasnReader.get(ip) as IPtoASNResponse;
        if (iptoasnData) {
          const orgFullName = iptoasnData.autonomous_system_organization || '';
          let asnName = '';
          let orgName = orgFullName;

          if (orgFullName) {
            const matches = orgFullName.match(/^(\S+)\s+(.+)$/);
            if (matches) {
              asnName = matches[1];
              orgName = matches[2];
            }
          }

          result.sources.iptoasn = {
            network: {
              asn: iptoasnData.autonomous_system_number,
              name: asnName,
              organization: orgName,
            },
          };
        }
      } catch (error) {
        console.error('IPtoASN查询失败:', error);
      }

      // ASN Info数据
      try {
        const asnInfoData = fs.readFileSync(path.join(DB_DIR, 'asn-info.csv'), 'utf-8');
        const records = parse(asnInfoData, {
          columns: true,
          skip_empty_lines: true,
        });

        const asnNumber = result.sources.iptoasn?.network?.asn;
        if (asnNumber) {
          const asnInfo = records.find((record: any) => parseInt(record.asn) === asnNumber);
          if (asnInfo) {
            result.sources.asnInfo = {
              number: asnInfo.asn,
              handle: asnInfo.handle,
              description: asnInfo.description,
            };
          }
        }
      } catch (error) {
        console.error('ASN Info查询失败:', error);
      }
    } else {
      // 非中国 IP，保持原有逻辑
      const [
        countryReader,
        asnReader,
        dbipReader,
        ip2locationDb,
        ip2proxyDb,
        ipinfoReader,
        iptoasnReader,
      ] = await Promise.all([
        maxmind.open(path.join(DB_DIR, 'GeoLite2-Country.mmdb')),
        maxmind.open(path.join(DB_DIR, 'GeoLite2-ASN.mmdb')),
        maxmind.open(path.join(DB_DIR, 'dbip-city-lite.mmdb')),
        new IP2Location(),
        new IP2Proxy(),
        maxmind.open(path.join(DB_DIR, 'ipinfo-country_asn.mmdb')),
        maxmind.open(path.join(DB_DIR, 'iptoasn-asn-ipv4.mmdb')),
      ]);

      // MaxMind数据
      try {
        const countryData = countryReader.get(ip) as any;
        const asnData = asnReader.get(ip) as any;

        if (cityData || countryData || asnData) {
          const coords = normalizeCoordinates(
            cityData?.location?.latitude,
            cityData?.location?.longitude
          );

          result.sources.maxmind = {
            location: {
              country: cityData?.country?.names?.en || countryData?.country?.names?.en,
              countryCode: cityData?.country?.iso_code || countryData?.country?.iso_code,
              city: cityData?.city?.names?.en,
              region: cityData?.subdivisions?.[0]?.names?.en,
              regionCode: cityData?.subdivisions?.[0]?.iso_code,
              continent: cityData?.continent?.names?.en || countryData?.continent?.names?.en,
              continentCode: cityData?.continent?.code || countryData?.continent?.code,
              ...coords,
              timezone: cityData?.location?.time_zone,
              postalCode: cityData?.postal?.code,
              metroCode: cityData?.location?.metro_code,
              accuracyRadius: cityData?.location?.accuracy_radius,
              isEU:
                cityData?.country?.is_in_european_union ||
                countryData?.country?.is_in_european_union,
            },
            network: {
              asn: formatAsn(asnData?.autonomous_system_number),
              organization: asnData?.autonomous_system_organization,
              network: asnData?.network,
              route: asnData?.route,
            },
            meta: {
              isEU:
                cityData?.country?.is_in_european_union ||
                countryData?.country?.is_in_european_union ||
                false,
              registeredCountry: countryData?.registered_country
                ? {
                    name: countryData.registered_country.names?.en,
                    code: countryData.registered_country.iso_code,
                    isEU: countryData.registered_country.is_in_european_union || false,
                  }
                : undefined,
            },
          };
        }
      } catch (error) {
        console.error('MaxMind查询失败:', error);
      }

      // IP2Location数据
      try {
        // 初始化 IP2Location 数据库
        const ip2locationDb = new IP2Location();
        const ip2proxyDb = new IP2Proxy();
        const ip2asnDb = new IP2Location();

        // 打开数据库文件
        ip2locationDb.open(path.join(DB_DIR, 'IP2LOCATION-LITE-DB11.BIN'));
        ip2proxyDb.open(path.join(DB_DIR, 'IP2PROXY-LITE-PX11.BIN'));
        ip2asnDb.open(path.join(DB_DIR, 'IP2LOCATION-LITE-ASN.BIN'));

        // 查询数据
        const ip2locationData = ip2locationDb.getAll(ip) as any;
        const ip2proxyData = ip2proxyDb.getAll(ip) as any;
        const ip2asnData = ip2asnDb.getAll(ip) as any;

        if (ip2locationData || ip2proxyData || ip2asnData) {
          const coords = normalizeCoordinates(
            ip2locationData?.latitude,
            ip2locationData?.longitude
          );

          result.sources.ip2location = {
            location: {
              country: ip2locationData?.countryLong,
              countryCode: ip2locationData?.countryShort,
              region: ip2locationData?.region,
              city: ip2locationData?.city,
              ...coords,
              postalCode: ip2locationData?.zipCode,
            },
            network: {
              asn: formatAsn(ip2asnData?.asn),
              organization: ip2asnData?.as,
              provider: ip2asnData?.provider,
            },
            security: ip2proxyData
              ? {
                  isProxy: ip2proxyData.isProxy === 1,
                  proxyType: ip2proxyData.proxyType !== '-' ? ip2proxyData.proxyType : undefined,
                  isp: ip2proxyData.isp !== '-' ? ip2proxyData.isp : undefined,
                  domain: ip2proxyData.domain !== '-' ? ip2proxyData.domain : undefined,
                  usageType: ip2proxyData.usageType !== '-' ? ip2proxyData.usageType : undefined,
                  threat: ip2proxyData.threat !== '-' ? ip2proxyData.threat : undefined,
                  lastSeen: ip2proxyData.lastSeen !== '-' ? ip2proxyData.lastSeen : undefined,
                }
              : undefined,
          };
        }

        // 关闭数据库连接
        ip2locationDb.close();
        ip2proxyDb.close();
        ip2asnDb.close();
      } catch (error) {
        console.error('IP2Location查询失败:', error);
      }

      // DB-IP
      try {
        const dbipCity = await maxmind.open(path.join(DB_DIR, 'dbip-city-lite.mmdb'));
        const dbipCountry = await maxmind.open(path.join(DB_DIR, 'dbip-country-lite.mmdb'));
        const dbipAsn = await maxmind.open(path.join(DB_DIR, 'dbip-asn-lite.mmdb'));

        const cityResult = dbipCity.get(ip) as any;
        const countryResult = dbipCountry.get(ip) as any;
        const asnResult = dbipAsn.get(ip) as any;

        // 从外部 DB-IP API 获取补充信息
        let dbipDemoInfo = null;
        try {
          const dbipApiResponse = await fetch(`https://db-ip.com/demo/home.php?s=${ip}`);
          const dbipApiData = await dbipApiResponse.json();
          if (dbipApiData.status === 'ok') {
            dbipDemoInfo = dbipApiData.demoInfo;
          }
        } catch (apiError) {
          console.error('Error fetching DB-IP API:', apiError);
        }

        if (cityResult || countryResult || asnResult || dbipDemoInfo) {
          const coords = normalizeCoordinates(
            cityResult?.location?.latitude || dbipDemoInfo?.latitude,
            cityResult?.location?.longitude || dbipDemoInfo?.longitude
          );

          result.sources.dbip = {
            location: {
              country:
                cityResult?.country?.names?.en ||
                countryResult?.country?.names?.en ||
                dbipDemoInfo?.countryName,
              countryCode:
                cityResult?.country?.iso_code ||
                countryResult?.country?.iso_code ||
                dbipDemoInfo?.countryCode,
              city: cityResult?.city?.names?.en || dbipDemoInfo?.city,
              region: cityResult?.subdivisions?.[0]?.names?.en || dbipDemoInfo?.stateProv,
              regionCode: dbipDemoInfo?.stateProvCode,
              district: dbipDemoInfo?.district,
              continent:
                cityResult?.continent?.code ||
                countryResult?.continent?.code ||
                dbipDemoInfo?.continentCode,
              continentName:
                cityResult?.continent?.names?.en ||
                countryResult?.continent?.names?.en ||
                dbipDemoInfo?.continentName,
              ...coords,
              postalCode: dbipDemoInfo?.zipCode,
              timezone: dbipDemoInfo?.timeZone,
              gmtOffset: dbipDemoInfo?.gmtOffset,
            },
            network: {
              asn: formatAsn(asnResult?.autonomous_system_number || dbipDemoInfo?.asNumber),
              name: dbipDemoInfo?.asName,
              organization: asnResult?.autonomous_system_organization || dbipDemoInfo?.organization,
              isp: dbipDemoInfo?.isp,
              usageType: dbipDemoInfo?.usageType,
            },
            security: {
              threatLevel: dbipDemoInfo?.threatLevel || 'low',
              isProxy: dbipDemoInfo?.isProxy || false,
              isCrawler: dbipDemoInfo?.isCrawler || false,
            },
            meta: {
              geonameId:
                dbipDemoInfo?.geonameId ||
                cityResult?.city?.geoname_id ||
                cityResult?.country?.geoname_id,
              weatherCode: dbipDemoInfo?.weatherCode,
            },
          };
        }
      } catch (error) {
        console.error('DB-IP查询失败:', error);
      }

      // IPinfo
      try {
        const ipinfo = await maxmind.open(path.join(DB_DIR, 'ipinfo-country_asn.mmdb'));
        const ipinfoResult = ipinfo.get(ip) as any;

        // 从外部 IPinfo API 获取补充信息
        const ipinfoApiResponse = await fetch(`https://ipinfo.io/widget/demo/${ip}`);
        const ipinfoApiData = await ipinfoApiResponse.json();
        const ipinfoData = ipinfoApiData.data;

        if (ipinfoResult || ipinfoData) {
          let latitude: number | undefined;
          let longitude: number | undefined;

          if (ipinfoData?.loc) {
            const [lat, lon] = ipinfoData.loc.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lon)) {
              const coords = normalizeCoordinates(lat, lon);
              latitude = coords.latitude;
              longitude = coords.longitude;
            }
          }

          result.sources.ipinfo = {
            location: {
              country: ipinfoResult?.country_name || ipinfoData?.country,
              countryCode: ipinfoResult?.country || ipinfoData?.country,
              continent: ipinfoResult?.continent,
              continentName: ipinfoResult?.continent_name,
              region: ipinfoData?.region,
              city: ipinfoData?.city,
              postalCode: ipinfoData?.postal,
              timezone: ipinfoData?.timezone,
              latitude,
              longitude,
            },
            network: {
              asn: formatAsn(ipinfoResult?.asn || ipinfoData?.asn?.asn),
              organization: ipinfoResult?.as_name || ipinfoData?.org?.split(' ')[1],
              domain: ipinfoResult?.as_domain || ipinfoData?.asn?.domain,
              route: ipinfoData?.asn?.route,
              type: ipinfoData?.asn?.type,
            },
            security: {
              isVpn: ipinfoData?.privacy?.vpn || false,
              isProxy: ipinfoData?.privacy?.proxy || false,
              isTor: ipinfoData?.privacy?.tor || false,
              isRelay: ipinfoData?.privacy?.relay || false,
              isHosting: ipinfoData?.privacy?.hosting || false,
              service: ipinfoData?.privacy?.service || undefined,
            },
            meta: {
              hostname: ipinfoData?.hostname,
              organization: {
                name: ipinfoData?.company?.name,
                domain: ipinfoData?.company?.domain,
                type: ipinfoData?.company?.type,
              },
            },
          };
        }
      } catch (error) {
        console.error('IPinfo查询失败:', error);
      }

      // IPtoASN数据
      try {
        const iptoasnData = iptoasnReader.get(ip) as IPtoASNResponse;
        if (iptoasnData) {
          const orgFullName = iptoasnData.autonomous_system_organization || '';
          let asnName = '';
          let orgName = orgFullName;

          if (orgFullName) {
            const matches = orgFullName.match(/^(\S+)\s+(.+)$/);
            if (matches) {
              asnName = matches[1];
              orgName = matches[2];
            }
          }

          result.sources.iptoasn = {
            network: {
              asn: iptoasnData.autonomous_system_number,
              name: asnName,
              organization: orgName,
            },
          };
        }
      } catch (error) {
        console.error('IPtoASN查询失败:', error);
      }

      // ASN Info数据
      try {
        const asnInfoData = fs.readFileSync(path.join(DB_DIR, 'asn-info.csv'), 'utf-8');
        const records = parse(asnInfoData, {
          columns: true,
          skip_empty_lines: true,
        });

        const asnNumber =
          result.sources.maxmind?.network?.asn?.replace('AS', '') ||
          result.sources.dbip?.network?.asn?.replace('AS', '');

        if (asnNumber) {
          const asnInfo = records.find(
            (record: any) => parseInt(record.asn) === parseInt(asnNumber)
          );
          if (asnInfo) {
            result.sources.asnInfo = {
              network: {
                asn: formatAsn(asnInfo.asn),
                handle: asnInfo.handle,
                description: asnInfo.description,
              },
            };
          }
        }
      } catch (error) {
        console.error('ASN Info查询失败:', error);
      }
    }

    // 清理空值
    cleanupObject(result);

    // 返回格式化的 JSON 响应
    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('IP查询失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
