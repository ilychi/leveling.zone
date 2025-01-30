/// <reference types="node" />
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

const streamPipeline = promisify(pipeline);

// 添加备用数据源
const FALLBACK_SOURCES = {
  'GeoLite2-ASN.mmdb': [
    'https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-ASN.mmdb',
  ],
  'GeoLite2-City.mmdb': [
    'https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-City.mmdb',
  ],
  'GeoLite2-Country.mmdb': [
    'https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-Country.mmdb',
  ],
};

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${attempt}/${maxRetries}] 正在从 ${url} 下载文件...`);
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
        timeout: 120000, // 增加超时时间到 120 秒
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // 确保目标目录存在
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`文件下载完成: ${outputPath}`);
          resolve();
        });
        writer.on('error', (error: Error) => {
          console.error(`文件写入错误: ${error.message}`);
          reject(error);
        });
        response.data.on('error', (error: Error) => {
          console.error(`数据流错误: ${error.message}`);
          reject(error);
        });
      });

      // 验证文件是否成功下载
      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        throw new Error('下载的文件大小为 0');
      }

      console.log(`文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      return;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`下载失败 (尝试 ${attempt}/${maxRetries}):`, lastError.message);

      if (attempt < maxRetries) {
        const delay = attempt * 10000; // 增加等待时间到 10 秒
        console.log(`等待 ${delay / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('下载失败');
}

async function tryFallbackSources(filename: string, outputPath: string): Promise<boolean> {
  const sources = FALLBACK_SOURCES[filename as keyof typeof FALLBACK_SOURCES];
  if (!sources) return false;

  for (const url of sources) {
    try {
      await downloadFile(url, outputPath);
      console.log(`使用备用源成功下载: ${url}`);
      return true;
    } catch (error: unknown) {
      console.error(
        `备用源下载失败: ${url}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return false;
}

async function getLatestRelease(): Promise<Release> {
  try {
    console.log('获取最新 Release 信息...');
    const response = await axios({
      method: 'get',
      url: 'https://api.github.com/repos/ilychi/leveling.zone/releases/latest',
      headers: {
        'User-Agent': 'Vercel-Build-Script',
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error: unknown) {
    console.error('获取 Release 信息失败:', error instanceof Error ? error.message : String(error));
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function downloadDatabases(): Promise<void> {
  try {
    const outputDir = path.join(process.cwd(), 'public', 'db');
    console.log('输出目录:', outputDir);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 首先尝试从 Release 下载
    try {
      const release = await getLatestRelease();
      console.log(`找到最新 Release: ${release.tag_name}`);

      for (const asset of release.assets) {
        const outputPath = path.join(outputDir, asset.name);
        try {
          await downloadFile(asset.browser_download_url, outputPath);
        } catch (error) {
          console.error(`从 Release 下载 ${asset.name} 失败，尝试备用源...`);
          await tryFallbackSources(asset.name, outputPath);
        }
      }
    } catch (error) {
      console.error('从 Release 下载失败，使用备用源...');

      // 使用备用源下载核心数据库
      for (const [filename, _] of Object.entries(FALLBACK_SOURCES)) {
        const outputPath = path.join(outputDir, filename);
        await tryFallbackSources(filename, outputPath);
      }
    }

    // 验证文件
    console.log('\n下载的文件列表：');
    const files = fs.readdirSync(outputDir);
    if (files.length === 0) {
      throw new Error('没有成功下载任何文件');
    }

    files.forEach((file: string) => {
      const stats = fs.statSync(path.join(outputDir, file));
      console.log(`${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    });

    // 复制到 data/db 目录
    const dataDir = path.join(process.cwd(), 'data', 'db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    files.forEach((file: string) => {
      const src = path.join(outputDir, file);
      const dest = path.join(dataDir, file);
      fs.copyFileSync(src, dest);
      console.log(`已复制到: ${dest}`);
    });
  } catch (error) {
    console.error('下载数据库时出错:', error);
    process.exit(1);
  }
}

// 如果直接运行脚本，则执行下载
if (require.main === module) {
  downloadDatabases()
    .then(() => {
      console.log('数据库下载完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('下载失败:', error);
      process.exit(1);
    });
}

export { downloadDatabases };
