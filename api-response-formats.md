# IP 地理位置 API 返回格式文档

## 国际数据源

### 1. ident.me
- **IPv4 端点**: `https://v4.ident.me/json`
- **IPv6 端点**: `https://v6.ident.me/json`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "hostname": "ec2-52-52-77-19.us-west-1.compute.amazonaws.com",
  "aso": "Amazon.com, Inc.",
  "asn": 16509,
  "type": "hosting",
  "continent": "NA",
  "cc": "US",
  "country": "United States",
  "city": "San Jose",
  "postal": "95141",
  "latitude": 37.3387,
  "longitude": -121.885,
  "tz": "America/Los_Angeles",
  "weather": "USCA0993"
}
```

### 2. ip.sb
- **IPv4 端点**: `https://api-ipv4.ip.sb/geoip`
- **IPv6 端点**: `https://api-ipv6.ip.sb/geoip`
- **返回格式**: 403 Forbidden (需要认证或有访问限制)

### 3. ipapi.is
- **端点**: `https://api.ipapi.is`
- **返回格式**: JSON (详细的地理位置和网络信息)
```json
{
  "ip": "52.52.77.19",
  "rir": "ARIN",
  "is_bogon": false,
  "is_mobile": false,
  "is_satellite": false,
  "is_crawler": false,
  "is_datacenter": true,
  "is_tor": false,
  "is_proxy": false,
  "is_vpn": true,
  "is_abuser": false,
  "datacenter": {
    "datacenter": "Amazon AWS",
    "network": "52.52.0.0/15",
    "region": "us-west-1",
    "service": "AMAZON",
    "network_border_group": "us-west-1"
  },
  "company": {
    "name": "Amazon Technologies Inc.",
    "abuser_score": "0.0005 (Very Low)",
    "domain": "amazon.com",
    "type": "hosting",
    "network": "52.0.0.0 - 52.79.255.255",
    "whois": "https://api.ipapi.is/?whois=52.0.0.0"
  },
  "abuse": {
    "name": "Amazon Technologies Inc.",
    "address": "410 Terry Ave N., Seattle, WA, 98109, US",
    "email": "trustandsafety@support.aws.com",
    "phone": "+1-206-555-0000"
  },
  "asn": {
    "asn": 16509,
    "abuser_score": "0.0001 (Very Low)",
    "route": "52.52.0.0/15",
    "descr": "AMAZON-02, US",
    "country": "us",
    "active": true,
    "org": "Amazon.com, Inc.",
    "domain": "amazon.com",
    "abuse": "trustandsafety@support.aws.com",
    "type": "hosting",
    "created": "2000-05-04",
    "updated": "2012-03-02",
    "rir": "ARIN",
    "whois": "https://api.ipapi.is/?whois=AS16509"
  },
  "location": {
    "is_eu_member": false,
    "calling_code": "1",
    "currency_code": "USD",
    "continent": "NA",
    "country": "United States",
    "country_code": "US",
    "state": "California",
    "city": "San Francisco",
    "latitude": 37.77493,
    "longitude": -122.41942,
    "zip": "94188",
    "timezone": "America/Los_Angeles",
    "local_time": "2025-06-06T02:04:07-07:00",
    "local_time_unix": 1749200647,
    "is_dst": true
  },
  "elapsed_ms": 0.74
}
```

