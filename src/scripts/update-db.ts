import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

// IPinfo 下载令牌
const IPINFO_TOKEN = '8fb35503a31056';

// 数据库配置
const databases = {
  // DB-IP 数据库
  dbip: [
    {
      name: 'dbip-asn-ipv4',
      url: 'https://cdn.jsdelivr.net/npm/@ip-location-db/dbip-asn-mmdb/dbip-asn-ipv4.mmdb',
      filename: 'dbip-asn-lite.mmdb',
    },
    {
      name: 'dbip-city-ipv4',
      url: 'https://cdn.jsdelivr.net/npm/@ip-location-db/dbip-city-mmdb/dbip-city-ipv4.mmdb',
      filename: 'dbip-city-lite.mmdb',
    },
    {
      name: 'dbip-country-ipv4',
      url: 'https://cdn.jsdelivr.net/npm/@ip-location-db/dbip-country-mmdb/dbip-country-ipv4.mmdb',
      filename: 'dbip-country-lite.mmdb',
    },
  ],
  // MaxMind 数据库
  maxmind: [
    {
      name: 'GeoLite2-ASN',
      url: 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-ASN.mmdb',
      filename: 'GeoLite2-ASN.mmdb',
    },
    {
      name: 'GeoLite2-City',
      url: 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb',
      filename: 'GeoLite2-City.mmdb',
    },
    {
      name: 'GeoLite2-Country',
      url: 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb',
      filename: 'GeoLite2-Country.mmdb',
    },
  ],
  // IPinfo 数据库
  ipinfo: [
    {
      name: 'ipinfo-country-asn',
      url: `https://ipinfo.io/data/free/country_asn.mmdb?token=${IPINFO_TOKEN}`,
      filename: 'ipinfo-country_asn.mmdb',
    },
  ],
};

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  await streamPipeline(response.data, fs.createWriteStream(outputPath));
}

async function updateDatabases(): Promise<void> {
  const outputDir = path.join(process.cwd(), 'data', 'db');

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 下载 DB-IP 数据库
  console.log('正在更新 DB-IP 数据库...');
  for (const db of databases.dbip) {
    try {
      console.log(`下载 ${db.name}...`);
      await downloadFile(db.url, path.join(outputDir, db.filename));
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }

  // 下载 MaxMind 数据库
  console.log('正在更新 MaxMind 数据库...');
  for (const db of databases.maxmind) {
    try {
      console.log(`下载 ${db.name}...`);
      await downloadFile(db.url, path.join(outputDir, db.filename));
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }

  // 下载 IPinfo 数据库
  console.log('正在更新 IPinfo 数据库...');
  for (const db of databases.ipinfo) {
    try {
      console.log(`下载 ${db.name}...`);
      await downloadFile(db.url, path.join(outputDir, db.filename));
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }
}

// 如果直接运行脚本，则执行更新
if (require.main === module) {
  updateDatabases()
    .then(() => {
      console.log('所有数据库更新完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('更新数据库时出错:', error);
      process.exit(1);
    });
}

export { updateDatabases };
