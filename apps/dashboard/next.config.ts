import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';

/**
 * Content Security Policy. Only what the dashboard really loads:
 * - images: our own files, data:/blob: (previews, receipts) and Cloudinary (logos, icons, photos);
 * - uploads go from the browser to Cloudinary's upload API;
 * - Razorpay Checkout: its script, its window (frames) and its API calls;
 * - the QR scanner runs its decoder in a blob: worker.
 * Next.js inlines small scripts and styles, hence 'unsafe-inline' (no nonces yet); dev adds eval and
 * the hot-reload socket.
 */
export const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com",
  "font-src 'self' data:",
  `connect-src 'self' https://api.cloudinary.com https://*.razorpay.com${dev ? ' ws: wss:' : ''}`,
  'frame-src https://api.razorpay.com https://checkout.razorpay.com',
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const config: NextConfig = {
  // A second build next to a running `next dev` (e.g. a production build for e2e runs) can use its own folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@fitexaa/ui', '@fitexaa/api-client'],
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Gym subdomains in development: powerhouse.localhost:3000, admin.localhost:3000 …
  allowedDevOrigins: ['*.localhost'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default config;
