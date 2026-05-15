/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'standalone',
  // outputFileTracingRoot: path.join(__dirname),
  // Turbopack 通过环境变量 NEXT_DISABLE_TURBOPACK=1 禁用
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
