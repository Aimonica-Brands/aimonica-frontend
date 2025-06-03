/** @type {import('next').NextConfig} */

const nextConfig = {
  compiler: {
    removeConsole: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? { exclude: ['error'] } : false
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  reactStrictMode: false,
  swcMinify: true,
  images: { disableStaticImages: true },
  eslint: { ignoreDuringBuilds: true }
};

module.exports = nextConfig;
