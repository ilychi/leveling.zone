import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import { cleanupObject, handleLocalhost } from '@/utils/ip';

const IPDB = require('ipdb');
const DB_DIR = path.join(process.cwd(), 'data', 'db');

interface QQWryResponse {
  code: number;
  data: {
    country_name: string;
    region_name: string;
    city_name: string;
    district_name: string;
    owner_domain: string;
    isp_domain: string;
    country_code: string;
    continent_code: string;
    ip: string;
    bitmask: number;
  };
}

async function getQQwryInfo(ip: string) {
  try {
    const buffer = fs.readFileSync(path.join(DB_DIR, 'qqwry.ipdb'));
    const ipdb = new IPDB(buffer);
    const qqwryData = ipdb.find(ip) as QQWryResponse;

    if (!qqwryData || qqwryData.code !== 0) return null;

    const result = {
      ip,
      location: {
        continent: qqwryData.data.continent_code,
        country: qqwryData.data.country_name,
        countryCode: qqwryData.data.country_code,
        region: qqwryData.data.region_name,
        city: qqwryData.data.city_name,
        district: qqwryData.data.district_name,
      },
      network: {
        isp: qqwryData.data.isp_domain,
        organization: qqwryData.data.owner_domain,
        bitmask: qqwryData.data.bitmask,
      },
      meta: {
        source: 'qqwry',
      },
    };

    cleanupObject(result);
    return result;
  } catch (error) {
    console.error('QQWry查询失败:', error);
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

    const data = await getQQwryInfo(ip);
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
