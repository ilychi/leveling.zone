import { NextRequest, NextResponse } from 'next/server';
import { Reader } from '@maxmind/geoip2-node';
import { readFile } from 'fs/promises';
import path from 'path';

// GeoLite2 数据库路径
const DB_PATHS = {
  ASN: path.join(process.cwd(), 'data/db/GeoLite2-ASN.mmdb'),
  CITY: path.join(process.cwd(), 'data/db/GeoLite2-City.mmdb'),
  COUNTRY: path.join(process.cwd(), 'data/db/GeoLite2-Country.mmdb'),
};

interface GeoLite2Readers {
  asnReader: any;
  cityReader: any;
  countryReader: any;
}

let readers: Partial<GeoLite2Readers> = {};

// 初始化 GeoLite2 数据库读取器
async function initReaders(): Promise<GeoLite2Readers> {
  if (!readers.asnReader || !readers.cityReader || !readers.countryReader) {
    try {
      const [asnBuffer, cityBuffer, countryBuffer] = await Promise.all([
        readFile(DB_PATHS.ASN),
        readFile(DB_PATHS.CITY),
        readFile(DB_PATHS.COUNTRY),
      ]);

      readers = {
        asnReader: Reader.openBuffer(asnBuffer),
        cityReader: Reader.openBuffer(cityBuffer),
        countryReader: Reader.openBuffer(countryBuffer),
      };
    } catch (error) {
      console.error('GeoLite2 数据库加载失败:', error);
      throw new Error('无法加载 GeoLite2 数据库');
    }
  }
  return readers as GeoLite2Readers;
}

interface SubdivisionInfo {
  name: {
    'zh-CN'?: string;
    en?: string;
  };
  isoCode?: string;
  confidence?: number;
  geonameId?: number;
}

// 查询 IP 信息
async function queryIP(ip: string) {
  const { asnReader, cityReader, countryReader } = await initReaders();

  try {
    const [asnInfo, cityInfo, countryInfo] = await Promise.all([
      (asnReader as any).asn(ip),
      (cityReader as any).city(ip),
      (countryReader as any).country(ip),
    ]);

    return {
      asn: {
        number: asnInfo?.autonomousSystemNumber,
        organization: asnInfo?.autonomousSystemOrganization,
      },
      city: {
        name: {
          'zh-CN': cityInfo?.city?.names?.['zh-CN'],
          en: cityInfo?.city?.names?.en,
        },
        confidence: cityInfo?.city?.confidence,
        geonameId: cityInfo?.city?.geonameId,
      },
      continent: {
        code: cityInfo?.continent?.code,
        name: {
          'zh-CN': cityInfo?.continent?.names?.['zh-CN'],
          en: cityInfo?.continent?.names?.en,
        },
        geonameId: cityInfo?.continent?.geonameId,
      },
      country: {
        name: {
          'zh-CN': cityInfo?.country?.names?.['zh-CN'],
          en: cityInfo?.country?.names?.en,
        },
        isoCode: cityInfo?.country?.isoCode,
        confidence: cityInfo?.country?.confidence,
        geonameId: cityInfo?.country?.geonameId,
      },
      location: {
        accuracyRadius: cityInfo?.location?.accuracyRadius,
        latitude: cityInfo?.location?.latitude,
        longitude: cityInfo?.location?.longitude,
        timeZone: cityInfo?.location?.timeZone,
        metroCode: cityInfo?.location?.metroCode,
      },
      postal: {
        code: cityInfo?.postal?.code,
        confidence: cityInfo?.postal?.confidence,
      },
      registeredCountry: {
        name: {
          'zh-CN': cityInfo?.registeredCountry?.names?.['zh-CN'],
          en: cityInfo?.registeredCountry?.names?.en,
        },
        isoCode: cityInfo?.registeredCountry?.isoCode,
        confidence: cityInfo?.registeredCountry?.confidence,
        geonameId: cityInfo?.registeredCountry?.geonameId,
      },
      subdivisions: cityInfo?.subdivisions?.map(
        (subdivision: any): SubdivisionInfo => ({
          name: {
            'zh-CN': subdivision.names?.['zh-CN'],
            en: subdivision.names?.en,
          },
          isoCode: subdivision.isoCode,
          confidence: subdivision.confidence,
          geonameId: subdivision.geonameId,
        })
      ),
    };
  } catch (error) {
    console.error('GeoLite2 查询失败:', error);
    throw error;
  }
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');

    if (!ip) {
      return NextResponse.json(
        { error: '缺少 IP 参数' },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    const result = await queryIP(ip);
    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return new NextResponse(
      JSON.stringify(
        {
          error: '查询失败',
          details: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      ),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
