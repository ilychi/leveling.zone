interface NetworkInfo {
  asn?: string | number;
  organization?: string;
  type?: string;
  domain?: string;
  route?: string;
  [key: string]: any;
}

export const formatNetworkInfo = (network: NetworkInfo = {}) => {
  const {
    asn,
    organization,
    type,
    domain,
    route,
    ...rest
  } = network;

  return {
    asn: asn ? `AS${asn}` : undefined,
    organization: organization || undefined,
    type: type || undefined,
    domain: domain || undefined,
    route: route || undefined,
    ...rest
  };
}; 
