export interface LocationInfo {
  latitude?: number | string;
  longitude?: string | number;
  timezone?: string;
  zipcode?: string;
}

export interface NetworkInfo {
  proxy?: {
    isProxy: boolean;
    proxyType?: string;
    provider?: string;
    region?: string;
    city?: string;
    threat?: string;
    usage?: string;
  };
  isp?: string;
  domain?: string;
  usageType?: string;
  threat?: string;
  network?: string;
  isAnonymous?: boolean;
  isAnonymousVpn?: boolean;
  isHostingProvider?: boolean;
  isPublicProxy?: boolean;
  isTorExitNode?: boolean;
}

export interface IpInfo {
  ip: string;
  city?: string;
  country?: string;
  continent?: string;
  region?: string;
  asn?: number | string;
  asnOrg?: string;
  asnInfo?: {
    number?: string;
    name?: string;
    org?: string;
    aka?: string;
    country?: string;
  };
  location?: LocationInfo;
  network?: NetworkInfo;
  source?: string[];
  timestamp?: string;
  maxmind?: any;
  dbip?: any;
  ip2location?: any;
  ipinfo?: {
    asn?: string;
    asnOrg?: string;
    country?: string;
    continent?: string;
    asDomain?: string;
    is_anycast?: boolean;
    is_mobile?: boolean;
    is_anonymous?: boolean;
    is_satellite?: boolean;
    is_hosting?: boolean;
  };
  iptoasn?: any;
  geocn?: any;
  qqwry?: any;
  cloudflare?: {
    security?: {
      threatScore?: number;
      isBot?: boolean;
      isProxy?: boolean;
      isTor?: boolean;
      isVpn?: boolean;
      isHosting?: boolean;
    };
    network?: {
      datacenter?: string;
      http?: string;
      tls?: string;
      warp?: boolean;
    };
    location?: {
      region?: string;
      timezone?: string;
    };
    dns?: {
      records?: string[];
      responseCode?: number;
    };
  };
}

export interface IPQueryResult {
  city?: string;
  country?: string;
  continent?: string;
  region?: string;
  asn?: number;
  asnOrg?: string;
  location?: LocationInfo;
  network?: NetworkInfo;
  source?: string[];
}
