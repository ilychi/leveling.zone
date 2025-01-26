import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// 从请求中获取客户端 IP
function getClientIP(request: NextRequest): string {
  // 1. 从请求头获取
  const headersList = headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');
  const cfConnectingIP = headersList.get('cf-connecting-ip');

  // 2. 从 Vercel Edge 获取
  const vercelIP = request.ip;

  // 3. 按优先级返回
  return (
    // Cloudflare 优先
    cfConnectingIP ||
    // x-real-ip 次之
    realIP ||
    // x-forwarded-for 取第一个
    forwardedFor?.split(',')[0].trim() ||
    // Vercel Edge IP
    vercelIP ||
    // 默认
    '0.0.0.0'
  );
}

export async function POST(request: NextRequest) {
  try {
    const { sources } = await request.json();

    // 获取客户端 IP
    const clientIp = getClientIP(request);

    // 获取 Edge 位置信息
    const edge = {
      country: request.geo?.country || '-',
      region: request.geo?.region || '-',
      city: request.geo?.city || '-',
      latitude: request.geo?.latitude || '-',
      longitude: request.geo?.longitude || '-',
    };

    // 使用 Edge 和请求头获取的 IP 作为主要 IP
    const response = {
      ip: clientIp,
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
