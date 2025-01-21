const https = require('https');
const fs = require('fs');
const path = require('path');

const dbFiles = [
  {
    url: 'https://download.ip2location.com/lite/IP2LOCATION-LITE-DB11.BIN.ZIP',
    filename: 'IP2LOCATION-LITE-DB11.BIN'
  },
  {
    url: 'https://download.ip2location.com/lite/IP2LOCATION-LITE-ASN.BIN.ZIP',
    filename: 'IP2LOCATION-LITE-ASN.BIN'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/qqwry.ipdb@latest/qqwry.ipdb',
    filename: 'qqwry.ipdb'
  }
];

async function downloadFile(url, filename) {
  const dbDir = path.join(process.cwd(), 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const filePath = path.join(dbDir, filename);
  const file = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(filePath);
      reject(err);
    });
  });
}

async function main() {
  try {
    for (const file of dbFiles) {
      console.log(`Downloading ${file.filename}...`);
      await downloadFile(file.url, file.filename);
      console.log(`Downloaded ${file.filename}`);
    }
  } catch (error) {
    console.error('Error downloading files:', error);
    process.exit(1);
  }
}

main(); 
