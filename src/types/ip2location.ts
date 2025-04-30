export interface IP2LocationResult {
  countryShort?: string;
  countryLong?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  zipCode?: string;
  asn?: number;
  as?: string;
  provider?: string;
}

export interface IP2LocationProxyResult extends IP2LocationResult {
  isProxy?: number;
  proxyType?: string;
  usageType?: string;
  threat?: string;
}

export interface IP2LocationResponse {
  status: string;
  country_code: string;
  country_name: string;
  region_name: string;
  city_name: string;
  latitude: number;
  longitude: number;
  zip_code: string;
  time_zone: string;
  asn: string;
  as: string;
  isp: string;
}