### 4. ipapi.co
- **端点**: `https://ipapi.co/json/`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "network": "52.52.0.0/17",
  "version": "IPv4",
  "city": "Santa Clara",
  "region": "California",
  "region_code": "CA",
  "country": "US",
  "country_name": "United States",
  "country_code": "US",
  "country_code_iso3": "USA",
  "country_capital": "Washington",
  "country_tld": ".us",
  "continent_code": "NA",
  "in_eu": false,
  "postal": "95054",
  "latitude": 37.3924,
  "longitude": -121.9623,
  "timezone": "America/Los_Angeles",
  "utc_offset": "-0700",
  "country_calling_code": "+1",
  "currency": "USD",
  "currency_name": "Dollar",
  "languages": "en-US,es-US,haw,fr",
  "country_area": 9629091.0,
  "country_population": 327167434,
  "asn": "AS16509",
  "org": "AMAZON-02"
}
```

### 5. ipwho.is
- **端点**: `https://ipwho.is/`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "success": true,
  "type": "IPv4",
  "continent": "North America",
  "continent_code": "NA",
  "country": "United States",
  "country_code": "US",
  "region": "California",
  "region_code": "CA",
  "city": "San Jose",
  "latitude": 37.3382082,
  "longitude": -121.8863286,
  "is_eu": false,
  "postal": "95113",
  "calling_code": "1",
  "capital": "Washington D.C.",
  "borders": "CA,MX",
  "flag": {
    "img": "https://cdn.ipwhois.io/flags/us.svg",
    "emoji": "🇺🇸",
    "emoji_unicode": "U+1F1FA U+1F1F8"
  },
  "connection": {
    "asn": 16509,
    "org": "Amazon Technologies Inc.",
    "isp": "Amazon.com, Inc.",
    "domain": "amazon.com"
  },
  "timezone": {
    "id": "America/Los_Angeles",
    "abbr": "PDT",
    "is_dst": true,
    "offset": -25200,
    "utc": "-07:00",
    "current_time": "2025-06-06T02:04:20-07:00"
  }
}
```

### 6. ipquery.io
- **端点**: `https://api.ipquery.io/?format=json`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "isp": {
    "asn": "AS16509",
    "org": "Amazon.com, Inc.",
    "isp": "Amazon.com, Inc."
  },
  "location": {
    "country": "United States",
    "country_code": "US",
    "city": "San Jose",
    "state": "California",
    "zipcode": "95141",
    "latitude": 37.35295159981334,
    "longitude": -121.89383799087186,
    "timezone": "America/Los_Angeles",
    "localtime": "2025-06-06T09:04:26"
  },
  "risk": {
    "is_mobile": false,
    "is_vpn": false,
    "is_tor": false,
    "is_proxy": false,
    "is_datacenter": true,
    "risk_score": 0
  }
}
```

### 7. apip.cc
- **端点**: `https://apip.cc/json`
- **返回格式**: JSON
```json
{
  "status": "success",
  "query": "52.52.77.19",
  "CountryCode": "US",
  "CountryName": "United States",
  "Capital": "Washington D.C.",
  "PhonePrefix": "+1",
  "Currency": "USD",
  "USDRate": "1",
  "EURRate": "1.14",
  "RegionCode": "CA",
  "RegionName": "California",
  "City": "San Jose",
  "Postal": "95141",
  "Latitude": "37.3388",
  "Longitude": "-121.8916",
  "TimeZone": "America/Los_Angeles",
  "ContinentCode": "NA",
  "ContinentName": "North America",
  "asn": "AS16509",
  "org": "AMAZON-02"
}
```

### 8. Cloudflare Speed
- **端点**: `https://speed.cloudflare.com/meta`
- **返回格式**: JSON
```json
{
  "hostname": "speed.cloudflare.com",
  "clientIp": "52.52.77.19",
  "httpProtocol": "HTTP/1.1",
  "asn": 16509,
  "asOrganization": "Amazon Technologies Inc.",
  "colo": "SJC",
  "country": "US",
  "city": "San Jose",
  "region": "California",
  "postalCode": "95025",
  "latitude": "37.33939",
  "longitude": "-121.89496"
}
```

### 9. Surfshark
- **端点**: `https://surfshark.com/api/v1/server/user`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "isp": "Amazon Technologies Inc.",
  "countryCode": "US",
  "country": "United States",
  "region": "California",
  "currency": "USD",
  "city": "San Jose",
  "zipCode": "95025",
  "secured": false,
  "torrent": false,
  "restricted": false
}
```

### 10. vercel-ip.html.zone
- **端点**: `https://vercel-ip.html.zone/geo`
- **返回格式**: 安全检查页面 (需要通过验证)

### 11. netlify-ip.html.zone
- **端点**: `https://netlify-ip.html.zone/geo`
- **返回格式**: JSON (部分响应)
```json
{
  "ip": "52.52.77.19",
  "city": "San Jose",
  "country": "United States",
  "flag": "🇺🇸",
  "countryRegion": "California",
  "region": "aws-us-west-1",
  "latitude": 37.3388,
  "longitude": -121.8916
}
```

