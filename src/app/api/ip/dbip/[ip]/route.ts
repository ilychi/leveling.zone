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

    const coords = normalizeCoordinates(cityResult?.latitude, cityResult?.longitude);

    const result = {
      ip,
      location: {
        country: cityResult?.country_code
          ? {
              code: cityResult.country_code,
            }
          : null,
        region: cityResult?.state1
          ? {
              name: cityResult.state1,
              code: `US-${cityResult.state1.substring(0, 2).toUpperCase()}`,
            }
          : null,
        city: cityResult?.city
          ? {
              name: cityResult.city,
            }
          : null,
        postal: cityResult?.postcode
          ? {
              code: cityResult.postcode,
            }
          : null,
        coordinates: coords,
        timezone: cityResult?.timezone || null,
      },
      network: asnResult
        ? {
            asn: formatAsn(asnResult.autonomous_system_number),
            organization: asnResult.autonomous_system_organization,
          }
        : null,
      meta: {
        source: 'dbip',
        timestamp: new Date().toISOString(),
        databases: {
          city: 'dbip-city-lite.mmdb',
          asn: 'dbip-asn-lite.mmdb',
        },
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
