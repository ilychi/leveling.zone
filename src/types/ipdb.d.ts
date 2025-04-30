declare module 'ipdb' {
  export class IPDB {
    constructor(buffer: Buffer);
    find(ip: string): {
      code: number;
      data: {
        country_name: string;
        region_name: string;
        city_name: string;
        district_name: string;
        isp_domain: string;
        owner_domain: string;
      };
    };
  }
}
