import { NextRequest, NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function getMeituanLocation(ip: string) {
  try {
    // 第一步：获取IP的经纬度信息
    const ipLocResponse = await fetchWithTimeout(
      `https://apimobile.meituan.com/locate/v2/ip/loc?client_source=webapi&rgeo=true&ip=${ip}`
    );

    if (!ipLocResponse.ok) {
      throw new Error('Failed to fetch IP location');
    }

    const ipLocData = await ipLocResponse.json();

    if (!ipLocData.data || !ipLocData.data.lat || !ipLocData.data.lng) {
      return {
        success: false,
        message: '无法获取位置信息',
      };
    }

    // 第二步：使用经纬度获取详细地址信息
    const latlngResponse = await fetchWithTimeout(
      `https://apimobile.meituan.com/group/v1/city/latlng/${ipLocData.data.lat},${ipLocData.data.lng}?tag=0`
    );

    if (!latlngResponse.ok) {
      throw new Error('Failed to fetch address details');
    }

    const latlngData = await latlngResponse.json();

    // 合并两个API的结果
    return {
      success: true,
      data: {
        ip: ip,
        location: {
          latitude: ipLocData.data.lat,
          longitude: ipLocData.data.lng,
          country: ipLocData.data.rgeo?.country || '-',
          province: ipLocData.data.rgeo?.province || '-',
          city: ipLocData.data.rgeo?.city || '-',
          district: ipLocData.data.rgeo?.district || '-',
          detail: latlngData.data?.detail || '-',
          area_name: latlngData.data?.areaName || '-',
          street: latlngData.data?.address || '-',
          formatted_address: [
            ipLocData.data.rgeo?.country,
            ipLocData.data.rgeo?.province,
            ipLocData.data.rgeo?.city,
            ipLocData.data.rgeo?.district,
            latlngData.data?.areaName,
            latlngData.data?.detail,
          ]
            .filter(Boolean)
            .join(' '),
        },
        accuracy: {
          confidence: latlngData.data?.confidence || 0,
          level: latlngData.data?.level || 0,
          source: '美团地图',
          is_foreign: latlngData.data?.isForeign || false,
        },
        meta: {
          timestamp: new Date().toISOString(),
          api_version: '1.0',
          city_id: latlngData.data?.dpCityId,
          area_id: latlngData.data?.area,
          city_pinyin: latlngData.data?.cityPinyin,
        },
      },
    };
  } catch (error) {
    console.error('Meituan API Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
    };
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 从URL参数中获取IP
    const searchParams = request.nextUrl.searchParams;
    const ip = searchParams.get('ip');

    if (!ip) {
      return NextResponse.json(
        {
          success: false,
          message: '请提供IP地址',
        },
        { status: 400 }
      );
    }

    // 获取地理位置信息
    const result = await getMeituanLocation(ip);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}
