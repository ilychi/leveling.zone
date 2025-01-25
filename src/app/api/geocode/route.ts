import { NextRequest, NextResponse } from 'next/server';

// 高德地图 API
async function amapGeocode(address: string) {
  const key = process.env.AMAP_KEY;
  const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(
    address
  )}&key=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('高德地图地理编码失败:', error);
    return null;
  }
}

// 百度地图 API
async function baiduGeocode(address: string) {
  const key = process.env.BAIDU_MAP_KEY;
  const url = `https://api.map.baidu.com/geocoding/v3/?address=${encodeURIComponent(
    address
  )}&output=json&ak=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('百度地图地理编码失败:', error);
    return null;
  }
}

// 腾讯地图 API
async function tencentGeocode(address: string) {
  const key = process.env.TENCENT_MAP_KEY;
  const url = `https://apis.map.qq.com/ws/geocoder/v1/?address=${encodeURIComponent(
    address
  )}&key=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('腾讯地图地理编码失败:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const source = searchParams.get('source') || 'amap'; // 默认使用高德地图

  if (!address) {
    return NextResponse.json({ error: '请提供地址参数' }, { status: 400 });
  }

  let result;
  switch (source) {
    case 'amap':
      result = await amapGeocode(address);
      break;
    case 'baidu':
      result = await baiduGeocode(address);
      break;
    case 'tencent':
      result = await tencentGeocode(address);
      break;
    default:
      return NextResponse.json({ error: '不支持的地图源' }, { status: 400 });
  }

  if (!result) {
    return NextResponse.json({ error: '地理编码失败' }, { status: 500 });
  }

  return NextResponse.json(result);
}
