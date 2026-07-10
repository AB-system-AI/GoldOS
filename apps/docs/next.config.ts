import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@goldos/ui', '@goldos/utils', '@goldos/config'],
};

export default nextConfig;
