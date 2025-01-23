import axios from 'axios';
import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';

// 下载令牌
const IP2LOCATION_TOKEN = process.env.IP2LOCATION_TOKEN || '';
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

const databases = [
  {
    name: 'DB11.LITE',
    code: 'DB11LITE',
    filename: 'IP2LOCATION-LITE-DB11.BIN',
    outputFilename: 'IP2LOCATION-LITE-DB11.mmdb',
  },
  {
    name: 'PX11.LITE',
    code: 'PX11LITE',
    filename: 'IP2LOCATION-LITE-PX11.BIN',
    outputFilename: 'IP2LOCATION-LITE-PX.mmdb',
  },
  {
    name: 'DB-ASN.LITE',
    code: 'DBASNLITE',
    filename: 'IP2LOCATION-LITE-ASN.BIN',
    outputFilename: 'IP2LOCATION-LITE-ASN.mmdb',
  },
];

const additionalDatabases = [
  {
    name: 'GeoCN',
    url: 'https://github.com/ljxi/GeoCN/releases/download/Latest/GeoCN.mmdb',
    filename: 'geocn.mmdb',
  },
  {
    name: 'ASN Info',
    url: 'https://raw.githubusercontent.com/ipverse/asn-info/master/as.csv',
    filename: 'asn-info.csv',
  },
  {
    name: 'iptoasn-v4',
    url: 'https://github.com/sapics/ip-location-db/raw/main/iptoasn-asn-mmdb/iptoasn-asn-ipv4.mmdb',
    filename: 'iptoasn-asn-ipv4.mmdb',
  },
  {
    name: 'iptoasn-v6',
    url: 'https://github.com/sapics/ip-location-db/raw/main/iptoasn-asn-mmdb/iptoasn-asn-ipv6.mmdb',
    filename: 'iptoasn-asn-ipv6.mmdb',
  },
  {
    name: 'QQWry',
    url: 'https://cdn.jsdelivr.net/npm/qqwry.ipdb@latest/qqwry.ipdb',
    filename: 'qqwry.ipdb',
  },
  {
    name: 'IPInfo ASN',
    url: `https://ipinfo.io/data/free/country_asn.mmdb?token=${IPINFO_TOKEN}`,
    filename: 'ipinfo-asn.mmdb',
    requiresToken: true,
    tokenName: 'IPINFO_TOKEN',
  },
];

async function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https
      .get(url, response => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', err => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
  });
}

async function downloadWithAxios(url: string, outputPath: string): Promise<void> {
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function convertIP2Location(inputPath: string, outputPath: string): Promise<void> {
  try {
    console.log(`正在转换 ${path.basename(inputPath)} 到 ${path.basename(outputPath)}...`);
    execSync(`ip2location-bin-to-mmdb -i "${inputPath}" -o "${outputPath}"`, {
      stdio: 'inherit',
    });
    console.log(`转换完成: ${path.basename(outputPath)}`);

    // 删除原始 BIN 文件
    fs.unlinkSync(inputPath);
    console.log(`删除原始文件: ${path.basename(inputPath)}`);
  } catch (error) {
    console.error(`转换失败: ${path.basename(inputPath)}`, error);
    throw error;
  }
}

async function main() {
  if (!IP2LOCATION_TOKEN) {
    console.error('错误: 未设置 IP2LOCATION_TOKEN 环境变量');
    process.exit(1);
  }

  // 创建数据目录
  const dbDir = path.join(process.cwd(), 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 下载并转换 IP2Location 数据库
  for (const db of databases) {
    const url = `https://www.ip2location.com/download/?token=${IP2LOCATION_TOKEN}&file=${db.code}`;
    const inputPath = path.join(dbDir, db.filename);
    const outputPath = path.join(dbDir, db.outputFilename);

    console.log(`正在下载 ${db.name}...`);
    try {
      await downloadFile(url, inputPath);
      console.log(`${db.name} 下载完成`);
      await convertIP2Location(inputPath, outputPath);
    } catch (error) {
      console.error(`处理 ${db.name} 失败:`, error);
    }
  }

  // 下载其他数据库
  for (const db of additionalDatabases) {
    // 检查是否需要 token
    if (db.requiresToken) {
      const token = process.env[db.tokenName];
      if (!token) {
        console.error(`错误: 未设置 ${db.tokenName} 环境变量，跳过下载 ${db.name}`);
        continue;
      }
    }

    const outputPath = path.join(dbDir, db.filename);

    console.log(`正在下载 ${db.name}...`);
    try {
      await downloadWithAxios(db.url, outputPath);
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }
}

main().catch(console.error);
