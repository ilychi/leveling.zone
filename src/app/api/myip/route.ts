import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { sources, clientIp } = await request.json();

    // 获取 Edge 位置信息
    const edge = {
      country: request.geo?.country || '-',
      region: request.geo?.region || '-',
      city: request.geo?.city || '-',
      latitude: request.geo?.latitude || '-',
      longitude: request.geo?.longitude || '-',
    };

    // 使用前端传来的 IP 作为主要 IP,优先使用 ipify、ipapi.co 和 ip-api.com 的结果
    const response = {
      ip: clientIp || sources?.ipify?.ip || sources?.ipapico?.ip || sources?.ipapicom?.ip || '-',
      edge,
      sources,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('处理请求失败:', error);
    return NextResponse.json({ error: '处理请求失败' }, { status: 500 });
  }
}

// OPTIONS 请求处理 CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
