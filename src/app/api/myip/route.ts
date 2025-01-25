import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { headers } from 'next/headers';
import { formatASN } from '@/utils/network';

// IP 地址验证函数
function isValidIpAddress(ip: string): boolean {
  // IPv4 验证
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 验证
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$/;
  return ipv6Regex.test(ip);
}

// 获取真实 IP 地址
function getRealIpAddress(headersList: Headers): { ip: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const ipHeaders = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // Nginx 代理
    'x-forwarded-for', // 标准代理头
    'x-client-ip', // Akamai 和其他 CDN
    'x-forwarded', // 通用代理
    'forwarded-for', // 通用代理
    'x-cluster-client-ip', // GCP/AWS 负载均衡
    'x-forwarded-host', // 反向代理
    'true-client-ip', // Akamai
    'fastly-client-ip', // Fastly CDN
    'x-original-forwarded-for', // AWS CloudFront
  ];

  let detectedIp = '127.0.0.1';

  for (const header of ipHeaders) {
    const value = headersList.get(header);
    if (value) {
      headers[header] = value;
      // 对于 x-forwarded-for，取第一个 IP（最原始的客户端 IP）
      const ip = header === 'x-forwarded-for' ? value.split(',')[0].trim() : value;
      if (isValidIpAddress(ip)) {
        detectedIp = ip;
        break;
      }
    }
  }

  return {
    ip: detectedIp,
    headers,
  };
}

// 获取 Cloudflare 信息
async function getCloudflareInfo(ip: string) {
  try {
    const headers = {
      'X-Forwarded-For': ip,
      'X-Real-IP': ip,
      'CF-Connecting-IP': ip,
      'True-Client-IP': ip,
    };

    const [traceResponse, metaResponse] = await Promise.all([
      fetch('https://1.1.1.1/cdn-cgi/trace', { headers }),
      fetch('https://speed.cloudflare.com/meta', { headers }),
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
  const fetchWithTimeout = async (
    url: string,
    options: { headers?: Record<string, string> } = {},
    timeout = 5000
  ) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      // 添加 X-Forwarded-For 和其他相关头
      const headers = {
        'X-Forwarded-For': ip,
        'X-Real-IP': ip,
        'CF-Connecting-IP': ip,
        'True-Client-IP': ip,
        ...(options.headers || {}),
      };

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
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
    const headers = {
      'X-Forwarded-For': ip,
      'X-Real-IP': ip,
      'CF-Connecting-IP': ip,
      'True-Client-IP': ip,
    };

    const response = await axios.get(`https://ping0.cc/geo/${ip}`, { headers });
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

// 获取客户端真实 IP
function getClientIP(request: NextRequest): string {
  // Vercel 特定的请求头
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  const vercelIP = request.headers.get('x-real-ip');

  // Cloudflare 特定的请求头
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // 标准代理头
  const forwardedFor = request.headers.get('x-forwarded-for');

  // 按优先级获取 IP
  if (vercelForwardedFor) {
    // Vercel 转发的原始 IP 列表，取第一个
    return vercelForwardedFor.split(',')[0].trim();
  }

  if (vercelIP) {
    // Vercel 的 Edge Network 检测到的 IP
    return vercelIP;
  }

  if (cfConnectingIP) {
    // Cloudflare 检测到的 IP
    return cfConnectingIP;
  }

  if (forwardedFor) {
    // 标准代理头，取第一个 IP（最原始的客户端 IP）
    return forwardedFor.split(',')[0].trim();
  }

  // 如果都没有，使用请求对象的 IP（Edge Runtime 提供）
  return request.ip || '127.0.0.1';
}

export async function GET(request: NextRequest) {
  // 获取真实 IP
  const ip = getClientIP(request);

  // 获取 Edge Runtime 的地理位置信息
  const geo = request.geo || {};

  try {
    // 获取ping0数据
    const ping0Data = await getPing0Info(ip);

    // 并行获取所有数据源
    const [cloudflareInfo, externalSources] = await Promise.all([
      getCloudflareInfo(ip),
      getExternalSources(ip),
    ]);

    // 格式化数据源输出
    const formattedSources: Record<string, any> = {};

    // 添加 Cloudflare 信息
    if (cloudflareInfo) {
      formattedSources.cloudflare = {
        ip: cloudflareInfo.ip,
        location: {
          country: cloudflareInfo.location.country,
          region: cloudflareInfo.location.region,
          city: cloudflareInfo.location.city,
          timezone: cloudflareInfo.location.timezone,
        },
        network: {
          asn: cloudflareInfo.network.asn,
          organization: cloudflareInfo.network.organization,
        },
      };
    }

    // 添加其他数据源
    Object.entries(externalSources).forEach(([source, data]) => {
      formattedSources[source] = {
        ip: data.ip || '-',
        location: {
          country: data.location?.country || '-',
          region: data.location?.region || data.location?.province || '-',
          city: data.location?.city || '-',
          district: data.location?.district || '-',
          timezone: data.location?.timezone,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
        },
        network: {
          asn: data.network?.asn || '-',
          organization: data.network?.organization || data.network?.isp || '-',
          type: data.network?.type || '-',
        },
      };
    });

    // 构建响应
    const response = NextResponse.json(
      {
        ip,
        edge: {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
        },
        ping0: ping0Data,
        sources: formattedSources,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'X-Client-IP': ip,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );

    return response;
  } catch (error) {
    console.error('IP信息获取失败:', error);
    return NextResponse.json(
      {
        error: '获取IP信息失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

// 添加 OPTIONS 请求处理，支持 CORS 预检请求
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
