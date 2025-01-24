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
          formatted_address: `${ipLocData.data.rgeo?.country || ''}${
            ipLocData.data.rgeo?.province || ''
          }${ipLocData.data.rgeo?.city || ''}${ipLocData.data.rgeo?.district || ''}${
            latlngData.data?.detail || ''
          }${latlngData.data?.areaName ? `(${latlngData.data.areaName})` : ''}`,
          adcode: ipLocData.data.rgeo?.adcode || '-',
        },
        meta: {
          source: '美团地图',
          timestamp: new Date().toISOString(),
          city_id: latlngData.data?.dpCityId,
          area_id: latlngData.data?.area,
          city_pinyin: latlngData.data?.cityPinyin,
          from_where: ipLocData.data.fromwhere,
          is_foreign: latlngData.data?.isForeign || false,
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
    const addressComponent = data.regeocode?.addressComponent;
    const streetNumber = addressComponent?.streetNumber;
    const formatted_address = `${addressComponent?.country || ''}${
      addressComponent?.province || ''
    }${addressComponent?.city?.[0] || addressComponent?.province || ''}${
      addressComponent?.district || ''
    }${addressComponent?.township || ''}${streetNumber?.street || ''}${streetNumber?.number || ''}${
      addressComponent?.township ? `(${addressComponent.township})` : ''
    }`;
    const alt_address = data.regeocode?.formatted_address;

    return {
      success: true,
      data: {
        location: {
          latitude: lat,
          longitude: lng,
          country: addressComponent?.country,
          province: addressComponent?.province,
          city: addressComponent?.city?.[0] || addressComponent?.province,
          district: addressComponent?.district,
          formatted_address:
            formatted_address +
            (alt_address && alt_address !== formatted_address ? `/${alt_address}` : ''),
          adcode: addressComponent?.adcode,
          citycode: addressComponent?.citycode,
        },
        meta: {
          source: '高德地图',
          timestamp: new Date().toISOString(),
          business_areas: addressComponent?.businessAreas || [],
          township_code: addressComponent?.towncode,
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
    const addressComponent = data.result?.addressComponent;

    return {
      success: true,
      data: {
        location: {
          latitude: lat,
          longitude: lng,
          country: addressComponent?.country,
          province: addressComponent?.province,
          city: addressComponent?.city,
          district: addressComponent?.district,
          formatted_address: `${addressComponent?.country || ''}${
            addressComponent?.province || ''
          }${addressComponent?.city || ''}${addressComponent?.district || ''}${
            addressComponent?.street || ''
          }${addressComponent?.street_number || ''}`,
          adcode: addressComponent?.adcode,
        },
        meta: {
          source: '百度地图',
          timestamp: new Date().toISOString(),
          business: data.result?.business,
          business_areas: data.result?.business_info || [],
          city_level: addressComponent?.city_level,
          town_code: addressComponent?.town_code,
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
    const addressComponent = data.result?.address_component;
    const formatted_addresses = data.result?.formatted_addresses;
    const landmark = data.result?.address_reference?.landmark_l2;

    const standard_address = `${addressComponent?.nation || ''}${addressComponent?.province || ''}${
      addressComponent?.city || ''
    }${addressComponent?.district || ''}${addressComponent?.street || ''}${
      addressComponent?.street_number || ''
    }`;
    const recommend_address = formatted_addresses?.recommend;
    const landmark_info = landmark ? `[${landmark.title}]` : '';

    return {
      success: true,
      data: {
        location: {
          latitude: lat,
          longitude: lng,
          nation: addressComponent?.nation,
          province: addressComponent?.province,
          city: addressComponent?.city,
          district: addressComponent?.district,
          formatted_address: `${standard_address}${
            recommend_address ? `/${recommend_address}` : ''
          }${landmark_info}`,
        },
        meta: {
          source: '腾讯地图',
          timestamp: new Date().toISOString(),
          ad_info: data.result?.ad_info,
          address_reference: {
            famous_area: data.result?.address_reference?.famous_area,
            landmark_l2: landmark,
            business_area: data.result?.address_reference?.business_area,
            town: data.result?.address_reference?.town,
          },
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
    // 优先使用请求参数中的 IP
    let ip = searchParams.get('ip');

    // 如果没有提供 IP，则尝试从请求头获取
    if (!ip) {
      // 尝试从各种请求头获取真实 IP
      ip =
        request.headers.get('x-real-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.ip ||
        request.headers.get('x-vercel-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-forwarded-host') ||
        '127.0.0.1';
    }

    // 首先使用美团API获取经纬度
    const meituanResult = await meituanGeocode(ip);
    if (!meituanResult?.success || !meituanResult.data) {
      return NextResponse.json(
        {
          success: false,
          message: '无法获取位置信息',
          ip: ip,
          headers: {
            'x-real-ip': request.headers.get('x-real-ip'),
            'x-forwarded-for': request.headers.get('x-forwarded-for'),
            'x-vercel-forwarded-for': request.headers.get('x-vercel-forwarded-for'),
            'x-forwarded-host': request.headers.get('x-forwarded-host'),
          },
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
