import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@fitnexa/ui', '@fitnexa/api-client'],
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Gym subdomains in development: powerhouse.localhost:3000, admin.localhost:3000 …
  allowedDevOrigins: ['*.localhost'],
};

export default config;
