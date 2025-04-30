import { Reader } from '@maxmind/geoip2-node';
import fs from 'fs';
import { DB_PATHS } from '@/constants/paths';

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
      const cityReader = Reader.openBuffer(fs.readFileSync(DB_PATHS.MAXMIND.CITY));
      result.maxmind = result.maxmind || {};
      result.maxmind.city = cityReader.city(ip);
    } catch (error) {
      console.error('Error reading MaxMind City database:', error);
    }

    try {
      const countryReader = Reader.openBuffer(fs.readFileSync(DB_PATHS.MAXMIND.COUNTRY));
      result.maxmind = result.maxmind || {};
      result.maxmind.country = countryReader.country(ip);
    } catch (error) {
      console.error('Error reading MaxMind Country database:', error);
    }

    try {
      const asnReader = Reader.openBuffer(fs.readFileSync(DB_PATHS.MAXMIND.ASN));
      result.maxmind = result.maxmind || {};
      result.maxmind.asn = asnReader.asn(ip);
    } catch (error) {
      console.error('Error reading MaxMind ASN database:', error);
    }

    // DB-IP
    try {
      const dbipAsnReader = Reader.openBuffer(fs.readFileSync(DB_PATHS.DBIP.ASN));
      result.dbip = result.dbip || {};
      result.dbip.asn = dbipAsnReader.asn(ip);
    } catch (error) {
      console.error('Error reading DB-IP ASN database:', error);
    }

    try {
      const dbipCityReader = Reader.openBuffer(fs.readFileSync(DB_PATHS.DBIP.CITY));
      result.dbip = result.dbip || {};
      result.dbip.city = dbipCityReader.city(ip);
    } catch (error) {
      console.error('Error reading DB-IP City database:', error);
    }

    try {
      const dbipCountryReader = Reader.openBuffer(fs.readFileSync(DB_PATHS.DBIP.COUNTRY));
      result.dbip = result.dbip || {};
      result.dbip.country = dbipCountryReader.country(ip);
    } catch (error) {
      console.error('Error reading DB-IP Country database:', error);
    }

    // IPinfo
    try {
      const ipinfoReader = Reader.openBuffer(fs.readFileSync(DB_PATHS.IPINFO.COUNTRY_ASN));
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
