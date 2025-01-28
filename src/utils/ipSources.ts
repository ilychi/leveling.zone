import { formatASN } from './network';

// 通用的超时请求函数
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

// 获取 Cloudflare 信息
export async function getCloudflareInfo() {
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
        country_code: metaData.country,
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

// 获取 useragentinfo 信息
export async function getUserAgentInfo() {
  try {
    const response = await fetchWithTimeout('https://ip.useragentinfo.com/json');
    if (!response.ok) return null;

    const data = await response.json();
    return {
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
  } catch (error) {
    console.error('useragentinfo查询失败:', error);
    return null;
  }
}

// 获取 qjqq 信息
export async function getQjqqInfo() {
  try {
    const response = await fetchWithTimeout('https://api.qjqq.cn/api/Local');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 200) return null;

    return {
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
  } catch (error) {
    console.error('qjqq查询失败:', error);
    return null;
  }
}

// 获取 identme 信息
export async function getIdentMeInfo() {
  try {
    const response = await fetchWithTimeout('https://v4.ident.me/json');
    if (!response.ok) return null;

    const data = await response.json();
    return {
      ip: data.ip,
      location: {
        country: data.country,
        country_code: data.cc,
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
  } catch (error) {
    console.error('ident.me查询失败:', error);
    return null;
  }
}

// 获取 ip.sb 信息
export async function getIpSbInfo() {
  try {
    const response = await fetchWithTimeout('https://api.ip.sb/geoip');
    if (!response.ok) return null;

    const data = await response.json();
    return {
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
  } catch (error) {
    console.error('ip.sb查询失败:', error);
    return null;
  }
}

// 获取 ipapi.is 数据源
export async function getIpapiIsInfo() {
  try {
    const response = await fetchWithTimeout('https://api.ipapi.is');
    if (!response.ok) return null;

    const data = await response.json();
    return {
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
  } catch (error) {
    console.error('ipapi.is查询失败:', error);
    return null;
  }
}

// 获取 ipapi.co 数据源
export async function getIpapiCoInfo() {
  try {
    const response = await fetchWithTimeout('https://ipapi.co/json/');
    if (!response.ok) return null;

    const data = await response.json();
    return {
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
  } catch (error) {
    console.error('ipapi.co查询失败:', error);
    return null;
  }
}

// 获取 ip-api.io 数据源
export async function getIpApiIoInfo() {
  try {
    const response = await fetchWithTimeout('https://ip-api.io/json');
    if (!response.ok) return null;

    const data = await response.json();
    return {
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
  } catch (error) {
    console.error('ip-api.io查询失败:', error);
    return null;
  }
}

// 获取 IPIP.NET 数据源
export async function getIpipInfo() {
  try {
    const response = await fetchWithTimeout('https://myip.ipip.net/json');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.ret !== 'ok') return null;

    return {
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
  } catch (error) {
    console.error('IPIP.NET查询失败:', error);
    return null;
  }
}

// 获取 ip.cn 数据源
export async function getIpCnInfo() {
  try {
    const response = await fetchWithTimeout('https://www.ip.cn/api/index?type=0');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.rs !== 1) return null;

    const addressParts = data.address.split(' ');
    const isp = addressParts.pop() || '-';
    const location = addressParts.filter(Boolean).join(' • ');

    return {
      ip: data.ip || '-',
      location: {
        country: location || '-',
      },
      network: {
        isp: isp,
      },
    };
  } catch (error) {
    console.error('ip.cn查询失败:', error);
    return null;
  }
}

// 获取 ip138.xyz 数据源
export async function getIp138Info() {
  try {
    const response = await fetchWithTimeout('https://ip138.xyz/json');
    if (!response.ok) return null;

    const data = await response.json();
    return {
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
  } catch (error) {
    console.error('ip138.xyz查询失败:', error);
    return null;
  }
}

// 获取 pconline 数据源
export async function getPconlineInfo() {
  try {
    const response = await fetchWithTimeout('https://whois.pconline.com.cn/ipJson.jsp?json=true', {
      headers: {
        'Accept-Charset': 'GB2312,utf-8;q=0.7,*;q=0.3',
      },
    });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('gb2312');
    const text = decoder.decode(buffer);
    const data = JSON.parse(text);
    return {
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
  } catch (error) {
    console.error('pconline查询失败:', error);
    return null;
  }
}

// 获取腾讯新闻API数据源
export async function getQQNewsInfo() {
  try {
    const response = await fetchWithTimeout('https://r.inews.qq.com/api/ip2city');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.ret !== 0) return null;

    return {
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
  } catch (error) {
    console.error('腾讯新闻API查询失败:', error);
    return null;
  }
}

// 获取百度企服API数据源
export async function getQifuInfo() {
  try {
    const response = await fetchWithTimeout(
      'https://qifu-api.baidubce.com/ip/local/geo/v1/district'
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 'Success') return null;

    return {
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
  } catch (error) {
    console.error('百度企服API查询失败:', error);
    return null;
  }
}

// 获取高德地图数据源
export async function getAmapInfo() {
  try {
    const response = await fetchWithTimeout(
      'https://restapi.amap.com/v3/ip?key=0113a13c88697dcea6a445584d535837'
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== '1') return null;

    return {
      ip: data.ip || '-',
      location: {
        province: data.province || '-',
        city: data.city || '-',
      },
    };
  } catch (error) {
    console.error('高德地图查询失败:', error);
    return null;
  }
}

// 获取 VORE-API 数据源
export async function getVoreInfo() {
  try {
    const response = await fetchWithTimeout('https://api.vore.top/api/IPdata');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 200) return null;

    return {
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
  } catch (error) {
    console.error('VORE-API查询失败:', error);
    return null;
  }
}

// 获取知了IP数据源
export async function getZhaleInfo() {
  try {
    const response = await fetchWithTimeout('https://ipv4cn.zhale.me/ip.php');
    if (!response.ok) return null;

    const data = await response.json();
    return {
      ip: data.ip || '-',
      location: {
        country: data.location.split(', ')[0],
        province: data.location.split(', ')[1],
      },
    };
  } catch (error) {
    console.error('知了IP查询失败:', error);
    return null;
  }
}

// 获取纯真IP数据源
export async function getZxincInfo() {
  try {
    const response = await fetchWithTimeout('https://v4.ip.zxinc.org/info.php?type=json');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 0) return null;

    const location = data.data.location?.replace(/–/g, ' • ') || '-';
    return {
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
  } catch (error) {
    console.error('纯真IP查询失败:', error);
    return null;
  }
}

// 获取 APIP.CC 数据源
export async function getApipCcInfo() {
  try {
    const response = await fetchWithTimeout('https://apip.cc/json');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'success') return null;

    return {
      ip: data.query || '-',
      location: {
        country: data.CountryName,
        country_code: data.CountryCode,
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
  } catch (error) {
    console.error('APIP.CC查询失败:', error);
    return null;
  }
}

// 获取 ipquery.io 数据源
export async function getIpQueryInfo() {
  try {
    const response = await fetchWithTimeout('https://api.ipquery.io/?format=json');
    if (!response.ok) return null;

    const data = await response.json();
    return {
      ip: data.ip || '-',
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
  } catch (error) {
    console.error('ipquery.io查询失败:', error);
    return null;
  }
}

// 获取所有数据源信息
export async function getAllSourcesInfo() {
  const sources: Record<string, any> = {};

  const promises = [
    getCloudflareInfo().then(data => data && (sources.cloudflare = data)),
    getUserAgentInfo().then(data => data && (sources.useragentinfo = data)),
    getQjqqInfo().then(data => data && (sources.qjqq = data)),
    getIdentMeInfo().then(data => data && (sources.identme = data)),
    getIpSbInfo().then(data => data && (sources.ipsb = data)),
    getIpapiIsInfo().then(data => data && (sources.ipapis = data)),
    getIpapiCoInfo().then(data => data && (sources.ipapico = data)),
    getIpApiIoInfo().then(data => data && (sources.ipapiio = data)),
    getIpipInfo().then(data => data && (sources.ipip = data)),
    getIpCnInfo().then(data => data && (sources.ipcn = data)),
    getIp138Info().then(data => data && (sources.ip138 = data)),
    getPconlineInfo().then(data => data && (sources.pconline = data)),
    getQQNewsInfo().then(data => data && (sources.qqnews = data)),
    getQifuInfo().then(data => data && (sources.qifu = data)),
    getAmapInfo().then(data => data && (sources.amap = data)),
    getVoreInfo().then(data => data && (sources.vore = data)),
    getZhaleInfo().then(data => data && (sources.zhale = data)),
    getZxincInfo().then(data => data && (sources.zxinc = data)),
    getApipCcInfo().then(data => data && (sources.apipcc = data)),
    getIpQueryInfo().then(data => data && (sources.ipquery = data)),
  ];

  await Promise.allSettled(promises);
  return sources;
}
