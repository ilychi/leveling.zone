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
    return {
      success: true,
      data: {
        location: {
          latitude: lat,
          longitude: lng,
          country: data.regeocode?.addressComponent?.country,
          province: data.regeocode?.addressComponent?.province,
          city:
            data.regeocode?.addressComponent?.city?.[0] ||
            data.regeocode?.addressComponent?.province,
          district: data.regeocode?.addressComponent?.district,
          street: data.regeocode?.addressComponent?.streetNumber?.street,
          street_number: data.regeocode?.addressComponent?.streetNumber?.number,
          township: data.regeocode?.addressComponent?.township,
          formatted_address: data.regeocode?.formatted_address,
          adcode: data.regeocode?.addressComponent?.adcode,
          citycode: data.regeocode?.addressComponent?.citycode,
        },
        meta: {
          source: '高德地图',
          timestamp: new Date().toISOString(),
          business_areas: data.regeocode?.addressComponent?.businessAreas || [],
          township_code: data.regeocode?.addressComponent?.towncode,
          street_location: data.regeocode?.addressComponent?.streetNumber?.location,
          street_direction: data.regeocode?.addressComponent?.streetNumber?.direction,
          street_distance: data.regeocode?.addressComponent?.streetNumber?.distance,
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
          country: data.result?.addressComponent?.country,
          province: data.result?.addressComponent?.province,
          city: data.result?.addressComponent?.city,
          district: data.result?.addressComponent?.district,
          street: data.result?.addressComponent?.street,
          street_number: data.result?.addressComponent?.street_number,
          town: data.result?.addressComponent?.town,
          formatted_address: data.result?.formatted_address,
          adcode: data.result?.addressComponent?.adcode,
        },
        meta: {
          source: '百度地图',
          timestamp: new Date().toISOString(),
          business: data.result?.business,
          business_areas: data.result?.business_info || [],
          city_level: data.result?.addressComponent?.city_level,
          town_code: data.result?.addressComponent?.town_code,
          direction: data.result?.addressComponent?.direction,
          distance: data.result?.addressComponent?.distance,
          country_code: data.result?.addressComponent?.country_code,
          country_code_iso: data.result?.addressComponent?.country_code_iso,
          country_code_iso2: data.result?.addressComponent?.country_code_iso2,
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
          nation: data.result?.address_component?.nation,
          province: data.result?.address_component?.province,
          city: data.result?.address_component?.city,
          district: data.result?.address_component?.district,
          street: data.result?.address_component?.street,
          street_number: data.result?.address_component?.street_number,
          formatted_address:
            data.result?.formatted_addresses?.standard_address || data.result?.address,
        },
        meta: {
          source: '腾讯地图',
          timestamp: new Date().toISOString(),
          ad_info: data.result?.ad_info,
          address_reference: {
            famous_area: data.result?.address_reference?.famous_area,
            landmark_l2: data.result?.address_reference?.landmark_l2,
            business_area: data.result?.address_reference?.business_area,
            town: data.result?.address_reference?.town,
            street: data.result?.address_reference?.street,
            crossroad: data.result?.address_reference?.crossroad,
          },
          recommend_address: data.result?.formatted_addresses?.recommend,
          rough_address: data.result?.formatted_addresses?.rough,
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
    if (!meituanResult?.success || !meituanResult.data) {
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