### 12. cloudflare-ip-v4.html.zone
- **端点**: `https://cloudflare-ip-v4.html.zone/geo`
- **返回格式**: Cloudflare 安全检查页面

### 13. ip-api.io
- **端点**: `https://ip-api.io/json`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "countryCode": "US",
  "country_code": "US",
  "countryName": "United States",
  "country_name": "United States",
  "isInEuropeanUnion": false,
  "is_in_european_union": false,
  "regionName": "California",
  "region_name": "California",
  "regionCode": "CA",
  "region_code": "CA",
  "city": "San Jose",
  "zipCode": "95141",
  "zip_code": "95141",
  "timeZone": "America/Los_Angeles",
  "time_zone": "America/Los_Angeles",
  "latitude": 37.1835,
  "longitude": -121.7714,
  "metroCode": 807,
  "metro_code": 807,
  "organisation": "AMAZON-02",
  "flagUrl": "https://www.countryflags.io/US/flat/64.png",
  "emojiFlag": "https://www.countryflags.io/US/emoji.png",
  "currencySymbol": "",
  "currency": "",
  "callingCode": "",
  "countryCapital": "",
  "suspiciousFactors": {
    "isProxy": false,
    "isTorNode": false,
    "isSpam": false,
    "isSuspicious": false
  }
}
```

### 14. wtfismyip.com
- **端点**: `https://wtfismyip.com/json`
- **返回格式**: JSON (特色命名风格)
```json
{
  "YourFuckingIPAddress": "52.52.77.19",
  "YourFuckingLocation": "San Jose, CA, United States",
  "YourFuckingHostname": "ec2-52-52-77-19.us-west-1.compute.amazonaws.com",
  "YourFuckingISP": "Amazon.com, Inc.",
  "YourFuckingTorExit": false,
  "YourFuckingCity": "San Jose",
  "YourFuckingCountry": "United States",
  "YourFuckingCountryCode": "US"
}
```

### 15. Cloudflare CDN-CGI Trace (多个站点)
- **端点**: 
  - `https://www.apnic.net/cdn-cgi/trace`
  - `https://discord.com/cdn-cgi/trace`
  - `https://claude.ai/cdn-cgi/trace`
  - `https://chatgpt.com/cdn-cgi/trace`
  - `https://www.visa.cn/cdn-cgi/trace`
- **返回格式**: 文本键值对
```
fl=465f194
h=www.apnic.net
ip=52.52.77.19
ts=1749200726.057
visit_scheme=https
uag=curl/8.12.1
colo=SJC
sliver=none
http=http/2
loc=US
tls=TLSv1.3
sni=plaintext
warp=off
gateway=off
rbi=off
kex=X25519
```

### 16. ipinfo.app
- **端点**: `https://ipv4.my.ipinfo.app/api/ipDetails.php`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "asn": "AS16509 AMAZON-02, US",
  "continent": "NA",
  "continentLong": "North America",
  "flag": "https://my.ipinfo.app/imgs/flags/4x3/us.svg",
  "country": "United States"
}
```

## 中国数据源

### 1. 头条天气
- **端点**: `https://www.toutiao.com/stream/widget/local_weather/data/`
- **返回格式**: JSON (包含详细天气信息)
```json
{
  "data": {
    "city": "圣克拉拉县",
    "ip": "52.52.77.19",
    "weather": {
      "city_name": "克拉玛依",
      "current_temperature": 34,
      "current_condition": "晴",
      "high_temperature": 35,
      "low_temperature": 24,
      "forecast_list": [...],
      // 更多天气数据
    }
  }
}
```

### 2. ipip.net
- **端点**: `https://myip.ipip.net/json`
- **返回格式**: JSON
```json
{
  "ret": "ok",
  "data": {
    "ip": "52.52.77.19",
    "location": ["美国", "加利福尼亚州", "圣何塞", "", "amazon.com"]
  }
}
```

