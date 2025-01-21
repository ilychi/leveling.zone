const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const databases = [
  {
    input: 'IP2LOCATION-LITE-DB11.BIN',
    output: 'IP2LOCATION-LITE-DB11.mmdb',
  },
  {
    input: 'IP2LOCATION-LITE-PX11.BIN',
    output: 'IP2LOCATION-LITE-PX.mmdb',
  },
  {
    input: 'IP2LOCATION-LITE-ASN.BIN',
    output: 'IP2LOCATION-LITE-ASN.mmdb',
  },
];

async function main() {
  const dbDir = path.join(__dirname, '..', 'data', 'db');

  for (const db of databases) {
    const inputPath = path.join(dbDir, db.input);
    const outputPath = path.join(dbDir, db.output);

    if (!fs.existsSync(inputPath)) {
      console.error(`找不到输入文件: ${db.input}`);
      continue;
    }

    console.log(`正在转换 ${db.input} 到 ${db.output}...`);
    try {
      // 使用 ip2location-bin-to-mmdb 工具进行转换
      execSync(`ip2location-bin-to-mmdb -i "${inputPath}" -o "${outputPath}"`, {
        stdio: 'inherit',
      });
      console.log(`转换完成: ${db.output}`);

      // 删除原始 BIN 文件
      fs.unlinkSync(inputPath);
      console.log(`删除原始文件: ${db.input}`);
    } catch (error) {
      console.error(`转换失败: ${db.input}`, error);
    }
  }
}

main().catch(console.error);
