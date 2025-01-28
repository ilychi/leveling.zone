import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as maxmind from 'maxmind';
import { cleanupObject, handleLocalhost } from '@/utils/ip';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

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

async function getGeoCNInfo(ip: string) {
  try {
    const geocnReader = await maxmind.open(path.join(DB_DIR, 'geocn.mmdb'));
    const geocnData = geocnReader.get(ip) as GeoCNResponse;

    if (!geocnData) return null;

    const result = {
      ip,
      location: {
        country: '中国',
        province: geocnData.province,
        city: geocnData.city,
        district: geocnData.districts,
        provinceCode: geocnData.provinceCode,
        cityCode: geocnData.cityCode,
        districtCode: geocnData.districtsCode,
      },
      network: {
        isp: geocnData.isp,
        type: geocnData.net,
      },
    };

    cleanupObject(result);
    return result;
  } catch (error) {
    console.error('GeoCN查询失败:', error);
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

    const data = await getGeoCNInfo(ip);
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
