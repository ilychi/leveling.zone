import { Reader } from '@maxmind/geoip2-node';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

interface IpInfo {
  ip: string;
  maxmind?: {
    city?: any;
    country?: any;
    asn?: any;
  };
  dbip?: {
    asn?: any;
    city?: any;
    country?: any;
  };
  ipinfo?: {
    countryAsn?: any;
  };
}

export async function getIpInfo(ip: string): Promise<IpInfo> {
  const result: IpInfo = { ip };

  try {
    // MaxMind
    try {
      const cityReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'GeoLite2-City.mmdb'))
      );
      result.maxmind = result.maxmind || {};
      result.maxmind.city = cityReader.city(ip);
    } catch (error) {
      console.error('Error reading MaxMind City database:', error);
    }

    try {
      const countryReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'GeoLite2-Country.mmdb'))
      );
      result.maxmind = result.maxmind || {};
      result.maxmind.country = countryReader.country(ip);
    } catch (error) {
      console.error('Error reading MaxMind Country database:', error);
    }

    try {
      const asnReader = Reader.openBuffer(fs.readFileSync(path.join(DB_DIR, 'GeoLite2-ASN.mmdb')));
      result.maxmind = result.maxmind || {};
      result.maxmind.asn = asnReader.asn(ip);
    } catch (error) {
      console.error('Error reading MaxMind ASN database:', error);
    }

    // DB-IP
    try {
      const dbipAsnReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'dbip-asn-lite.mmdb'))
      );
      result.dbip = result.dbip || {};
      result.dbip.asn = dbipAsnReader.asn(ip);
    } catch (error) {
      console.error('Error reading DB-IP ASN database:', error);
    }

    try {
      const dbipCityReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'dbip-city-lite.mmdb'))
      );
      result.dbip = result.dbip || {};
      result.dbip.city = dbipCityReader.city(ip);
    } catch (error) {
      console.error('Error reading DB-IP City database:', error);
    }

    try {
      const dbipCountryReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'dbip-country-lite.mmdb'))
      );
      result.dbip = result.dbip || {};
      result.dbip.country = dbipCountryReader.country(ip);
    } catch (error) {
      console.error('Error reading DB-IP Country database:', error);
    }

    // IPinfo
    try {
      const ipinfoReader = Reader.openBuffer(
        fs.readFileSync(path.join(DB_DIR, 'ipinfo-country_asn.mmdb'))
      );
      result.ipinfo = result.ipinfo || {};
      result.ipinfo.countryAsn = ipinfoReader.country(ip);
    } catch (error) {
      console.error('Error reading IPinfo Country-ASN database:', error);
    }

    return result;
  } catch (error) {
    console.error('Error querying IP information:', error);
    throw error;
  }
}
