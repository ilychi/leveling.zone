import path from 'path';

export const DB_DIR = path.join(process.cwd(), 'data', 'db');

export const API_TOKENS = {
  IPINFO_TOKEN: process.env.IPINFO_TOKEN || '8fb35503a31056',
  IP2LOCATION_TOKEN:
    process.env.IP2LOCATION_TOKEN ||
    '0WzjmVBCtAx173NvTqr1PSuVRyLh4Ckij1IpqA3FOrWG35CMGYuELLzQAyWDLrel',
  CLOUDFLARE_TOKEN: process.env.CLOUDFLARE_TOKEN,
};

export const DATABASE_FILES = {
  MAXMIND: {
    CITY: 'GeoLite2-City.mmdb',
    COUNTRY: 'GeoLite2-Country.mmdb',
    ASN: 'GeoLite2-ASN.mmdb',
  },
  DBIP: {
    CITY: 'dbip-city-lite.mmdb',
    COUNTRY: 'dbip-country-lite.mmdb',
    ASN: 'dbip-asn-lite.mmdb',
  },
  IP2LOCATION: {
    CITY: 'IP2LOCATION-LITE-DB11.BIN',
    PROXY: 'IP2LOCATION-LITE-PX11.BIN',
    ASN: 'IP2LOCATION-LITE-ASN.BIN',
  },
  IPINFO: {
    COUNTRY_ASN: 'ipinfo-country_asn.mmdb',
  },
  IPTOASN: {
    IPV4: 'iptoasn-asn-ipv4.mmdb',
    IPV6: 'iptoasn-asn-ipv6.mmdb',
  },
  QQWRY: {
    DAT: 'qqwry.dat',
    IPDB: 'qqwry.ipdb',
  },
  GEOCN: {
    MMDB: 'geocn.mmdb',
  },
  ASN_INFO: {
    CSV: 'asn-info.csv',
  },
};
