interface NetworkInfo {
  asn?: string | number;
  organization?: string;
  name?: string;
  route?: string;
  domain?: string;
  type?: string;
}

export const formatASN = (asn?: string | number, organization?: string, name?: string) => {
  if (!asn) return undefined;

  // 格式化ASN号码
  const asnNumber = asn.toString().replace(/[^0-9]/g, '');
  const asnPart = `AS${asnNumber}`;

  // 如果没有组织信息，只返回ASN号码
  if (!organization && !name) return asnPart;

  // 提取组织简称（第一个单词）
  const orgParts = organization?.split(/[\s,]+/) || [];
  const shortName = orgParts[0] || '';

  // 使用完整组织名称
  const fullName = organization || name || '';

  // 如果简称和完整名称相同，或者没有简称，只显示两部分
  if (!shortName || shortName === fullName) {
    return `${asnPart} | ${fullName}`;
  }

  // 返回完整格式：AS号码 | 简称 | 完整名称
  return `${asnPart} | ${shortName} | ${fullName}`;
};

export const formatNetworkInfo = (network: NetworkInfo = {}) => {
  const { asn, organization, name, route, domain, type } = network;

  return {
    asn: formatASN(asn, organization, name),
    organization: organization || name,
    route,
    domain,
    type,
  };
};
