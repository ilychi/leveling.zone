import { NextRequest, NextResponse } from 'next/server';
import { BlobStorage } from '@/utils/blob-storage';
import { DbLoader } from '@/utils/db-loader';

export async function GET(request: NextRequest) {
  try {
    const blobStorage = BlobStorage.getInstance();
    const dbLoader = DbLoader.getInstance();

    // 列出Blob存储中的文件
    let blobFiles: string[] = [];
    try {
      blobFiles = await blobStorage.listDbFiles();
    } catch (err) {
      console.warn('列出Blob存储中的文件失败:', err);
      // 继续执行，不因为Blob存储错误而中断整个请求
    }

    // 列出本地可用的数据库文件
    const localFiles = await dbLoader.listAvailableDbFiles();

    // 检查所需的关键文件是否存在
    const requiredFiles = [
      'GeoLite2-Country.mmdb',
      'GeoLite2-City.mmdb',
      'dbip-country-lite.mmdb',
      'IP2LOCATION-LITE-ASN.BIN',
    ];

    const fileStatus = await Promise.all(
      requiredFiles.map(async file => {
        const exists = await dbLoader.dbFileExists(file);
        let source = 'unknown';
        let size = 0;

        try {
          if (blobFiles.includes(file)) {
            source = 'blob';
          } else if (localFiles.includes(file)) {
            source = 'local';
          }

          if (exists) {
            size = await dbLoader.getDbFileSize(file);
          }
        } catch (err) {
          console.error(`检查文件 ${file} 状态时出错:`, err);
        }

        return {
          file,
          exists,
          source,
          size: size > 0 ? `${(size / (1024 * 1024)).toFixed(2)} MB` : 'N/A',
        };
      })
    );

    // 获取环境信息
    const env = {
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL ? 'true' : 'false',
      blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'set' : 'not set',
      workingDir: process.cwd(),
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: env,
      blobStorage: {
        available: blobFiles.length > 0,
        files: blobFiles,
        count: blobFiles.length,
      },
      localFiles: {
        available: localFiles.length > 0,
        files: localFiles,
        count: localFiles.length,
      },
      requiredFiles: fileStatus,
    });
  } catch (error) {
    console.error('获取数据库信息时出错:', error);
    return NextResponse.json(
      { error: '获取数据库信息失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
