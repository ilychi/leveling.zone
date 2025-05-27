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

const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30秒超时
const RETRY_DELAY = 5000; // 5秒重试延迟
const GITHUB_REPO = 'lucking7/leveling.zone';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// 定义本地数据库目录
const DB_DIRS = [path.join(process.cwd(), 'data', 'db'), path.join(process.cwd(), 'public', 'db')];

// 必要的数据库文件列表
const REQUIRED_FILES = [
  // MaxMind 数据库
  'GeoLite2-ASN.mmdb',
  'GeoLite2-City.mmdb',
  'GeoLite2-Country.mmdb',
  // DB-IP 数据库
  'dbip-asn-lite.mmdb',
  'dbip-city-lite.mmdb',
  'dbip-country-lite.mmdb',
  // IP2Location 数据库
  'IP2LOCATION-LITE-ASN.BIN',
  'IP2LOCATION-LITE-DB11.BIN',
  'IP2LOCATION-LITE-PX11.BIN',
  // IPinfo 数据库
  'ipinfo-country_asn.mmdb',
  // 其他数据库
  'qqwry.ipdb',
  'iptoasn-asn.csv',
  'as-info.csv',
  'geocn.mmdb',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFileWithRetry(
  url: string,
  outputPath: string,
  retries = MAX_RETRIES
): Promise<void> {
  try {
    console.log(`下载 ${path.basename(outputPath)}...`);
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Local-Deployment-Script',
      },
    });

    // 写入到文件
    await streamPipeline(response.data, fs.createWriteStream(outputPath));
    console.log(`下载完成: ${path.basename(outputPath)}`);
  } catch (error) {
    if (retries > 0) {
      console.log(`下载失败，${retries} 次重试剩余，等待 ${RETRY_DELAY / 1000} 秒后重试...`);
      await sleep(RETRY_DELAY);
      return downloadFileWithRetry(url, outputPath, retries - 1);
    }
    console.error('下载失败:', error);
    throw error;
  }
}

// 确保目录存在
function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    console.log(`创建目录: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function getLatestRelease(): Promise<Release> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Local-Deployment-Script',
    };

    // 如果有 token 就添加认证头
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    console.log(`获取 ${GITHUB_REPO} 的最新 Release 信息...`);
    const response = await axios({
      method: 'get',
      url: GITHUB_API,
      headers,
    });

    return response.data;
  } catch (error) {
    console.error('获取 Release 信息失败:', error);
    throw error;
  }
}

async function downloadReleaseDatabases(): Promise<void> {
  try {
    // 获取最新 Release
    const release = await getLatestRelease();
    console.log(`找到最新 Release: ${release.tag_name}`);

    // 确定使用哪个数据库目录
    let dbDir = DB_DIRS[0]; // 默认使用第一个
    for (const dir of DB_DIRS) {
      ensureDirectoryExists(dir);
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        dbDir = dir;
        break;
      }
    }
    console.log(`使用数据库目录: ${dbDir}`);

    // 获取 Release 中的资源
    const assets = release.assets || [];

    if (assets.length === 0) {
      console.error('Release 中没有找到任何资源!');
      return;
    }

    console.log(`找到 ${assets.length} 个资源文件`);

    // 创建下载任务
    const downloadPromises: Promise<void>[] = [];

    // 遍历所需文件
    for (const dbFile of REQUIRED_FILES) {
      // 在 Release 资源中查找对应文件
      const asset = assets.find((a: any) => a.name === dbFile);

      if (!asset) {
        console.warn(`未找到数据库文件: ${dbFile}`);
        continue;
      }

      const outputPath = path.join(dbDir, dbFile);

      // 如果已经存在，检查是否需要更新
      if (fs.existsSync(outputPath)) {
        const localStats = fs.statSync(outputPath);
        if (localStats.size === asset.size) {
          console.log(`跳过下载 ${dbFile}: 本地文件大小相同，可能已是最新版本`);
          continue;
        }
      }

      // 添加下载任务
      downloadPromises.push(downloadFileWithRetry(asset.browser_download_url, outputPath));
    }

    // 执行所有下载任务
    if (downloadPromises.length > 0) {
      console.log(`开始下载 ${downloadPromises.length} 个数据库文件...`);
      await Promise.all(downloadPromises);
      console.log('所有数据库文件下载完成!');
    } else {
      console.log('没有需要下载的数据库文件，所有文件已是最新版本。');
    }

    // 创建标记文件表示完成
    fs.writeFileSync(path.join(dbDir, '.db-downloaded'), new Date().toISOString());
  } catch (error) {
    console.error('下载数据库文件时出错:', error);
    process.exit(1);
  }
}

// 主函数
async function main() {
  console.log('开始从 GitHub Release 下载 IP 数据库文件');
  await downloadReleaseDatabases();
}

// 执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export { downloadReleaseDatabases };
