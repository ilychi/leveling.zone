import path from 'path';
import { Reader } from '@maxmind/geoip2-node';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

interface IPQueryResult {
  city?: string;
  country?: string;
  asn?: number;
  asnOrg?: string;
  continent?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
}

async function openDatabases() {
  try {
    const maxmindCity = await Reader.open(path.join(DB_DIR, 'GeoLite2-City.mmdb'));
    const maxmindASN = await Reader.open(path.join(DB_DIR, 'GeoLite2-ASN.mmdb'));
    const dbipCity = await Reader.open(path.join(DB_DIR, 'dbip-city-lite.mmdb'));
    const dbipASN = await Reader.open(path.join(DB_DIR, 'dbip-asn-lite.mmdb'));
    const ipinfoCountryASN = await Reader.open(path.join(DB_DIR, 'ipinfo-country_asn.mmdb'));

    console.log('所有数据库文件已成功打开\n');
    return { maxmindCity, maxmindASN, dbipCity, dbipASN, ipinfoCountryASN };
  } catch (error) {
    console.error('打开数据库文件时出错:', error);
    throw error;
  }
}

async function testIP(ip: string, dbs: any) {
  console.log(`测试 IP: ${ip}\n`);

  try {
    // MaxMind 查询
    console.log('MaxMind 结果:');
    try {
      const cityResult = await dbs.maxmindCity.city(ip);
      const asnResult = await dbs.maxmindASN.asn(ip);
      console.log('完整结果:', JSON.stringify(cityResult, null, 2));
      console.log('ASN完整结果:', JSON.stringify(asnResult, null, 2));

      console.log('\n提取的关键信息:');
      console.log('城市:', cityResult.city?.names?.zh_CN || cityResult.city?.names?.en);
      console.log('国家:', cityResult.country?.names?.zh_CN || cityResult.country?.names?.en);
      console.log('ASN:', asnResult.autonomousSystemNumber);
      console.log('ASN组织:', asnResult.autonomousSystemOrganization);
    } catch (error) {
      console.error('MaxMind 查询失败:', error);
    }

    // DB-IP 查询
    console.log('\nhttps://download.db-ip.com/free/dbip-country-lite-2025-01.mmdb.gz 结果:');
    try {
      const cityResult = await dbs.dbipCity.city(ip);
      const asnResult = await dbs.dbipASN.asn(ip);
      console.log('城市数据:', JSON.stringify(cityResult, null, 2));
      console.log('ASN数据:', JSON.stringify(asnResult, null, 2));
    } catch (error) {
      console.error('DB-IP 查询失败:', error);
    }

    // IPinfo 查询
    console.log('\nIPinfo 结果:');
    try {
      const result = await dbs.ipinfoCountryASN.get(ip);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('IPinfo 查询失败:', error);
    }
  } catch (error) {
    console.error(`查询 IP ${ip} 时出错:`, error);
  }
  console.log('\n' + '-'.repeat(80) + '\n');
}

async function main() {
  const dbs = await openDatabases();

  // 测试一些示例 IP
  await testIP('194.104.146.166', dbs); // 一个随机的公网 IP
  await testIP('1.1.1.1', dbs); // Cloudflare DNS
  await testIP('8.8.8.8', dbs); // Google DNS
  await testIP('223.5.5.5', dbs); // 阿里 DNS
  await testIP('2001:4860:4860::8888', dbs); // Google DNS IPv6
  await testIP('invalid-ip', dbs); // 无效的 IP 地址
}

if (require.main === module) {
  main().catch(console.error);
}
