/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    missingSuspenseWithCSRBailout: false
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
};

module.exports = nextConfig;
