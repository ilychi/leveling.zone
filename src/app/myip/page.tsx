'use client';

import { useState, useEffect, Suspense } from 'react';
import { countryToFlag } from '@/utils/country';
import { formatNetworkInfo } from '@/utils/network';
import { getAllSourcesInfo } from '@/utils/ipSources';

interface IPInfo {
  ip: string;
  location?: {
    country?: string;
    country_code?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    area_name?: string;
    detail?: string;
  };
  network?: {
    asn?: string;
    org?: string;
    isp?: string;
  };
  sources?: {
    [key: string]: any;
  };
  edge?: {
    country: string;
    region: string;
    city: string;
    latitude: string;
    longitude: string;
  };
  timestamp?: string;
}

interface SourceConfig {
  name: string;
  order: number;
}

function MyIPContent() {
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 数据源配置（包含显示名称和排序）
  const sourceConfig: Record<string, SourceConfig> = {
    // 中国数据源
    'qifu': { name: '🇨🇳 百度企服', order: 0 },
    'amap': { name: '🇨🇳 高德地图', order: 1 },
    'ipcn': { name: '🇨🇳 IP.CN', order: 2 },
    'ipip': { name: '🇨🇳 IPIP.NET', order: 3 },
    'qjqq': { name: '🇨🇳 青桔API', order: 4 },
    'pconline': { name: '🇨🇳 太平洋IP', order: 5 },
    'qqnews': { name: '🇨🇳 腾讯新闻', order: 6 },
    'useragentinfo': { name: '🇨🇳 UA.info', order: 7 },
    'vore': { name: '🇨🇳 VORE-API', order: 8 },
    'upyun': { name: '🇨🇳 又拍云', order: 9 },
    'zhale': { name: '🇨🇳 ZHALE.ME', order: 10 },
    'zxinc': { name: '🇨🇳 ZXINC', order: 11 },
    // 国际数据源
    'apipcc': { name: '🌍 apip.cc', order: 12 },
    'cloudflare': { name: '☁️ Cloudflare', order: 13 },
    'identme': { name: '🌐 ident.me', order: 14 },
    'ipapiio': { name: '🌐 IP-API.io', order: 15 },
    'ipsb': { name: '🌐 IP.SB', order: 16 },
    'ip138': { name: '🌐 ip138.xyz', order: 17 },
    'ipapico': { name: '🌍 ipapi.co', order: 18 },
    'ipapis': { name: '🔎 ipapi.is', order: 19 },
    'ipquery': { name: '🌏 ipquery.io', order: 20 },
    'ipapicom': { name: '🌐 ip-api.com', order: 21 }
  };

  const getSourceName = (source: string) => {
    return sourceConfig[source]?.name || source;
  };

  // 从请求头获取IP的函数
  const getIPFromHeaders = async () => {
    try {
      const response = await fetch('/api/myip', {
        method: 'HEAD',
      });
      // 按优先级尝试不同的请求头
      return (
        response.headers.get('x-real-ip') ||
        response.headers.get('x-forwarded-for')?.split(',')[0] ||
        response.headers.get('cf-connecting-ip') ||
        null
      );
    } catch (error) {
      console.error('从请求头获取IP失败:', error);
      return null;
    }
  };

  // 从 Cloudflare 获取IP的函数
  const getIPFromCloudflare = async () => {
    try {
      const response = await fetch('https://1.1.1.1/cdn-cgi/trace');
      if (!response.ok) return null;
      const text = await response.text();
      const data = Object.fromEntries(
        text.trim().split('\n').map(line => line.split('='))
      );
      return data.ip || null;
    } catch (error) {
      console.error('从Cloudflare获取IP失败:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchIPInfo = async () => {
      try {
        // 优先从请求头获取IP
        let clientIp = await getIPFromHeaders();
        
        // 如果请求头获取失败，尝试使用 Cloudflare API
        if (!clientIp) {
          clientIp = await getIPFromCloudflare();
        }

        // 从前端直接获取所有数据源信息
        const sourcesData = await getAllSourcesInfo();
        
        // 获取 Edge 位置信息（如果在 Edge runtime 环境中）
        const edge = {
          country: '-',
          region: '-',
          city: '-',
          latitude: '-',
          longitude: '-',
        };

        setIpInfo({
          ip: clientIp || '未知',
          edge,
          sources: sourcesData,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchIPInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen">
      <section className="pb-6">
        <nav className="container relative z-50 h-24 select-none">
          <div className="container relative flex flex-wrap items-center justify-center h-24 px-8 mx-auto overflow-hidden font-medium border-b border-gray-200 md:overflow-visible lg:justify-center sm:px-4">
            <div className="flex items-center justify-center w-full h-full">
              <a href="/" className="flex items-center py-4 space-x-2 font-extrabold text-gray-900 md:py-0">
                <span className="flex items-center justify-center w-8 h-8">
                  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="40" height="40" rx="20" fill="#18181B"/>
                    <path d="M20 10L30 30H10L20 10Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="text-xl">
                  LEVELING
                  <span className="text-indigo-600">.</span>
                  ZONE
                </span>
              </a>
            </div>
          </div>
        </nav>
      </section>

      <section className="flex flex-1">
        <div className="container mx-auto md:w-10/12">
          <div className="flex justify-center items-center relative bg-white bg-dot-black/[0.2] mb-6 flex-col">
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            {ipInfo && (
              <div className="text-center">
                <div className="py-12 font-sans text-2xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
                  <span className="font-mono">{ipInfo.ip}</span>
                </div>
                <a className="pb-6 text-sm" href={`/ip/query/?ip=${ipInfo.ip}`}>
                  <div className="relative group">
                    <span className="px-3 py-1 text-xs rounded-full cursor-pointer text-neutral-500 bg-neutral-100">
                      此 IP 是你访问本站的 IP
                    </span>
                  </div>
                </a>
              </div>
            )}
          </div>

          {ipInfo && (
            <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32">
              <div className="w-full overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="py-3 pr-4 font-medium text-sm text-gray-500 w-[180px]">数据源</th>
                      <th className="py-3 px-4 font-medium text-sm text-gray-500 w-[140px]">IP</th>
                      <th className="py-3 px-4 font-medium text-sm text-gray-500 w-[250px]">运营商</th>
                      <th className="py-3 pl-4 font-medium text-sm text-gray-500">地址</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipInfo.sources && Object.entries(ipInfo.sources)
                      .sort(([sourceA], [sourceB]) => {
                        const orderA = sourceConfig[sourceA]?.order ?? 999;
                        const orderB = sourceConfig[sourceB]?.order ?? 999;
                        return orderA - orderB;
                      })
                      .map(([source, data]: [string, any]) => {
                        const getSourceData = (data: any) => {
                          const ip = data.ip && data.ip !== '::1' ? data.ip : '-';
                          
                          // 处理网络信息
                          const networkInfo = {
                            asn: data.network?.asn,
                            organization: data.network?.organization || data.network?.isp || data.network?.type,
                            name: data.network?.name
                          };

                          // 处理中国运营商显示
                          let network = '';
                          if (data.location?.country === '中国' && data.network?.isp) {
                            // 提取纯运营商名称（去掉地区信息）
                            network = data.network.isp.match(/(电信|联通|移动|铁通|广电|教育网)/)?.[0] || data.network.isp;
                          } else {
                            // 使用工具函数格式化网络信息
                            const formattedNetwork = formatNetworkInfo(networkInfo);
                            network = formattedNetwork.asn || formattedNetwork.organization || '-';
                          }
                          
                          const location = data.location ? [
                            data.location.country,
                            data.location.province || data.location.region,
                            data.location.city,
                            data.location.district,
                            data.location.area_name,
                            data.location.detail
                          ].filter(Boolean).join(' • ') : '-';

                          return {
                            ip,
                            network,
                            location,
                            countryCode: data.location?.country_code
                          };
                        };

                        const sourceData = getSourceData(data);

                        return (
                          <tr key={source} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="py-3 pr-4 text-sm text-gray-500">{getSourceName(source)}</td>
                            <td className="py-3 px-4 text-sm">
                              <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-500">
                                {sourceData.ip}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {sourceData.network}
                            </td>
                            <td className="py-3 pl-4 text-sm text-gray-900">
                              {sourceData.countryCode && !getSourceName(source).includes('🇨🇳') && countryToFlag(sourceData.countryCode)}{' '}
                              {sourceData.location}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="text-gray-700 md:pt-6">
        <div className="footer-container">
          <div className="flex flex-col items-center sm:items-start py-1">
            <a href="/" className="text-xl font-black leading-none text-gray-900 select-none logo">
              LEVELING
              <span className="text-indigo-600">.</span>
              ZONE
            </a>
            <a className="mt-4 text-sm text-gray-500 block" href="https://leveling.zone" target="_blank">
              &copy; 2025 Web is Cool, Web is Best.
            </a>
          </div>
          <div className="flex-1 sm:px-2 md:px-10 lg:px-20 xl:px-36 text-center sm:text-left">
            <div className="text-lg font-bold text-gray-900 mb-4 hidden sm:block">Products</div>
            <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
              <a href="https://sink.cool" className="footer-link">Sink.Cool</a>
              <a href="https://dns.surf" className="footer-link">DNS.Surf</a>
              <a href="https://loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo.ong" className="footer-link">L(O*62).ONG</a>
              <a href="https://beauty.codes" className="footer-link">Beauty.Codes</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function MyIP() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyIPContent />
    </Suspense>
  );
} 
