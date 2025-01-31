import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { execSync } from 'child_process';

const streamPipeline = promisify(pipeline);

// 下载令牌
const IP2LOCATION_TOKEN = process.env.IP2LOCATION_TOKEN || '';
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

// 数据库目录配置
const DB_DIRS = {
  data: path.join(process.cwd(), 'data', 'db'),
  public: path.join(process.cwd(), 'public', 'db'),
};

// 数据库配置
const databases = {
  // IP2Location 数据库
  ip2location: [
    {
      name: 'DB11.LITE',
      code: 'DB11LITEBIN',
      filename: 'IP2LOCATION-LITE-DB11.BIN',
    },
    {
      name: 'PX11.LITE',
      code: 'PX11LITEBIN',
      filename: 'IP2LOCATION-LITE-PX11.BIN',
    },
    {
      name: 'DB-ASN.LITE',
      code: 'DBASNLITEBIN',
      filename: 'IP2LOCATION-LITE-ASN.BIN',
    },
  ],
  // DB-IP 数据库
  dbip: [
    {
      name: 'dbip-asn-ipv4',
      url: 'https://raw.githubusercontent.com/adysec/IP_database/main/db-ip/dbip-asn-lite.mmdb',
      filename: 'dbip-asn-lite.mmdb',
    },
    {
      name: 'dbip-city-ipv4',
      url: 'https://raw.githubusercontent.com/adysec/IP_database/main/db-ip/dbip-city-lite.mmdb',
      filename: 'dbip-city-lite.mmdb',
    },
    {
      name: 'dbip-country-ipv4',
      url: 'https://raw.githubusercontent.com/adysec/IP_database/main/db-ip/dbip-country-lite.mmdb',
      filename: 'dbip-country-lite.mmdb',
    },
  ],
  // MaxMind 数据库
  maxmind: [
    {
      name: 'GeoLite2-ASN',
      url: 'https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-ASN.mmdb',
      filename: 'GeoLite2-ASN.mmdb',
    },
    {
      name: 'GeoLite2-City',
      url: 'https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-City.mmdb',
      filename: 'GeoLite2-City.mmdb',
    },
    {
      name: 'GeoLite2-Country',
      url: 'https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-Country.mmdb',
      filename: 'GeoLite2-Country.mmdb',
    },
  ],
  // IPinfo 数据库
  ipinfo: [
    {
      name: 'ipinfo-country-asn',
      url: `https://ipinfo.io/data/free/country_asn.mmdb?token=${IPINFO_TOKEN}`,
      filename: 'ipinfo-country_asn.mmdb',
      requiresToken: true,
      tokenName: 'IPINFO_TOKEN',
    },
  ],
  // 其他数据库
  others: [
    {
      name: 'QQWry',
      url: 'https://unpkg.com/qqwry.ipdb/qqwry.ipdb',
      filename: 'qqwry.ipdb',
    },
    {
      name: 'iptoasn-asn',
      url: 'https://raw.githubusercontent.com/sapics/ip-location-db/main/iptoasn-asn/iptoasn-asn-ipv4.csv',
      filename: 'iptoasn-asn.csv',
    },
    {
      name: 'as-info',
      url: 'https://raw.githubusercontent.com/ipverse/asn-info/master/as.csv',
      filename: 'as-info.csv',
    },
  ],
};

async function copyFromRelease(filename: string): Promise<boolean> {
  try {
    // 检查 release 目录是否存在
    const releaseDir = path.join(process.cwd(), 'release');
    const releaseFile = path.join(releaseDir, filename);

    if (fs.existsSync(releaseFile)) {
      console.log(`从 release 目录复制 ${filename}...`);

      // 确保目标目录存在
      Object.values(DB_DIRS).forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // 复制到所有目标目录
      Object.entries(DB_DIRS).forEach(([key, dir]) => {
        const targetPath = path.join(dir, filename);
        fs.copyFileSync(releaseFile, targetPath);
        console.log(`成功复制到 ${key} 目录: ${targetPath}`);
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error(`从 release 复制 ${filename} 失败:`, error);
    return false;
  }
}

async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  // 确保目标目录存在
  Object.values(DB_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 下载到所有目标目录
  await Promise.all(
    Object.entries(DB_DIRS).map(([key, dir]) => {
      const outputPath = path.join(dir, filename);
      return streamPipeline(response.data, fs.createWriteStream(outputPath)).then(() =>
        console.log(`成功下载到 ${key} 目录: ${outputPath}`)
      );
    })
  );
}

async function updateDatabases(): Promise<void> {
  // 确保所有目标目录存在
  Object.values(DB_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 下载 IP2Location 数据库
  if (IP2LOCATION_TOKEN) {
    console.log('正在更新 IP2Location 数据库...');
    for (const db of databases.ip2location) {
      try {
        const url = `https://www.ip2location.com/download/?token=${IP2LOCATION_TOKEN}&file=${db.code}`;

        console.log(`下载 ${db.name}...`);
        await downloadFile(url, db.filename);
        console.log(`${db.name} 下载完成`);
      } catch (error) {
        console.error(`处理 ${db.name} 失败:`, error);
      }
    }
  } else {
    console.warn('未设置 IP2LOCATION_TOKEN，跳过 IP2Location 数据库更新');
  }

  // 下载 DB-IP 数据库
  console.log('正在更新 DB-IP 数据库...');
  for (const db of databases.dbip) {
    try {
      console.log(`处理 ${db.name}...`);

      // 首先尝试从 release 复制
      const copied = await copyFromRelease(db.filename);
      if (!copied) {
        // 如果复制失败，则从 URL 下载
        console.log(`从 URL 下载 ${db.name}...`);
        await downloadFile(db.url, db.filename);
      }
      console.log(`${db.name} 处理完成`);
    } catch (error) {
      console.error(`处理 ${db.name} 失败:`, error);
    }
  }

  // 下载 MaxMind 数据库
  console.log('正在更新 MaxMind 数据库...');
  for (const db of databases.maxmind) {
    try {
      console.log(`下载 ${db.name}...`);
      await downloadFile(db.url, db.filename);
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }

  // 下载 IPinfo 数据库
  console.log('正在更新 IPinfo 数据库...');
  for (const db of databases.ipinfo) {
    if (db.requiresToken && !process.env[db.tokenName]) {
      console.warn(`未设置 ${db.tokenName}，跳过 ${db.name}`);
      continue;
    }

    try {
      console.log(`下载 ${db.name}...`);
      await downloadFile(db.url, db.filename);
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }

  // 下载其他数据库
  console.log('正在更新其他数据库...');
  for (const db of databases.others) {
    try {
      console.log(`下载 ${db.name}...`);
      await downloadFile(db.url, db.filename);
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }
}

// 直接调用主函数
updateDatabases().catch(error => {
  console.error('更新数据库时发生错误:', error);
  process.exit(1);
});

export { updateDatabases };
