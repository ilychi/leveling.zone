import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import { IP2Location } from 'ip2location-nodejs';
import { cleanupObject, formatAsn, handleLocalhost, normalizeCoordinates } from '@/utils/ip';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

async function getIp2Info(ip: string) {
  try {
    // 初始化 IP2Location 数据库
    const ip2locationDb = new IP2Location();
    const ip2asnDb = new IP2Location();

    // 打开数据库文件
    ip2locationDb.open(path.join(DB_DIR, 'IP2LOCATION-LITE-DB11.mmdb'));
    ip2asnDb.open(path.join(DB_DIR, 'IP2LOCATION-LITE-ASN.mmdb'));

    // 查询数据
    const ip2locationData = ip2locationDb.getAll(ip) as any;
    const ip2asnData = ip2asnDb.getAll(ip) as any;

    if (!ip2locationData && !ip2asnData) return null;

    const coords = normalizeCoordinates(ip2locationData?.latitude, ip2locationData?.longitude);

    const result = {
      ip,
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
    };

    // 关闭数据库连接
    ip2locationDb.close();
    ip2asnDb.close();

    cleanupObject(result);
    return result;
  } catch (error) {
    console.error('IP2Location查询失败:', error);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { ip: string } }) {
  try {
    const ip = handleLocalhost(params.ip);
    if (!ip) {
      return NextResponse.json(
        { error: 'IP parameter is required' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const data = await getIp2Info(ip);
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('查询失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
