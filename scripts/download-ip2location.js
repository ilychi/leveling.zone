const https = require('https');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// IP2Location 下载令牌
const TOKEN = '0WzjmVBCtAx173NvTqr1PSuVRyLh4Ckij1IpqA3FOrWG35CMGYuELLzQAyWDLrel';

const databases = [
  {
    name: 'DB11.LITE',
    code: 'DB11LITE',
    filename: 'IP2LOCATION-LITE-DB11.BIN',
  },
  {
    name: 'PX11.LITE',
    code: 'PX11LITE',
    filename: 'IP2LOCATION-LITE-PX11.BIN',
  },
  {
    name: 'DB-ASN.LITE',
    code: 'DBASNLITE',
    filename: 'IP2LOCATION-LITE-ASN.BIN',
  },
];

const iptoasnDatabases = [
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
];

async function downloadFile(url, outputPath) {
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

async function downloadWithAxios(url, outputPath) {
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

async function main() {
  const outputDir = path.join(__dirname, '..', 'data', 'db');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 下载 IP2Location 数据库
  for (const db of databases) {
    const url = `https://www.ip2location.com/download/?token=${TOKEN}&file=${db.code}`;
    const outputPath = path.join(outputDir, db.filename);

    console.log(`正在下载 ${db.name}...`);
    try {
      await downloadFile(url, outputPath);
      console.log(`${db.name} 下载完成`);
    } catch (error) {
      console.error(`下载 ${db.name} 失败:`, error);
    }
  }

  // 下载 iptoasn 数据库
  for (const db of iptoasnDatabases) {
    const outputPath = path.join(outputDir, db.filename);

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
