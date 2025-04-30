import { list, put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { DATABASE_FILES } from '../constants/config';

// Blob存储前缀
const BLOB_PREFIX = 'mmdb';

// 待上传的文件列表，基于DATABASE_FILES配置
const files = [
  DATABASE_FILES.MAXMIND.COUNTRY,
  DATABASE_FILES.MAXMIND.CITY,
  DATABASE_FILES.MAXMIND.ASN,
  DATABASE_FILES.IP2LOCATION.COUNTRY,
  DATABASE_FILES.IP2LOCATION.CITY,
  DATABASE_FILES.IP2LOCATION.LITE_ASN,
  DATABASE_FILES.IP2LOCATION.PROXY,
  DATABASE_FILES.DBIP.COUNTRY,
  DATABASE_FILES.DBIP.CITY,
  DATABASE_FILES.DBIP.ASN,
  DATABASE_FILES.IPINFO.COUNTRY_ASN,
  DATABASE_FILES.QQWRY,
  DATABASE_FILES.GEOCN,
  DATABASE_FILES.IPTOASN,
  DATABASE_FILES.AS_INFO,
];

// 可能的数据库目录列表
const dbPaths = [path.join(process.cwd(), 'data', 'db'), path.join(process.cwd(), 'public', 'db')];

async function uploadFilesToBlob() {
  console.log('开始上传数据库文件到Vercel Blob...');

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('错误: 未设置BLOB_READ_WRITE_TOKEN环境变量，无法上传到Vercel Blob');
      process.exit(1);
    }

    // 获取Blob存储中已有的文件列表
    console.log('检查Blob存储中的文件...');
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const existingFiles = blobs.map(blob => path.basename(blob.pathname));
    console.log(`Blob存储中已有 ${existingFiles.length} 个文件: ${existingFiles.join(', ')}`);

    // 显示当前工作目录
    console.log(`当前工作目录: ${process.cwd()}`);

    // 检查可能的数据库目录
    let validDbPath = null;
    for (const dbPath of dbPaths) {
      if (fs.existsSync(dbPath)) {
        console.log(`找到数据库目录: ${dbPath}`);
        try {
          const files = fs.readdirSync(dbPath);
          console.log(`${dbPath} 包含 ${files.length} 个文件`);
          validDbPath = dbPath;
          break;
        } catch (err) {
          console.warn(`无法读取目录 ${dbPath}: ${err}`);
        }
      } else {
        console.log(`目录不存在: ${dbPath}`);
      }
    }

    if (!validDbPath) {
      console.error(`找不到有效的数据库目录`);
      process.exit(1);
    }

    // 直接上传目录中的所有数据库文件，包括可能的新文件
    const dirFiles = fs.readdirSync(validDbPath);

    for (const fileName of dirFiles) {
      const filePath = path.join(validDbPath, fileName);

      // 跳过非文件项
      if (!fs.statSync(filePath).isFile()) {
        continue;
      }

      // 仅处理数据库文件
      if (
        !(
          fileName.endsWith('.mmdb') ||
          fileName.endsWith('.BIN') ||
          fileName.endsWith('.ipdb') ||
          fileName.endsWith('.csv')
        )
      ) {
        console.log(`跳过非数据库文件: ${fileName}`);
        continue;
      }

      console.log(`处理 ${fileName}...`);

      // 检查是否已存在于Blob存储中
      if (existingFiles.includes(fileName)) {
        console.log(`${fileName} 已存在于Blob存储中，跳过上传`);
        continue;
      }

      // 上传文件
      try {
        console.log(`上传 ${fileName} 到Blob存储...`);
        const fileContent = fs.readFileSync(filePath);
        const blobKey = `${BLOB_PREFIX}/${fileName}`;

        const { url } = await put(blobKey, fileContent, {
          access: 'public',
          addRandomSuffix: false,
        });

        console.log(`上传 ${fileName} 成功，URL: ${url}`);
      } catch (error) {
        console.error(`上传 ${fileName} 失败:`, error);
      }
    }

    // 显示上传后的文件列表
    console.log('\n上传后的Blob文件列表：');
    const { blobs: updatedBlobs } = await list({ prefix: BLOB_PREFIX });

    for (const blob of updatedBlobs) {
      console.log(`- ${path.basename(blob.pathname)} (${blob.url})`);
    }

    console.log('全部文件处理完成');
  } catch (error) {
    console.error('上传过程发生错误:', error);
    process.exit(1);
  }
}

// 执行上传
uploadFilesToBlob();
