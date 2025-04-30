/// <reference types="node" />
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { BlobStorage } from '../utils/blob-storage';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

// 创建Blob存储实例
const blobStorage = BlobStorage.getInstance();

const streamPipeline = promisify(pipeline);

const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30 秒超时
const RETRY_DELAY = 5000; // 5 秒重试延迟

// 定义本地临时目录
const TEMP_DIR = path.join(process.cwd(), 'tmp');

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
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Vercel-Build-Script',
      },
    });

    // 写入到临时文件
    await streamPipeline(response.data, fs.createWriteStream(outputPath));
  } catch (error) {
    if (retries > 0) {
      console.log(`下载失败，${retries} 次重试剩余，等待 ${RETRY_DELAY / 1000} 秒后重试...`);
      await sleep(RETRY_DELAY);
      return downloadFileWithRetry(url, outputPath, retries - 1);
    }
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
  const headers: Record<string, string> = {
    'User-Agent': 'Vercel-Build-Script',
  };

  // 如果有 token 就添加认证头
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios({
    method: 'get',
    url: 'https://api.github.com/repos/ilychi/leveling.zone/releases/latest',
    headers,
  });

  return response.data;
}

export async function downloadReleaseDb(): Promise<void> {
  try {
    console.log('获取最新 Release 信息...');
    const release = await getLatestRelease();
    console.log(`找到最新 Release: ${release.tag_name}`);

    // 确保临时目录存在
    ensureDirectoryExists(TEMP_DIR);

    // 检查是否已经上传到Blob
    console.log('检查Blob存储中的文件...');
    const existingFiles = await blobStorage.listDbFiles();
    console.log(`Blob存储中已有 ${existingFiles.length} 个文件: ${existingFiles.join(', ')}`);

    console.log('开始处理数据库文件...');
    console.log(`环境信息: NODE_ENV=${process.env.NODE_ENV}, VERCEL=${process.env.VERCEL}`);
    console.log(`当前工作目录: ${process.cwd()}`);

    // 打印可下载的文件列表
    console.log(`可下载的文件列表: ${release.assets.map(asset => asset.name).join(', ')}`);

    // 过滤需要的文件
    const filteredAssets = release.assets.filter(asset => REQUIRED_FILES.includes(asset.name));

    console.log(`将处理以下文件: ${filteredAssets.map(asset => asset.name).join(', ')}`);

    // 处理每个文件
    for (const asset of filteredAssets) {
      console.log(`处理 ${asset.name}...`);

      // 检查Blob中是否已存在
      const exists = await blobStorage.fileExists(asset.name);

      if (exists) {
        console.log(`${asset.name} 已存在于Blob存储中，跳过下载`);
        continue;
      }

      // 下载文件到临时目录
      const tempFilePath = path.join(TEMP_DIR, asset.name);
      console.log(`下载 ${asset.name} 到临时文件: ${tempFilePath}`);

      try {
        await downloadFileWithRetry(asset.browser_download_url, tempFilePath);
        console.log(
          `${asset.name} 下载完成，大小: ${(fs.statSync(tempFilePath).size / (1024 * 1024)).toFixed(
            2
          )} MB`
        );

        // 上传到Blob存储
        console.log(`上传 ${asset.name} 到Blob存储...`);
        const { url } = await blobStorage.uploadDbFile(asset.name, tempFilePath);
        console.log(`${asset.name} 上传完成，Blob URL: ${url}`);

        // 删除临时文件
        fs.unlinkSync(tempFilePath);
        console.log(`已删除临时文件: ${tempFilePath}`);
      } catch (error) {
        console.error(`处理 ${asset.name} 失败:`, error);
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }

    // 列出上传后的文件
    console.log('\n上传后的Blob文件列表：');
    const finalFiles = await blobStorage.listDbFiles();
    finalFiles.forEach(file => {
      console.log(`- ${file} (${blobStorage.getDbFileUrl(file)})`);
    });

    console.log('所有数据库文件处理完成');
  } catch (error) {
    console.error('处理数据库文件时出错:', error);
    throw error;
  }
}

// 如果是直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadReleaseDb().catch(error => {
    console.error('下载发布数据库时发生错误:', error);
    process.exit(1);
  });
}
