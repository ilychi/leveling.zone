import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { ip: string } }) {
  try {
    const ip = params.ip;
    return NextResponse.json({ ip });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
