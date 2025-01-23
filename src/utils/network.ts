interface NetworkInfo {
  asn?: string | number;
  organization?: string;
  type?: string;
  domain?: string;
  route?: string;
  isp?: string;
  [key: string]: any;
}

export const formatNetworkInfo = (network: NetworkInfo = {}): string => {
  const { asn, organization, type, domain, route, isp, ...rest } = network;

  const parts: string[] = [];

  if (asn) {
    parts.push(`AS${asn}`);
  }

  if (organization) {
    parts.push(organization);
  }

  if (isp && isp !== organization) {
    parts.push(isp);
  }

  if (type) {
    parts.push(type);
  }

  if (domain) {
    parts.push(domain);
  }

  if (route) {
    parts.push(route);
  }

  return parts.filter(Boolean).join(' | ');
};
