import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from '@/utils/ip';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    return NextResponse.json({
      ip,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting client IP:', error);
    return NextResponse.json({ error: 'Failed to get client IP' }, { status: 500 });
  }
}
