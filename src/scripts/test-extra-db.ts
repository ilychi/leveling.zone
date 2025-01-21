import path from 'path';
import maxmind from 'maxmind';
import fs from 'fs';
const Libqqwry = require('lib-qqwry');

const DB_DIR = path.join(process.cwd(), 'data', 'db');
const TEST_IP = '194.104.146.166';

async function main() {
  try {
    // 测试 GeoCN 数据库
    console.log('\n测试 geocn.mmdb:');
    const geocnReader = await maxmind.open(path.join(DB_DIR, 'geocn.mmdb'));
    const geocnData = geocnReader.get(TEST_IP);
    console.log(JSON.stringify(geocnData, null, 2));

    // 测试纯真 IP 数据库
    console.log('\n测试 qqwry.dat:');
    const qqwry = Libqqwry.init();
    qqwry.speed();
    const qqwryData = qqwry.searchIP(TEST_IP);
    console.log(JSON.stringify(qqwryData, null, 2));

    // 测试 ASN 信息数据库
    console.log('\n测试 asn-info.csv:');
    const asnInfoContent = fs.readFileSync(path.join(DB_DIR, 'asn-info.csv'), 'utf-8');
    const asnInfoLines = asnInfoContent.split('\n');
    // 查找 AS23961 的信息
    const asnInfo = asnInfoLines.find(line => line.startsWith('23961,'));
    if (asnInfo) {
      const [asn, name, country, org] = asnInfo.split(',');
      console.log(JSON.stringify({ asn, name, country, org }, null, 2));
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

main();
