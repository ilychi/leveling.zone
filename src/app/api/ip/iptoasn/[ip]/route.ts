import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import * as maxmind from 'maxmind';
import { parse } from 'csv-parse/sync';
import { cleanupObject, formatAsn, handleLocalhost } from '@/utils/ip';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

interface IPtoASNResponse {
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
}

async function getIpToAsnInfo(ip: string) {
  try {
    // 读取 IPtoASN 数据库
    const iptoasnReader = await maxmind.open(path.join(DB_DIR, 'iptoasn-asn-ipv4.mmdb'));
    const iptoasnData = iptoasnReader.get(ip) as IPtoASNResponse;

    if (!iptoasnData) return null;

    // 读取 ASN Info 数据库
    const asnInfoData = fs.readFileSync(path.join(DB_DIR, 'asn-info.csv'), 'utf-8');
    const records = parse(asnInfoData, {
      columns: true,
      skip_empty_lines: true,
    });

    // 查找匹配的 ASN 信息
    const asnInfo = records.find(
      (record: any) => parseInt(record.asn) === iptoasnData.autonomous_system_number
    );

    const result = {
      ip,
      network: {
        asn: formatAsn(iptoasnData.autonomous_system_number),
        organization: iptoasnData.autonomous_system_organization,
        handle: asnInfo?.handle,
        description: asnInfo?.description,
      },
    };

    cleanupObject(result);
    return result;
  } catch (error) {
    console.error('IPtoASN查询失败:', error);
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

    const data = await getIpToAsnInfo(ip);
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
