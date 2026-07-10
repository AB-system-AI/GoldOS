import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@goldos/ui',
    '@goldos/utils',
    '@goldos/config',
    '@goldos/types',
    '@goldos/auth',
  ],
  typedRoutes: true,
};

export default nextConfig;
