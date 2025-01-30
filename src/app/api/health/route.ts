import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // 检查数据库文件是否存在
    const dbDir = path.join(process.cwd(), 'data', 'db');
    const requiredFiles = ['qqwry.ipdb', 'dbip-city-lite.mmdb', 'IP2LOCATION-LITE-DB11.BIN'];

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(dbDir, file))) {
        throw new Error(`Missing database file: ${file}`);
      }
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
