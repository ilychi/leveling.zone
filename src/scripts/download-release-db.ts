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

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    headers: {
      'User-Agent': 'Vercel-Build-Script',
    },
  });

  await streamPipeline(response.data, fs.createWriteStream(outputPath));
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

    const outputDir = path.join(process.cwd(), 'public', 'db');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('开始下载数据库文件...');
    const downloadPromises = release.assets.map(async (asset: ReleaseAsset) => {
      const outputPath = path.join(outputDir, asset.name);
      console.log(`下载 ${asset.name}...`);
      try {
        await downloadFile(asset.browser_download_url, outputPath);
        console.log(`${asset.name} 下载完成`);
      } catch (error) {
        console.error(`下载 ${asset.name} 失败:`, error);
        throw error;
      }
    });

    await Promise.all(downloadPromises);
    console.log('所有数据库文件下载完成');

    // 列出下载的文件
    console.log('\n下载的文件列表：');
    const files = fs.readdirSync(outputDir);
    files.forEach((file: string) => {
      const stats = fs.statSync(path.join(outputDir, file));
      console.log(`${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
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
