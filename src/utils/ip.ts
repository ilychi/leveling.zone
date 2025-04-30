import { NextRequest } from 'next/server';

export function isValidIpAddress(ipAddress: string): boolean {
  // IPv4验证
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ipAddress)) {
    const parts = ipAddress.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6验证
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$/;
  return ipv6Regex.test(ipAddress);
}

export function handleLocalhost(ip: string): string {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return '8.8.8.8'; // 使用Google DNS作为本地测试IP
  }
  return ip;
}

export function cleanupObject(obj: any): void {
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      cleanupObject(obj[key]);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    }
  }
}

export function getCountryFlag(country: string): string {
  const countryFlags: Record<string, string> = {
    China: '🇨🇳',
    'Hong Kong': '🇭🇰',
    Taiwan: '🇹🇼',
    'United States': '🇺🇸',
    Japan: '🇯🇵',
    'South Korea': '🇰🇷',
    Singapore: '🇸🇬',
    Russia: '🇷🇺',
    Germany: '🇩🇪',
    France: '🇫🇷',
    'United Kingdom': '🇬🇧',
    Canada: '🇨🇦',
    Australia: '🇦🇺',
    Brazil: '🇧🇷',
    India: '🇮🇳',
  };

  return countryFlags[country] || '🌐';
}

export function getClientIP(request: NextRequest): string {
  let ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    '127.0.0.1';

  // 处理本地开发环境
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    // 使用一个公共 IP 作为测试用途
    return '8.8.8.8';
  }

  return ip;
}

// 格式化 ASN 号码
export function formatAsn(asn: string | number | undefined): string | undefined {
  if (!asn) return undefined;
  const asnStr = asn.toString();
  return asnStr.startsWith('AS') ? asnStr : `AS${asnStr}`;
}

// 标准化坐标
export function normalizeCoordinates(
  lat?: number,
  lon?: number
): { latitude?: number; longitude?: number } {
  if (!lat || !lon) return {};
  return {
    latitude: parseFloat(lat.toFixed(4)),
    longitude: parseFloat(lon.toFixed(4)),
  };
}
