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

// 美团地图 API
async function meituanGeocode(ip: string) {
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

    return {
      success: true,
      data: {
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
        meta: {
          source: '美团地图',
          timestamp: new Date().toISOString(),
          city_id: latlngData.data?.dpCityId,
          area_id: latlngData.data?.area,
          city_pinyin: latlngData.data?.cityPinyin,
        },
      },
    };
  } catch (error) {
    console.error('美团地图查询失败:', error);
    return null;
  }
}

// 高德地图逆地理编码 API
async function amapReverseGeocode(lat: number, lng: number) {
  const key = process.env.AMAP_KEY;
  const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${key}`;

  try {
    const response = await fetchWithTimeout(url);
    const data = await response.json();
    return {
      success: true,
      data: {
        location: {
          latitude: lat,
          longitude: lng,
          ...data.regeocode?.addressComponent,
          formatted_address: data.regeocode?.formatted_address,
        },
        meta: {
          source: '高德地图',
          timestamp: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('高德地图逆地理编码失败:', error);
    return null;
  }
}

// 百度地图逆地理编码 API
async function baiduReverseGeocode(lat: number, lng: number) {
  const key = process.env.BAIDU_MAP_KEY;
  const url = `https://api.map.baidu.com/reverse_geocoding/v3/?location=${lat},${lng}&output=json&ak=${key}`;

  try {
    const response = await fetchWithTimeout(url);
    const data = await response.json();
    return {
      success: true,
      data: {
        location: {
          latitude: lat,
          longitude: lng,
          ...data.result?.addressComponent,
          formatted_address: data.result?.formatted_address,
        },
        meta: {
          source: '百度地图',
          timestamp: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('百度地图逆地理编码失败:', error);
    return null;
  }
}

// 腾讯地图逆地理编码 API
async function tencentReverseGeocode(lat: number, lng: number) {
  const key = process.env.TENCENT_MAP_KEY;
  const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${key}`;

  try {
    const response = await fetchWithTimeout(url);
    const data = await response.json();
    return {
      success: true,
      data: {
        location: {
          latitude: lat,
          longitude: lng,
          ...data.result?.address_component,
          formatted_address: data.result?.formatted_addresses?.recommend,
        },
        meta: {
          source: '腾讯地图',
          timestamp: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('腾讯地图逆地理编码失败:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // 首先使用美团API获取经纬度
    const meituanResult = await meituanGeocode(ip);
    if (!meituanResult?.success) {
      return NextResponse.json(
        {
          success: false,
          message: '无法获取位置信息',
        },
        { status: 400 }
      );
    }

    const { latitude, longitude } = meituanResult.data.location;

    // 使用其他地图API进行逆地理编码
    const [amapResult, baiduResult, tencentResult] = await Promise.all([
      amapReverseGeocode(latitude, longitude),
      baiduReverseGeocode(latitude, longitude),
      tencentReverseGeocode(latitude, longitude),
    ]);

    // 合并所有结果
    return NextResponse.json({
      success: true,
      data: {
        ip,
        meituan: meituanResult.data,
        amap: amapResult?.data,
        baidu: baiduResult?.data,
        tencent: tencentResult?.data,
      },
    });
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
