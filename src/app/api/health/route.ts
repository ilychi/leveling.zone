import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // 在 Vercel 环境中使用 /tmp 目录
    const dbDir = process.env.VERCEL ? '/tmp/db' : path.join(process.cwd(), 'data', 'db');

    const publicDbDir = path.join(process.cwd(), 'public', 'db');

    // 确保目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 检查数据库文件是否存在
    const requiredFiles = [
      'qqwry.ipdb',
      'dbip-city-lite.mmdb',
      'IP2LOCATION-LITE-DB11.BIN',
      'GeoLite2-City.mmdb',
      'GeoLite2-ASN.mmdb',
    ];

    const missingFiles = requiredFiles.filter(file => {
      // 首先检查 /tmp 目录
      if (fs.existsSync(path.join(dbDir, file))) {
        return false;
      }
      // 然后检查 public 目录
      if (fs.existsSync(path.join(publicDbDir, file))) {
        // 如果文件在 public 目录中存在，复制到 /tmp
        try {
          fs.copyFileSync(path.join(publicDbDir, file), path.join(dbDir, file));
          return false;
        } catch (error) {
          console.error(`复制文件 ${file} 失败:`, error);
          return true;
        }
      }
      return true;
    });

    if (missingFiles.length > 0) {
      return NextResponse.json(
        {
          status: 'initializing',
          message: '数据库文件正在初始化中',
          missing_files: missingFiles,
          db_dir: dbDir,
          is_vercel: !!process.env.VERCEL,
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

    return NextResponse.json(
      {
        status: 'healthy',
        message: '服务正常运行',
        db_dir: dbDir,
        is_vercel: !!process.env.VERCEL,
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
        error: error instanceof Error ? error.message : '未知错误',
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
