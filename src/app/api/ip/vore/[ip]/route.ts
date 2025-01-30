import { NextRequest, NextResponse } from 'next/server';

async function getVoreInfo(ip: string) {
  try {
    const response = await fetch(`https://api.vore.top/api/IPdata?ip=${ip}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 200) return null;

    return {
      ip,
      location: {
        country: data.ipdata.info1,
        region: data.ipdata.info2,
        city: data.ipdata.info3,
        countryCode: 'CN', // VORE API 主要面向中国用户
      },
      network: {
        isp: data.ipdata.isp,
      },
      meta: {
        source: 'vore',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('VORE API查询失败:', error);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { ip: string } }) {
  try {
    const ip = params.ip;
    if (!ip) {
      return NextResponse.json(
        { error: 'IP parameter is required' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const data = await getVoreInfo(ip);
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
