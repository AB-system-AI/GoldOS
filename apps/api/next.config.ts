import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@goldos/database',
    '@goldos/config',
    '@goldos/types',
    '@goldos/utils',
    '@goldos/auth',
    '@goldos/business',
  ],
};

export default nextConfig;
