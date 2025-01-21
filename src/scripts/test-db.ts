import { Reader } from '@maxmind/geoip2-node';
import path from 'path';
import fs from 'fs';
const maxmind = require('maxmind');
const IP2Location = require('ip2location-nodejs');
const IPDB = require('ipdb');

const DB_DIR = path.join(process.cwd(), 'data', 'db');
const TEST_IPS = ['194.104.146.166', '1.202.124.104'];

async function main() {
  for (const ip of TEST_IPS) {
    console.log(`\n测试IP: ${ip}`);

    // 1. MaxMind GeoLite2
    try {
      console.log('\nMaxMind GeoLite2:');
      const cityReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'GeoLite2-City.mmdb'))
      );
      const countryReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'GeoLite2-Country.mmdb'))
      );
      const asnReader = Reader.openBuffer(fs.readFileSync(path.join(DB_DIR, 'GeoLite2-ASN.mmdb')));

      console.log('City:', cityReader.city(ip));
      console.log('Country:', countryReader.country(ip));
      console.log('ASN:', asnReader.asn(ip));
    } catch (error) {
      console.error('MaxMind查询失败:', error);
    }

    // 2. DB-IP
    try {
      console.log('\nDB-IP:');
      const cityReader = await maxmind.open(path.join(DB_DIR, 'dbip-city-lite.mmdb'));
      const countryReader = await maxmind.open(path.join(DB_DIR, 'dbip-country-lite.mmdb'));
      const asnReader = await maxmind.open(path.join(DB_DIR, 'dbip-asn-lite.mmdb'));

      console.log('City:', cityReader.get(ip));
      console.log('Country:', countryReader.get(ip));
      console.log('ASN:', asnReader.get(ip));
    } catch (error) {
      console.error('DB-IP查询失败:', error);
    }

    // 3. IP2Location
    try {
      console.log('\nIP2Location:');
      const ip2location = new IP2Location.IP2Location();
      ip2location.open(path.join(DB_DIR, 'IP2LOCATION-LITE-DB11.BIN'));
      console.log('Location:', ip2location.getAll(ip));

      const ip2locationAsn = new IP2Location.IP2Location();
      ip2locationAsn.open(path.join(DB_DIR, 'IP2LOCATION-LITE-ASN.BIN'));
      console.log('ASN:', ip2locationAsn.getAll(ip));
    } catch (error) {
      console.error('IP2Location查询失败:', error);
    }

    // 4. IP2Proxy
    try {
      console.log('\nIP2Proxy:');
      const ip2proxy = new IP2Location.IP2Proxy();
      ip2proxy.open(path.join(DB_DIR, 'IP2PROXY-LITE-PX11.BIN'));
      console.log('Proxy:', ip2proxy.getAll(ip));
    } catch (error) {
      console.error('IP2Proxy查询失败:', error);
    }

    // 5. IPinfo
    try {
      console.log('\nIPinfo:');
      const ipinfoReader = await maxmind.open(path.join(DB_DIR, 'ipinfo-country_asn.mmdb'));
      console.log('Info:', ipinfoReader.get(ip));
    } catch (error) {
      console.error('IPinfo查询失败:', error);
    }

    // 6. IPtoASN
    try {
      console.log('\nIPtoASN:');
      const ipv4Reader = await maxmind.open(path.join(DB_DIR, 'iptoasn-asn-ipv4.mmdb'));
      const ipv6Reader = await maxmind.open(path.join(DB_DIR, 'iptoasn-asn-ipv6.mmdb'));
      console.log('IPv4:', ipv4Reader.get(ip));
      console.log('IPv6:', ipv6Reader.get(ip));
    } catch (error) {
      console.error('IPtoASN查询失败:', error);
    }

    // 7. GeoCN
    try {
      console.log('\nGeoCN:');
      const geocnReader = await maxmind.open(path.join(DB_DIR, 'geocn.mmdb'));
      console.log('Info:', geocnReader.get(ip));
    } catch (error) {
      console.error('GeoCN查询失败:', error);
    }

    // 8. 纯真IP库
    try {
      console.log('\n纯真IP库:');
      const ipdb = new IPDB(Buffer.from(fs.readFileSync(path.join(DB_DIR, 'qqwry.ipdb'))));
      console.log('Info:', ipdb.find(ip));
    } catch (error) {
      console.error('纯真IP库查询失败:', error);
    }
  }
}

main().catch(console.error);
