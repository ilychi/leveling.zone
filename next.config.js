/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    missingSuspenseWithCSRBailout: false,
    serverComponentsExternalPackages: ['maxmind'],
  },
  output: 'standalone',
  // 配置动态路由
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
  // 为特定路由配置动态渲染策略
  rewrites() {
    return {
      beforeFiles: [
        // 将报错的API路由配置为动态处理
        { source: '/api/geocode', destination: '/api/geocode' },
        { source: '/api/countries', destination: '/api/countries' },
        { source: '/api/leak', destination: '/api/leak' },
        { source: '/api/ip/geoip', destination: '/api/ip/geoip' },
      ],
    };
  },
  webpack: (config, { isServer }) => {
    // 添加对 .node 文件的支持
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    if (isServer) {
      config.externals.push('maxmind');
    }

    return config;
  },
  // 设置默认路由为Pages路由
  useFileSystemPublicRoutes: true,
};

module.exports = nextConfig;
