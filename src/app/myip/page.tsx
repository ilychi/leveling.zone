'use client';

import { useState, useEffect, Suspense } from 'react';
import { countryToFlag } from '@/utils/country';
import { LevelingLogo, LevelingLogoText } from '@/components/ui/logo';
import { Particles } from '@/components/ui/particles';
import { useTheme } from "next-themes";
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

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
}

function MyIPContent() {
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchIPInfo = async () => {
      try {
        const response = await fetch('/api/myip');
        if (!response.ok) {
          throw new Error('获取IP信息失败');
        }
        const data = await response.json();
        setIpInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIPInfo();
  }, []);

  if (isLoading) {
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
    <main className="flex flex-col min-h-screen antialiased relative overflow-hidden">
      <Particles 
        className="absolute inset-0 -z-10"
        quantity={80}
        staticity={50}
        ease={70}
        color={theme === "dark" ? "#ffffff" : "#000000"}
        size={0.4}
      />
      <section className="pb-6 relative z-10">
        <nav className="container relative z-50 h-24 select-none">
          <div className="container relative flex flex-wrap items-center justify-between h-24 px-0 mx-auto overflow-hidden font-medium border-b border-gray-200 md:overflow-visible sm:px-0">
            <div className="flex items-center justify-start h-full -ml-4">
              <a href="/" className="flex items-center py-4 text-xl font-extrabold text-gray-900 md:py-0">
                <div className="flex items-center justify-center w-8 h-8 text-white bg-gray-900 rounded-full">
                  <div className="w-6 h-6 icon-[entypo--code]"></div>
                </div>
                <div className="ml-2">
                  LEVELING<span className="text-indigo-600">.</span>ZONE
                </div>
              </a>
            </div>
            <div className="w-3/4 flex justify-end">
              <div className="flex items-center justify-end pt-4 md:items-center md:flex-row md:py-0">
                <a 
                  href="/" 
                  className="inline-flex items-center px-5 py-3 text-sm font-medium leading-4 text-white bg-gray-900 md:w-auto md:rounded-full hover:bg-gray-800 focus:outline-none md:focus:ring-2 focus:ring-0 focus:ring-offset-2 focus:ring-gray-800"
                >
                  返回首页
                </a>
              </div>
            </div>
          </div>
        </nav>
      </section>

      <section className="flex flex-1 relative z-10">
        <div className="container mx-auto md:w-10/12">
          <div className="flex justify-center items-center relative mb-6 flex-col">
            <h1 className="title text-gray-900 z-10 text-5xl md:text-7xl lg:text-9xl font-bold">
              你的 IP 地址
            </h1>
            <div className="pb-6 text-sm relative z-10">
              <div className="relative group">
                <InteractiveHoverButton
                  onClick={() => window.location.href = '/'}
                  text="查询其他IP"
                  className="bg-gray-900 text-white"
                />
              </div>
            </div>
          </div>

          {ipInfo && (
            <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32">
              <div className="text-center mb-8">
                <div className="text-4xl font-bold mb-4">{ipInfo.ip}</div>
                {ipInfo.location?.country_code && (
                  <div className="text-xl">
                    {countryToFlag(ipInfo.location.country_code)} {ipInfo.location.country}
                  </div>
                )}
              </div>

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
                        const sourceMap: { [key: string]: string } = {
                          // 中国数据源
                          'qifu': '🇨🇳 百度企服',
                          'meitu': '🇨🇳 美图IP',
                          'pconline': '🇨🇳 太平洋IP',
                          'ipip': '🇨🇳 IPIP.NET',
                          'vore': '🇨🇳 VORE-API',
                          'toutiao': '🇨🇳 今日头条',
                          'upyun': '🇨🇳 又拍云',
                          'visacn': '🇨🇳 Visa CN',
                          'tencentjsonp': '🇨🇳 腾讯',
                          'qqnews': '🇨🇳 腾讯新闻',
                          'zhale': '🇨🇳 ZHALE.ME',
                          'zxinc': '🇨🇳 ZXINC',
                          'amap': '🇨🇳 高德地图',
                          'meituan': '🇨🇳 Honeypot',
                          // 国际数据源
                          'cloudflare': '☁️ Cloudflare',
                          'cloudflareipv4': '🌏 Cloudflare IPv4',
                          'identme': '🌐 ident.me',
                          'useragentinfo': '🔍 UserAgent.info',
                          'httpbin': '🌍 httpbin.org',
                          'ipsb': '🌐 IP.SB',
                          'ipapis': '🔎 IPAPI.is',
                          'ipapico': '🌍 ipapi.co',
                          'realip': '🌏 RealIP.cc',
                          'iplark': '🦅 IPLark',
                          'ipquery': '🌏 ipquery.io',
                          'apipcc': '🌍 APIP.CC',
                          'ip138': '🌐 IP138.xyz',
                          'ping0': '🌐 Ping0.cc',
                          'leak': '🔍 地址泄露检测',
                          'vercelip': '🌏 Vercel',
                          'apnic': '🌏 APNIC',
                          'discord': '🌏 Discord',
                          'claude': '🌏 Claude',
                          'chatgpt': '🌏 ChatGPT',
                          'surfshark': '🌏 Surfshark',
                          'netlify': '🌏 Netlify'
                        };
                        
                        const nameA = sourceMap[sourceA] || sourceA;
                        const nameB = sourceMap[sourceB] || sourceB;
                        
                        // 如果都是中国数据源或都不是中国数据源，按原始顺序排序
                        const isChineseA = nameA.includes('🇨🇳');
                        const isChineseB = nameB.includes('🇨🇳');
                        
                        if (isChineseA && !isChineseB) return -1;
                        if (!isChineseA && isChineseB) return 1;
                        return 0;
                      })
                      .map(([source, data]: [string, any]) => {
                        const getSourceName = (source: string) => {
                          const sourceMap: { [key: string]: string } = {
                            // 中国数据源
                            'qifu': '🇨🇳 百度企服',
                            'meitu': '🇨🇳 美图IP',
                            'pconline': '🇨🇳 太平洋IP',
                            'ipip': '🇨🇳 IPIP.NET',
                            'vore': '🇨🇳 VORE-API',
                            'toutiao': '🇨🇳 今日头条',
                            'upyun': '🇨🇳 又拍云',
                            'visacn': '🇨🇳 Visa CN',
                            'tencentjsonp': '🇨🇳 腾讯',
                            'qqnews': '🇨🇳 腾讯新闻',
                            'zhale': '🇨🇳 ZHALE.ME',
                            'zxinc': '🇨🇳 ZXINC',
                            'amap': '🇨🇳 高德地图',
                            'meituan': '🇨🇳 Honeypot',
                            // 国际数据源
                            'cloudflare': '☁️ Cloudflare',
                            'cloudflareipv4': '🌏 Cloudflare IPv4',
                            'identme': '🌐 ident.me',
                            'useragentinfo': '🔍 UserAgent.info',
                            'httpbin': '🌍 httpbin.org',
                            'ipsb': '🌐 IP.SB',
                            'ipapis': '🔎 IPAPI.is',
                            'ipapico': '🌍 ipapi.co',
                            'realip': '🌏 RealIP.cc',
                            'iplark': '🦅 IPLark',
                            'ipquery': '🌏 ipquery.io',
                            'apipcc': '🌍 APIP.CC',
                            'ip138': '🌐 IP138.xyz',
                            'ping0': '🌐 Ping0.cc',
                            'leak': '🔍 地址泄露检测',
                            'vercelip': '🌏 Vercel',
                            'apnic': '🌏 APNIC',
                            'discord': '🌏 Discord',
                            'claude': '🌏 Claude',
                            'chatgpt': '🌏 ChatGPT',
                            'surfshark': '🌏 Surfshark',
                            'netlify': '🌏 Netlify'
                          };
                          return sourceMap[source] || source;
                        };

                        const getSourceData = (data: any) => {
                          // 优先使用API返回的IP信息，如果没有则显示'-'
                          const ip = data.ip && data.ip !== '::1' ? data.ip : '-';
                          
                          const network = data.network?.asn ? 
                            `AS${data.network.asn}${data.network.organization ? ` | ${data.network.organization}` : ''}${data.network.isp ? ` | ${data.network.isp}` : ''}` : 
                            (data.network?.isp || '-');
                          
                          const location = data.location ? [
                            data.location.country,
                            data.location.province || data.location.region,
                            data.location.city,
                            data.location.district,
                            data.location.area_name,
                            data.location.detail
                          ].filter(item => Boolean(item) && item !== '-').join(' • ') : '-';

                          // 提取国家代码
                          const countryCode = data.location?.country_code || '';

                          return {
                            ip,
                            network,
                            location,
                            countryCode
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
                              {sourceData.countryCode && sourceData.countryCode.length === 2 ? (
                                <>
                                  {countryToFlag(sourceData.countryCode)} {sourceData.countryCode}{' '}
                                </>
                              ) : sourceData.countryCode ? (
                                <>{sourceData.countryCode} </>
                              ) : null}
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

      <section className="mt-20 border-t border-gray-200">
        <div className="container mx-auto flex flex-col items-center sm:flex-row sm:items-start gap-8 py-10">
          <div className="flex flex-col items-center sm:items-start py-1">
            <a href="/" className="text-xl font-black leading-none text-gray-900 select-none">
              <LevelingLogoText />
            </a>
            <a className="mt-4 text-sm text-gray-500 block" href="https://leveling.zone" target="_blank">
              &copy; 2025 Web is Cool, Web is Best.
            </a>
          </div>
          
          <div className="flex-1 sm:px-2 md:px-10 lg:px-20 xl:px-36 text-center sm:text-left">
            <h3 className="text-lg font-bold text-gray-900 mb-4 hidden sm:block">Products</h3>
            <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
              <a href="https://tempmail.best" className="text-xs lg:text-sm leading-6 text-gray-500 hover:text-gray-900" title="TempMail.Best">TempMail.Best</a>
              <a href="https://sink.cool" className="text-xs lg:text-sm leading-6 text-gray-500 hover:text-gray-900" title="Sink.Cool">Sink.Cool</a>
              <a href="https://dns.surf" className="text-xs lg:text-sm leading-6 text-gray-500 hover:text-gray-900" title="DNS.Surf">DNS.Surf</a>
              <a href="https://loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo.ong" className="text-xs lg:text-sm leading-6 text-gray-500 hover:text-gray-900" title="L(O*62).ONG">L(O*62).ONG</a>
              <a href="https://beauty.codes" className="text-xs lg:text-sm leading-6 text-gray-500 hover:text-gray-900" title="Beauty.Codes">Beauty.Codes</a>
              <a href="https://awesome-homelab.com" className="text-xs lg:text-sm leading-6 text-gray-500 hover:text-gray-900" title="Awesome Homelab">Awesome Homelab</a>
            </div>
          </div>
          
          <div className="inline-flex justify-center gap-5 mt-4 sm:ml-auto sm:mt-0 sm:grid sm:gap-y-1 sm:grid-cols-3">
            <a href="mailto:leveling.zone@miantiao.me" title="Email" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Email</span>
              <span className="w-6 h-6 icon-[mdi--email]"></span>
            </a>
            <a href="https://t.me/levelingzone" target="_blank" title="Telegram" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Telegram</span>
              <span className="w-6 h-6 icon-[mdi--telegram]"></span>
            </a>
            <a href="https://mt.ci/" target="_blank" title="Blog" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Blog</span>
              <span className="w-6 h-6 icon-[mdi--blogger]"></span>
            </a>
            <a href="https://404.li/x" target="_blank" title="Twitter" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Twitter</span>
              <span className="w-6 h-6 icon-[mdi--twitter]"></span>
            </a>
            <a href="https://c.im/@mt" target="_blank" title="Mastodon" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Mastodon</span>
              <span className="w-6 h-6 icon-[mdi--mastodon]"></span>
            </a>
            <a href="https://github.com/ccbikai" target="_blank" title="GitHub" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">GitHub</span>
              <span className="w-10 h-10 icon-[mdi--github]"></span>
            </a>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto">
          {/* 额外的底部空间 */}
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
