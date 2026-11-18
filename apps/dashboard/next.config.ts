import type { NextConfig } from 'next';

const config: NextConfig = {
  // A second build next to a running `next dev` (e.g. a production build for e2e runs) can use its own folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@fitexaa/ui', '@fitexaa/api-client'],
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Gym subdomains in development: powerhouse.localhost:3000, admin.localhost:3000 …
  allowedDevOrigins: ['*.localhost'],
};

export default config;
