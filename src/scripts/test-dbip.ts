import path from 'path';
import maxmind from 'maxmind';

const DB_DIR = path.join(process.cwd(), 'data', 'db');
const TEST_IP = '194.104.146.166';

async function main() {
  try {
    // 测试城市数据库
    console.log('\n测试 dbip-city-lite.mmdb:');
    const cityReader = await maxmind.open(path.join(DB_DIR, 'dbip-city-lite.mmdb'));
    const cityData = cityReader.get(TEST_IP);
    console.log(JSON.stringify(cityData, null, 2));

    // 测试国家数据库
    console.log('\n测试 dbip-country-lite.mmdb:');
    const countryReader = await maxmind.open(path.join(DB_DIR, 'dbip-country-lite.mmdb'));
    const countryData = countryReader.get(TEST_IP);
    console.log(JSON.stringify(countryData, null, 2));

    // 测试ASN数据库
    console.log('\n测试 dbip-asn-lite.mmdb:');
    const asnReader = await maxmind.open(path.join(DB_DIR, 'dbip-asn-lite.mmdb'));
    const asnData = asnReader.get(TEST_IP);
    console.log(JSON.stringify(asnData, null, 2));
  } catch (error) {
    console.error('测试失败:', error);
  }
}

main();