### 3. 百度API
- **端点**: `https://qifu-api.baidubce.com/ip/local/geo/v1/district`
- **返回格式**: JSON
```json
{
  "code": "Success",
  "data": {
    "continent": "",
    "country": "美国",
    "zipcode": "",
    "owner": "",
    "isp": "",
    "adcode": "",
    "prov": "",
    "city": "",
    "district": ""
  },
  "ip": "52.52.77.19"
}
```

### 4. vore.top
- **端点**: `https://api.vore.top/api/IPdata`
- **返回格式**: JSON
```json
{
  "code": 200,
  "msg": "SUCCESS",
  "ipinfo": {
    "type": "ipv4",
    "text": "52.52.77.19",
    "cnip": false
  },
  "ipdata": {
    "info1": "美国",
    "info2": "加利福尼亚州",
    "info3": "圣何塞",
    "isp": "亚马逊技术公司"
  },
  "adcode": {
    "o": "美国加利福尼亚州圣何塞 - 亚马逊技术公司",
    "p": "美国",
    "c": "加利福尼亚州",
    "n": "美国-加利福尼亚州",
    "r": null,
    "a": null,
    "i": false
  },
  "tips": "接口由VORE-API(https://api.vore.top/)免费提供",
  "time": 1749200784
}
```

### 5. 高德地图
- **端点**: `https://restapi.amap.com/v3/ip?key=0113a13c88697dcea6a445584d535837`
- **返回格式**: JSON (国外IP返回空数据)
```json
{
  "status": "1",
  "info": "OK",
  "infocode": "10000",
  "province": [],
  "city": [],
  "adcode": [],
  "rectangle": []
}
```

### 6. zhale.me
- **端点**: `https://ipv4cn.zhale.me/ip.php`
- **返回格式**: JSON
```json
{
  "ip": "52.52.77.19",
  "location": "美国, 加州"
}
```

### 7. 又拍云
- **端点**: `https://pubstatic.b0.upaiyun.com/?_upnode`
- **返回格式**: JSON
```json
{
  "addr": "69.28.62.187",
  "server": "marco/3.2.2",
  "server_time": "2025-06-06 09:06:45",
  "remote_addr": "52.52.77.19",
  "addr_location": {
    "country": "美国",
    "isp": "zenlayer.com",
    "province": "加利福尼亚州",
    "continent": "北美洲",
    "city": "洛杉矶"
  },
  "hostname": "gtt-us-lax1-187",
  "remote_addr_location": {
    "country": "美国",
    "isp": "amazon.com",
    "province": "加利福尼亚州",
    "continent": "北美洲",
    "city": "旧金山"
  }
}
```

### 8. zxinc.org
- **IPv4端点**: `https://v4.ip.zxinc.org/info.php?type=json`
- **IPv6端点**: `https://v6.ip.zxinc.org/info.php?type=json`
- **返回格式**: JSON
```json
{
  "code": 0,
  "data": {
    "myip": "52.52.77.19",
    "location": "美国–加利福尼亚州–旧金山–旧金山 Amazon数据中心",
    "country": "美国–加利福尼亚州–旧金山–旧金山",
    "local": "Amazon数据中心",
    "ver4": "纯真网络 2024年07月03日IP数据",
    "ver6": " ZX公网IPv6库\t20250302版",
    "count4": 1463850,
    "count6": 164270
  }
}
```

## 特点总结

### 数据丰富度
- **最详细**: ipapi.is（包含滥用分数、数据中心检测、公司信息等）
- **标准详细**: ipapi.co, ipwho.is, ipquery.io
- **基础信息**: ident.me, surfshark, ip-api.io

### 特色功能
- **风险检测**: ipapi.is, ipquery.io（检测VPN、代理、Tor等）
- **天气信息**: 头条API（返回详细天气预报）
- **CDN追踪**: Cloudflare CDN-CGI接口（返回CDN节点信息）
- **双语支持**: 中国数据源支持中文地名

### 访问限制
- **需要认证**: ip.sb
- **安全检查**: vercel-ip.html.zone, cloudflare-ip-v4.html.zone
- **地域限制**: 高德地图API（国外IP返回空数据）

### 响应格式
- **JSON格式**: 大部分API
- **键值对格式**: Cloudflare CDN-CGI trace接口
- **特殊命名**: wtfismyip.com（使用幽默的字段名）