import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as maxmind from 'maxmind';
import { cleanupObject, formatAsn, handleLocalhost, normalizeCoordinates } from '@/utils/ip';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

async function getDbipInfo(ip: string) {
  try {
    const [dbipCity, dbipAsn] = await Promise.all([
      maxmind.open(path.join(DB_DIR, 'dbip-city-lite.mmdb')),
      maxmind.open(path.join(DB_DIR, 'dbip-asn-lite.mmdb')),
    ]);

    const cityResult = dbipCity.get(ip) as any;
    const asnResult = dbipAsn.get(ip) as any;

    if (!cityResult && !asnResult) return null;

    const coords = normalizeCoordinates(
      cityResult?.location?.latitude,
      cityResult?.location?.longitude
    );

    const result = {
      ip,
      location: {
        continent: cityResult?.continent?.names?.en,
        continentCode: cityResult?.continent?.code,
        country: cityResult?.country?.names?.en,
        countryCode: cityResult?.country?.iso_code,
        isEU: cityResult?.country?.is_in_european_union,
        region: cityResult?.subdivisions?.[0]?.names?.en,
        regionCode: cityResult?.subdivisions?.[0]?.iso_code,
        city: cityResult?.city?.names?.en,
        ...coords,
        timezone: cityResult?.location?.time_zone,
        geonameId: cityResult?.city?.geoname_id,
      },
      network: {
        asn: formatAsn(asnResult?.autonomous_system_number),
        organization: asnResult?.autonomous_system_organization,
        network: asnResult?.network,
        route: asnResult?.route,
      },
      meta: {
        accuracy: cityResult?.location?.accuracy_radius,
        source: 'dbip',
      },
    };

    cleanupObject(result);
    return result;
  } catch (error) {
    console.error('DB-IP查询失败:', error);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { ip: string } }) {
  try {
    const ip = handleLocalhost(params.ip);
    if (!ip) {
      return NextResponse.json(
        { error: 'IP parameter is required' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const data = await getDbipInfo(ip);
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('查询失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
