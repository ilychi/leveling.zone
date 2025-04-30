import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';
import { DATABASE_FILES } from '../constants/config';

const BLOB_PREFIX = 'mmdb';

// GeoCN数据库文件信息
const geocnUrl = 'https://github.com/ljxi/GeoCN/releases/download/Latest/GeoCN.mmdb';
const geocnFilename = 'geocn.mmdb';

async function downloadAndUpload() {
  console.log('开始下载并上传GeoCN数据库...');

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('错误: 未设置BLOB_READ_WRITE_TOKEN环境变量，无法上传到Vercel Blob');
      process.exit(1);
    }

    // 确保临时目录存在
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, geocnFilename);

    // 下载文件
    console.log(`下载 ${geocnUrl} 到 ${tempFilePath}...`);

    const response = await axios({
      method: 'get',
      url: geocnUrl,
      responseType: 'stream',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', err => reject(err));
    });

    console.log('文件下载完成');

    // 检查文件是否下载成功
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('下载失败: 文件不存在');
    }

    // 获取文件大小
    const stats = fs.statSync(tempFilePath);
    console.log(`文件大小: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

    // 上传到Vercel Blob
    console.log('上传到Vercel Blob...');

    const fileContent = fs.readFileSync(tempFilePath);
    const blobKey = `${BLOB_PREFIX}/${geocnFilename}`;

    const { url } = await put(blobKey, fileContent, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log(`上传成功，URL: ${url}`);

    // 清理临时文件
    fs.unlinkSync(tempFilePath);
    console.log('临时文件已清理');

    // 确保数据目录也有该文件的副本
    const dataDir = path.join(process.cwd(), 'data', 'db');
    const publicDir = path.join(process.cwd(), 'public', 'db');

    // 确保目录存在
    [dataDir, publicDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // 复制到数据目录和公共目录
    fs.writeFileSync(path.join(dataDir, geocnFilename), fileContent);
    fs.writeFileSync(path.join(publicDir, geocnFilename), fileContent);

    console.log(`文件已复制到本地数据库目录和公共目录`);

    console.log('操作完成');
  } catch (error) {
    console.error('发生错误:', error);
    process.exit(1);
  }
}

// 执行下载和上传
downloadAndUpload();
