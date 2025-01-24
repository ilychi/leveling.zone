import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { headers } from 'next/headers';
import { formatASN } from '@/utils/network';

// 获取 Cloudflare 信息
async function getCloudflareInfo() {
  try {
    const [traceResponse, metaResponse] = await Promise.all([
      fetch('https://1.1.1.1/cdn-cgi/trace'),
      fetch('https://speed.cloudflare.com/meta'),
    ]);

    if (!traceResponse.ok || !metaResponse.ok) return null;

    const text = await traceResponse.text();
    const metaData = await metaResponse.json();

    const traceData = text.split('\n').reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as Record<string, string>);

    return {
      ip: traceData.ip,
      location: {
        country: traceData.loc || metaData.country,
        region: metaData.region,
        city: metaData.city,
        timezone: metaData.timezone,
      },
      network: {
        asn: metaData.asn,
        organization: metaData.asOrganization,
      },
    };
  } catch (error) {
    console.error('Cloudflare查询失败:', error);
    return null;
  }
}

// 获取其他数据源信息
async function getExternalSources(ip: string) {
  const sources: Record<string, any> = {};
  const fetchWithTimeout = async (url: string, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  try {
    // useragentinfo 数据源
    try {
      const uaResponse = await fetchWithTimeout('https://ip.useragentinfo.com/json');
      if (uaResponse.ok) {
        const data = await uaResponse.json();
        sources.useragentinfo = {
          ip: data.ip,
          location: {
            country: data.country,
            country_code: data.short_name,
            province: data.province,
            city: data.city,
            area: data.area,
          },
          network: {
            isp: data.isp,
            type: data.net,
          },
        };
      }
    } catch (error) {
      console.error('useragentinfo查询失败:', error);
    }

    // qjqq 数据源
    try {
      const qjqqResponse = await fetchWithTimeout('https://api.qjqq.cn/api/Local');
      if (qjqqResponse.ok) {
        const data = await qjqqResponse.json();
        if (data.code === 200) {
          sources.qjqq = {
            ip: data.data.ip,
            location: {
              country: data.data.country,
              province: data.data.prov,
              city: data.data.city,
              district: data.data.district,
              latitude: data.data.lat,
              longitude: data.data.lng,
              timezone: data.data.time_zone,
            },
            network: {
              isp: data.data.isp,
            },
          };
        }
      }
    } catch (error) {
      console.error('qjqq查询失败:', error);
    }

    // identme 数据源
    try {
      const identmeResponse = await fetchWithTimeout('https://v4.ident.me/json');
      if (identmeResponse.ok) {
        const data = await identmeResponse.json();
        sources.identme = {
          ip: data.ip,
          location: {
            country: data.country,
            region: data.city,
            city: data.city,
            timezone: data.tz,
            latitude: data.latitude,
            longitude: data.longitude,
          },
          network: {
            asn: data.asn,
            organization: data.aso,
          },
        };
      }
    } catch (error) {
      console.error('ident.me查询失败:', error);
    }

    // ip.sb 数据源
    try {
      const ipsbResponse = await fetchWithTimeout('https://api.ip.sb/geoip');
      if (ipsbResponse.ok) {
        const data = await ipsbResponse.json();
        sources.ipsb = {
          ip: data.ip,
          location: {
            country: data.country,
            country_code: data.country_code,
            region: data.region,
            city: data.city,
            timezone: data.timezone,
            latitude: data.latitude,
            longitude: data.longitude,
          },
          network: {
            asn: data.asn,
            organization: data.asn_organization,
            isp: data.isp,
          },
        };
      }
    } catch (error) {
      console.error('ip.sb查询失败:', error);
    }

    // ipapi.is 数据源
    try {
      const ipapiisResponse = await fetchWithTimeout('https://api.ipapi.is');
      if (ipapiisResponse.ok) {
        const data = await ipapiisResponse.json();
        sources.ipapis = {
          ip: data.ip,
          location: {
            country: data.location.country,
            country_code: data.location.country_code,
            region: data.location.state,
            city: data.location.city,
            timezone: data.location.timezone,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          },
          network: {
            asn: formatASN(data.asn.asn),
            organization: data.asn.org,
            isp: data.company.name,
          },
          security: {
            is_datacenter: data.is_datacenter,
            is_vpn: data.is_vpn,
            is_proxy: data.is_proxy,
            is_tor: data.is_tor,
          },
        };
      }
    } catch (error) {
      console.error('ipapi.is查询失败:', error);
    }

    // ipapi.co 数据源
    try {
      const ipapicoResponse = await fetchWithTimeout('https://ipapi.co/json/');
      if (ipapicoResponse.ok) {
        const data = await ipapicoResponse.json();
        sources.ipapico = {
          ip: data.ip,
          location: {
            country: data.country_name,
            country_code: data.country_code,
            region: data.region,
            city: data.city,
            timezone: data.timezone,
            latitude: data.latitude,
            longitude: data.longitude,
          },
          network: {
            asn: formatASN(data.asn),
            organization: data.org,
          },
        };
      }
    } catch (error) {
      console.error('ipapi.co查询失败:', error);
    }

    // ip-api.io 数据源
    try {
      const ipapiioResponse = await fetchWithTimeout('https://ip-api.io/json');
      if (ipapiioResponse.ok) {
        const data = await ipapiioResponse.json();
        sources.ipapiio = {
          ip: data.ip,
          location: {
            country: data.country_name,
            country_code: data.country_code,
            region: data.region_name,
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.time_zone,
          },
          network: {
            organization: data.organisation,
          },
          security: {
            isProxy: data.suspiciousFactors.isProxy,
            isSpam: data.suspiciousFactors.isSpam,
            isTorNode: data.suspiciousFactors.isTorNode,
          },
        };
      }
    } catch (error) {
      console.error('ip-api.io查询失败:', error);
    }

    // 知了IP数据源
    try {
      const zhaleResponse = await fetchWithTimeout('https://ipv4cn.zhale.me/ip.php');
      if (zhaleResponse.ok) {
        const data = await zhaleResponse.json();
        sources.zhale = {
          ip: data.ip || '-',
          location: {
            country: data.location.split(', ')[0],
            province: data.location.split(', ')[1],
          },
        };
      }
    } catch (error) {
      console.error('知了IP查询失败:', error);
    }

    // pconline 数据源
    try {
      const pconlineResponse = await fetchWithTimeout(
        'https://whois.pconline.com.cn/ipJson.jsp?json=true',
        {
          headers: {
            'Accept-Charset': 'GB2312,utf-8;q=0.7,*;q=0.3',
          },
        }
      );
      if (pconlineResponse.ok) {
        const buffer = await pconlineResponse.arrayBuffer();
        const decoder = new TextDecoder('gb2312');
        const text = decoder.decode(buffer);
        const data = JSON.parse(text);
        sources.pconline = {
          ip: data.ip,
          location: {
            country: '中国',
            country_code: 'CN',
            province: data.pro,
            city: data.city,
          },
          network: {
            isp: data.addr.match(/(电信|联通|移动|铁通|广电|教育网)/)?.[0] || data.addr,
          },
        };
      }
    } catch (error) {
      console.error('pconline查询失败:', error);
    }

    // 美图 IP 数据源
    try {
      const meituResponse = await fetchWithTimeout(
        'https://webapi-pc.meitu.com/common/ip_location'
      );
      if (meituResponse.ok) {
        const data = await meituResponse.json();
        if (data.code === 0) {
          const ipData = data.data[Object.keys(data.data)[0]];
          sources.meitu = {
            location: {
              country: ipData.nation,
              country_code: ipData.nation_code,
              province: ipData.province,
              city: ipData.city,
              latitude: ipData.latitude,
              longitude: ipData.longitude,
              timezone: ipData.time_zone,
            },
            network: {
              isp: ipData.isp,
            },
          };
        }
      }
    } catch (error) {
      console.error('美图IP查询失败:', error);
    }

    // ip.cn 数据源
    try {
      const ipcnResponse = await fetchWithTimeout('https://www.ip.cn/api/index?type=0');
      if (ipcnResponse.ok) {
        const data = await ipcnResponse.json();
        if (data.rs === 1) {
          const addressParts = data.address.split(' ');
          const isp = addressParts.pop() || '-'; // 获取最后一个部分作为运营商
          const location = addressParts.filter(Boolean).join(' • '); // 其余部分作为地理位置，用 • 连接

          sources.ipcn = {
            ip: data.ip || '-',
            location: {
              country: location || '-',
            },
            network: {
              isp: isp,
            },
          };
        }
      }
    } catch (error) {
      console.error('ip.cn查询失败:', error);
    }

    // iplark 数据源
    try {
      const iplarkResponse = await fetchWithTimeout('https://iplark.com/ipstack');
      if (iplarkResponse.ok) {
        const data = await iplarkResponse.json();
        sources.iplark = {
          location: {
            country: data.country_name,
            country_code: data.country_code,
            region: data.region_name,
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.time_zone?.id,
          },
          network: {
            type: data.ip_routing_type,
            connection: data.connection_type,
          },
        };
      }
    } catch (error) {
      console.error('iplark查询失败:', error);
    }

    // 百度企服API数据源
    try {
      const qifuResponse = await fetchWithTimeout(
        'https://qifu-api.baidubce.com/ip/local/geo/v1/district'
      );
      if (qifuResponse.ok) {
        const data = await qifuResponse.json();
        if (data.code === 'Success') {
          sources.qifu = {
            ip: data.ip,
            location: {
              country: data.data.country,
              province: data.data.prov,
              city: data.data.city,
              district: data.data.district,
            },
            network: {
              isp: data.data.owner || data.data.isp,
            },
          };
        }
      }
    } catch (error) {
      console.error('百度企服API查询失败:', error);
    }

    // 腾讯新闻API数据源
    try {
      const qqnewsResponse = await fetchWithTimeout('https://r.inews.qq.com/api/ip2city');
      if (qqnewsResponse.ok) {
        const data = await qqnewsResponse.json();
        if (data.ret === 0) {
          sources.qqnews = {
            ip: data.ip,
            location: {
              country: data.country,
              province: data.province,
              city: data.city,
              district: data.district,
            },
            network: {
              isp: data.isp,
            },
          };
        }
      }
    } catch (error) {
      console.error('腾讯新闻API查询失败:', error);
    }

    // IPIP.NET数据源
    try {
      const ipipResponse = await fetchWithTimeout('https://myip.ipip.net/json');
      if (ipipResponse.ok) {
        const data = await ipipResponse.json();
        if (data.ret === 'ok') {
          sources.ipip = {
            ip: data.data.ip,
            location: {
              country: data.data.location[0],
              province: data.data.location[1],
              city: data.data.location[2],
              district: data.data.location[3],
            },
            network: {
              isp: data.data.location[4],
            },
          };
        }
      }
    } catch (error) {
      console.error('IPIP.NET查询失败:', error);
    }

    // VORE-API数据源
    try {
      const voreResponse = await fetchWithTimeout('https://api.vore.top/api/IPdata');
      if (voreResponse.ok) {
        const data = await voreResponse.json();
        if (data.code === 200) {
          sources.vore = {
            ip: data.ipinfo.text,
            location: {
              country: data.ipdata.info1,
              province: data.ipdata.info2,
              city: data.ipdata.info3,
            },
            network: {
              isp: data.ipdata.isp,
              type: data.ipinfo.type,
            },
          };
        }
      }
    } catch (error) {
      console.error('VORE-API查询失败:', error);
    }

    // 今日头条数据源
    try {
      const toutiaoResponse = await fetchWithTimeout(
        'https://www.toutiao.com/stream/widget/local_weather/data/'
      );
      if (toutiaoResponse.ok) {
        const data = await toutiaoResponse.json();
        if (data.success) {
          sources.toutiao = {
            location: {
              country: data.data.country,
              province: data.data.province,
              city: data.data.city,
              district: data.data.district,
            },
            network: {
              isp: data.data.isp,
            },
          };
        }
      }
    } catch (error) {
      console.error('今日头条查询失败:', error);
    }

    // 又拍云数据源
    try {
      const upyunResponse = await fetchWithTimeout('https://pubstatic.b0.upaiyun.com/?_upnode');
      if (upyunResponse.ok) {
        const data = await upyunResponse.json();
        sources.upyun = {
          ip: data.remote_addr,
          location: {
            country: data.remote_addr_location.country,
            province: data.remote_addr_location.province,
            city: data.remote_addr_location.city,
          },
          network: {
            isp: data.remote_addr_location.isp,
          },
        };
      }
    } catch (error) {
      console.error('又拍云查询失败:', error);
    }

    // 高德地图数据源
    try {
      const amapResponse = await fetchWithTimeout(
        'https://restapi.amap.com/v3/ip?key=0113a13c88697dcea6a445584d535837'
      );
      if (amapResponse.ok) {
        const data = await amapResponse.json();
        if (data.status === '1') {
          sources.amap = {
            ip: data.ip || '-',
            location: {
              province: data.province || '-',
              city: data.city || '-',
            },
          };
        }
      }
    } catch (error) {
      console.error('高德地图查询失败:', error);
    }

    // APIP.CC数据源
    try {
      const apipResponse = await fetchWithTimeout('https://apip.cc/json');
      if (apipResponse.ok) {
        const data = await apipResponse.json();
        if (data.status === 'success') {
          sources.apipcc = {
            ip: data.query || '-',
            location: {
              country: data.CountryName,
              region: data.RegionName,
              city: data.City,
              timezone: data.TimeZone,
              latitude: data.Latitude,
              longitude: data.Longitude,
            },
            network: {
              asn: formatASN(data.asn),
              organization: data.org,
            },
          };
        }
      }
    } catch (error) {
      console.error('APIP.CC查询失败:', error);
    }

    // 纯真IP数据源
    try {
      const zxincResponse = await fetchWithTimeout('https://v4.ip.zxinc.org/info.php?type=json');
      if (zxincResponse.ok) {
        const data = await zxincResponse.json();
        if (data.code === 0) {
          const location = data.data.location?.replace(/–/g, ' • ') || '-';
          sources.zxinc = {
            ip: data.data.myip || '-',
            location: {
              country: location.split(' • ')[0] || '-',
              province: location.split(' • ')[1] || '-',
              city: location.split(' • ')[2] || '-',
            },
            network: {
              isp: data.data.local || '-',
            },
            meta: {
              version: data.data.ver4,
              count4: data.data.count4,
              count6: data.data.count6,
            },
          };
        }
      }
    } catch (error) {
      console.error('纯真IP查询失败:', error);
    }

    // ipquery.io 数据源
    try {
      const ipqueryResponse = await fetchWithTimeout('https://api.ipquery.io/?format=json');
      if (ipqueryResponse.ok) {
        const data = await ipqueryResponse.json();
        sources.ipquery = {
          ip: data.ip || '-',
          location: {
            country: data.location.country,
            region: data.location.state,
            city: data.location.city,
            timezone: data.location.timezone,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          },
          network: {
            asn: formatASN(data.isp.asn),
            organization: data.isp.org,
            isp: data.isp.isp,
          },
          security: {
            is_vpn: data.risk.is_vpn,
            is_proxy: data.risk.is_proxy,
            is_datacenter: data.risk.is_datacenter,
            risk_score: data.risk.risk_score,
          },
        };
      }
    } catch (error) {
      console.error('ipquery.io查询失败:', error);
    }

    // ip138.xyz 数据源
    try {
      const ip138Response = await fetchWithTimeout('https://ip138.xyz/json');
      if (ip138Response.ok) {
        const data = await ip138Response.json();
        sources.ip138 = {
          ip: data.ip || '-',
          location: {
            country: data.country || '-',
            country_code: data.country_iso || '-',
            region: data.region_name || '-',
            city: data.city || '-',
            timezone: data.time_zone || '-',
            latitude: data.latitude || '-',
            longitude: data.longitude || '-',
          },
          network: {
            asn: formatASN(data.asn),
            organization: data.asn_org || '-',
          },
          meta: {
            zip_code: data.zip_code,
            metro_code: data.metro_code,
          },
        };
      }
    } catch (error) {
      console.error('ip138.xyz查询失败:', error);
    }

    // 美图IP查询暂时禁用
    /*try {
      const meituanResponse = await fetchWithTimeout('https://meituan.com/api/ip');
      if (meituanResponse.ok) {
        const data = await meituanResponse.json();
        sources.meituan = {
          ip: data.ip || '-',
          location: {
            country: data.country || '-',
            region: data.region || '-',
            city: data.city || '-',
          },
        };
      }
    } catch (error) {
      console.error('美图IP查询失败:', error);
    }*/

    // leak查询暂时禁用
    /*try {
      const leakResponse = await fetchWithTimeout(`/api/leak?ip=${ip}`);
      if (leakResponse.ok) {
        const data = await leakResponse.json();
        sources.leak = {
          ip: data.ip || '-',
          location: {
            country: data.country || '-',
            region: data.region || '-',
            city: data.city || '-',
          },
        };
      }
    } catch (error) {
      console.error('leak查询失败:', error);
    }*/

    // browserscan 数据源
    try {
      const browserScanResponse = await fetchWithTimeout(
        'https://ip-scan.browserscan.net/sys/config/ip/get-visitor-ip?type=ip-api'
      );
      if (browserScanResponse.ok) {
        const response = await browserScanResponse.json();
        if (response.code === 0 && response.data?.ip_data) {
          const data = response.data.ip_data;
          sources.browserscan = {
            ip: response.data.ip,
            location: {
              country: data.country?.toUpperCase(),
              country_code: data.country?.toUpperCase(),
              region: data.region,
              city: data.city,
              timezone: data.timezone,
              latitude: data.latitude,
              longitude: data.longitude,
            },
            network: {
              isp: data.isp,
            },
          };
        }
      }
    } catch (error) {
      console.error('browserscan查询失败:', error);
    }

    // ping0 数据源
    try {
      const ping0Response = await fetchWithTimeout('https://ping0.cc/geo');
      if (ping0Response.ok) {
        const text = await ping0Response.text();
        // 示例: 18.232.187.8 美国 弗吉尼亚州 阿什本 — 亚马逊云 Aws AS14618 Amazon Technologies Inc.
        const match = text.match(
          /^([\d.]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+[—-]\s+([^A]+)(?:AS(\d+)\s+(.+))?/
        );
        if (match) {
          const [_, ip, country, region, city, isp, asn, org] = match;
          sources.ping0 = {
            ip,
            location: {
              country,
              region,
              city,
            },
            network: {
              asn: asn ? `AS${asn}` : undefined,
              organization: org?.trim(),
              isp: isp?.trim(),
            },
          };
        }
      }
    } catch (error) {
      console.error('ping0查询失败:', error);
    }
  } catch (error) {
    console.error('外部数据源查询失败:', error);
  }

  return sources;
}

// 获取ping0数据
async function getPing0Info(ip: string) {
  try {
    const response = await axios.get(`https://ping0.cc/geo/${ip}`);
    const data = response.data;
    return {
      country: data.country || '',
      region: data.region || '',
      city: data.city || '',
      isp: data.isp || '',
      asn: data.asn || '',
      asnOrg: data.asnOrg || '',
    };
  } catch (error) {
    console.error('获取ping0数据失败:', error);
    return null;
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const headersList = headers();
  const ip = (
    headersList.get('x-real-ip') ||
    headersList.get('x-forwarded-for')?.split(',')[0] ||
    '127.0.0.1'
  ).trim();

  try {
    // 获取ping0数据
    const ping0Data = await getPing0Info(ip);

    // 并行获取所有数据源
    const [cloudflareInfo, externalSources] = await Promise.all([
      getCloudflareInfo(),
      getExternalSources(ip),
    ]);

    // 合并所有数据源
    const sources = {
      ...(cloudflareInfo && { cloudflare: cloudflareInfo }),
      ...externalSources,
    };

    return NextResponse.json({
      ip,
      ping0: ping0Data,
      sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('IP信息获取失败:', error);
    return NextResponse.json({ error: '获取IP信息失败' }, { status: 500 });
  }
}
