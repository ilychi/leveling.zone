import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { headers } from 'next/headers';
import { formatASN } from '@/utils/network';
import { getAllSourcesInfo } from '@/utils/ipSources';

// 从 Cloudflare 获取IP的函数
async function getIPFromCloudflare() {
  try {
    const response = await fetch('https://1.1.1.1/cdn-cgi/trace');
    if (!response.ok) return null;
    const text = await response.text();
    const data = Object.fromEntries(
      text
        .trim()
        .split('\n')
        .map(line => line.split('='))
    );
    return data.ip || null;
  } catch (error) {
    console.error('从Cloudflare获取IP失败:', error);
    return null;
  }
}

// 获取IP信息的函数
async function getIPInfo(ip: string) {
  const sources: Record<string, any> = {};

  // 并行请求所有数据源
  const promises = [
    // ip.cn
    fetch(`https://www.ip.cn/api/index?ip=${ip}&type=1`)
      .then(res => res.json())
      .then(data => ({ source: 'ipcn', response: data }))
      .catch(error => console.error('ip.cn查询失败:', error)),

    // pconline
    fetch(`https://whois.pconline.com.cn/ipJson.jsp?ip=${ip}&json=true`)
      .then(async res => {
        const buffer = await res.arrayBuffer();
        const decoder = new TextDecoder('gb2312');
        const text = decoder.decode(buffer);
        return { source: 'pconline', response: JSON.parse(text) };
      })
      .catch(error => console.error('pconline查询失败:', error)),

    // VORE API
    fetch(`https://api.vore.top/api/IPdata?ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'vore', response: data }))
      .catch(error => console.error('VORE API查询失败:', error)),

    // ip.sb
    fetch(`https://api.ip.sb/geoip/${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'ipsb', response: data }))
      .catch(error => console.error('ip.sb查询失败:', error)),

    // ip-api.com
    fetch(`http://ip-api.com/json/${ip}?fields=66846719&lang=zh-CN`)
      .then(res => res.json())
      .then(data => ({ source: 'ipapi', response: data }))
      .catch(error => console.error('ip-api.com查询失败:', error)),

    // ip-api.io
    fetch(`https://ip-api.io/json?ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'ipapiio', response: data }))
      .catch(error => console.error('ip-api.io查询失败:', error)),

    // ipapi.co
    fetch(`https://ipapi.co/${ip}/json/`)
      .then(res => res.json())
      .then(data => ({ source: 'ipapico', response: data }))
      .catch(error => console.error('ipapi.co查询失败:', error)),

    // ipapi.is
    fetch(`https://api.ipapi.is/?ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'ipapis', response: data }))
      .catch(error => console.error('ipapi.is查询失败:', error)),

    // qjqq.cn
    fetch(`https://api.qjqq.cn/api/district?ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'qjqq', response: data }))
      .catch(error => console.error('qjqq.cn查询失败:', error)),

    // freeipapi.com
    fetch(`https://freeipapi.com/api/json/${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'freeipapi', response: data }))
      .catch(error => console.error('freeipapi.com查询失败:', error)),

    // ip.zxinc.org
    fetch(`https://ip.zxinc.org/api.php?type=json&ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'zxinc', response: data }))
      .catch(error => console.error('ip.zxinc.org查询失败:', error)),

    // 百度企服
    fetch(`https://qifu-api.baidubce.com/ip/geo/v1/district?ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'qifu', response: data }))
      .catch(error => console.error('百度企服查询失败:', error)),

    // 高德地图
    fetch(`https://restapi.amap.com/v3/ip?key=0113a13c88697dcea6a445584d535837&ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'amap', response: data }))
      .catch(error => console.error('高德地图查询失败:', error)),

    // ipwho.is
    fetch(`https://ipwho.is/${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'ipwhois', response: data }))
      .catch(error => console.error('ipwho.is查询失败:', error)),

    // 百度开放数据
    fetch(`https://opendata.baidu.com/api.php?co=&resource_id=6006&oe=utf8&query=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'baidu', response: data }))
      .catch(error => console.error('百度开放数据查询失败:', error)),

    // ipinfo.io
    fetch(`https://ipinfo.io/widget/demo/${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'ipinfo', response: data }))
      .catch(error => console.error('ipinfo.io查询失败:', error)),

    // 爱奇艺
    fetch(`https://mesh.if.iqiyi.com/aid/ip/info?version=1.1.1&ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'iqiyi', response: data }))
      .catch(error => console.error('爱奇艺查询失败:', error)),

    // ip138.xyz
    fetch(`https://ip138.xyz/json?ip=${ip}`)
      .then(res => res.json())
      .then(data => ({ source: 'ip138', response: data }))
      .catch(error => console.error('ip138.xyz查询失败:', error)),
  ];

  // 等待所有请求完成
  const results = await Promise.allSettled(promises);

  // 处理结果
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      sources[result.value.source] = result.value.response;
    }
  });

  return sources;
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const headersList = headers();

  // 按优先级尝试从不同请求头获取IP
  let ip = (
    headersList.get('cf-connecting-ip') ||
    headersList.get('x-real-ip') ||
    headersList.get('x-forwarded-for')?.split(',')[0] ||
    request.ip ||
    null
  )?.trim();

  // 如果从请求头获取失败，使用 Cloudflare API
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    ip = await getIPFromCloudflare();
  }

  if (!ip) {
    return NextResponse.json({ error: '无法获取IP地址' }, { status: 400 });
  }

  try {
    // 获取所有数据源的信息
    const sources = await getIPInfo(ip);

    // 使用 JSON.stringify 的第三个参数实现格式化
    const formattedJson = JSON.stringify(
      {
        ip,
        sources,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );

    return new Response(formattedJson, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('IP信息获取失败:', error);
    return NextResponse.json({ error: '获取IP信息失败' }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  const headersList = headers();
  const ip = (
    headersList.get('cf-connecting-ip') ||
    headersList.get('x-real-ip') ||
    headersList.get('x-forwarded-for')?.split(',')[0] ||
    request.ip ||
    '127.0.0.1'
  ).trim();

  return new Response(null, {
    headers: {
      'x-real-ip': ip,
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
