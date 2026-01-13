/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // 개발 환경에서 source map 최적화
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig

