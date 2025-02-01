import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import maxmind from 'maxmind';
import { parse } from 'csv-parse/sync';
import { IP2Location } from 'ip2location-nodejs';
import { IP2Proxy } from 'ip2proxy-nodejs';
import { cleanupObject } from '@/utils/cleanup';
import { handleLocalhost } from '@/utils/ip';
const IPDB = require('ipdb');

const DB_DIR = process.env.VERCEL ? '/tmp' : './data/db';

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

interface RouteParams {
  params: {
    ip: string;
  };
}

async function fetchEndpoint(ip: string, endpoint: string) {
  try {
    const response = await fetch(`http://localhost:3000/api/ip/${endpoint}/${ip}`);
    if (!response.ok) {
      console.error(`Error fetching ${endpoint}:`, await response.text());
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const ip = handleLocalhost(params.ip);
    if (!ip) {
      return NextResponse.json({ error: 'Invalid IP address' }, { status: 400 });
    }

    // 查询所有数据库
    const [geoipData, ip2Data, dbipData, iptoasnData, ipinfoData, qqwryData, geocnData] =
      await Promise.all([
        fetchEndpoint(ip, 'geoip'),
        fetchEndpoint(ip, 'ip2'),
        fetchEndpoint(ip, 'dbip'),
        fetchEndpoint(ip, 'iptoasn'),
        fetchEndpoint(ip, 'ipinfo'),
        fetchEndpoint(ip, 'qqwry'),
        fetchEndpoint(ip, 'geocn'),
      ]);

    // 检查是否是中国IP
    const isChinaIP = geoipData?.location?.country?.code === 'CN';

    // 构建响应数据
    const response = {
      ip,
      geoip: geoipData,
      ...(isChinaIP
        ? {
            qqwry: qqwryData,
            geocn: geocnData,
          }
        : {
            ip2: ip2Data,
            dbip: dbipData,
            iptoasn: iptoasnData,
            ipinfo: ipinfoData,
          }),
      meta: {
        timestamp: new Date().toISOString(),
        is_china_ip: isChinaIP,
        providers: isChinaIP
          ? ['geoip', 'qqwry', 'geocn']
          : ['geoip', 'ip2', 'dbip', 'iptoasn', 'ipinfo'],
      },
    };

    return new NextResponse(JSON.stringify(response, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('IP查询失败:', error);
    return NextResponse.json(
      {
        error: 'IP query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
