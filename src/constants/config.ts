import path from 'path';

// 检查是否在Vercel环境中运行
const isVercel = process.env.VERCEL === '1';

// 动态确定数据库目录路径
export const DB_DIR = isVercel
  ? path.join(process.cwd(), 'public', 'db')
  : path.join(process.cwd(), 'data', 'db');

export const API_TOKENS = {
  IPINFO_TOKEN: process.env.IPINFO_TOKEN || '8fb35503a31056',
  IP2LOCATION_TOKEN:
    process.env.IP2LOCATION_TOKEN ||
    '0WzjmVBCtAx173NvTqr1PSuVRyLh4Ckij1IpqA3FOrWG35CMGYuELLzQAyWDLrel',
  CLOUDFLARE_TOKEN: process.env.CLOUDFLARE_TOKEN,
};

export const DATABASE_FILES = {
  MAXMIND: {
    COUNTRY: 'GeoLite2-Country.mmdb',
    CITY: 'GeoLite2-City.mmdb',
    ASN: 'GeoLite2-ASN.mmdb',
  },
  IP2LOCATION: {
    COUNTRY: 'IP2LOCATION-LITE-DB1.BIN',
    CITY: 'IP2LOCATION-LITE-DB11.BIN',
    LITE_ASN: 'IP2LOCATION-LITE-ASN.BIN',
    PROXY: 'IP2LOCATION-LITE-PX11.BIN',
  },
  DBIP: {
    COUNTRY: 'dbip-country-lite.mmdb',
    CITY: 'dbip-city-lite.mmdb',
    ASN: 'dbip-asn-lite.mmdb',
  },
  IPINFO: {
    COUNTRY_ASN: 'ipinfo-country_asn.mmdb',
  },
  QQWRY: 'qqwry.ipdb',
  GEOCN: 'geocn.mmdb',
  IPTOASN: 'iptoasn-asn.csv',
  AS_INFO: 'as-info.csv',
};
