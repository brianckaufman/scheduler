import type { NextConfig } from "next";

// Extract Supabase host for CSP (e.g., "arbhvqurgaowcddvcxqx.supabase.co")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseHost = '';
try {
  supabaseHost = new URL(supabaseUrl).host;
} catch {
  // fallback if env not set at build time
}

const nextConfig: NextConfig = {
  async headers() {
    // Build connect-src with both wildcard and specific host for maximum compatibility
    const connectSrc = [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.supabase.com',
      'wss://*.supabase.com',
      // Add the specific project host (some browsers need exact match)
      ...(supabaseHost ? [`https://${supabaseHost}`, `wss://${supabaseHost}`] : []),
    ].join(' ');

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              `connect-src ${connectSrc} https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com`,
              "img-src 'self' data: blob: https://www.googletagmanager.com https://www.google-analytics.com https://*.supabase.co https://*.supabase.com",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
