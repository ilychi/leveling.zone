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
const TIMEOUT = 30000; // 30 秒超时
const RETRY_DELAY = 5000; // 5 秒重试延迟

// 定义目标目录
const TARGET_DIRS = [
  path.join(process.cwd(), 'public', 'db'),
  path.join(process.cwd(), 'data', 'db'),
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFileWithRetry(
  url: string,
  outputPaths: string[],
  retries = MAX_RETRIES
): Promise<void> {
  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Vercel-Build-Script',
      },
    });

    // 并行写入所有目标路径
    await Promise.all(
      outputPaths.map(outputPath => streamPipeline(response.data, fs.createWriteStream(outputPath)))
    );
  } catch (error) {
    if (retries > 0) {
      console.log(`下载失败，${retries} 次重试剩余，等待 ${RETRY_DELAY / 1000} 秒后重试...`);
      await sleep(RETRY_DELAY);
      return downloadFileWithRetry(url, outputPaths, retries - 1);
    }
    throw error;
  }
}

async function getLatestRelease(): Promise<Release> {
  const response = await axios({
    method: 'get',
    url: 'https://api.github.com/repos/ilychi/leveling.zone/releases/latest',
    headers: {
      'User-Agent': 'Vercel-Build-Script',
    },
  });

  return response.data;
}

async function downloadDatabases(): Promise<void> {
  try {
    console.log('获取最新 Release 信息...');
    const release = await getLatestRelease();
    console.log(`找到最新 Release: ${release.tag_name}`);

    // 确保所有目标目录存在
    TARGET_DIRS.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    console.log('开始下载数据库文件...');
    const downloadPromises = release.assets.map(async (asset: ReleaseAsset) => {
      const outputPaths = TARGET_DIRS.map(dir => path.join(dir, asset.name));
      console.log(`下载 ${asset.name}...`);
      try {
        await downloadFileWithRetry(asset.browser_download_url, outputPaths);
        console.log(`${asset.name} 下载完成，已保存到以下位置：`);
        outputPaths.forEach(path => console.log(`- ${path}`));
      } catch (error) {
        console.error(`下载 ${asset.name} 失败:`, error);
        throw error;
      }
    });

    await Promise.all(downloadPromises);
    console.log('所有数据库文件下载完成');

    // 列出下载的文件
    console.log('\n下载的文件列表：');
    TARGET_DIRS.forEach(dir => {
      console.log(`\n${dir} 目录：`);
      const files = fs.readdirSync(dir);
      files.forEach((file: string) => {
        const stats = fs.statSync(path.join(dir, file));
        console.log(`${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      });
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
      console.error('下载数据库时出错:', error);
      process.exit(1);
    });
}

export { downloadDatabases };
