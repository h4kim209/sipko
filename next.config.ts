import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build mandiri untuk deployment VPS (PM2)
  output: 'standalone',
  // Paket Node-only: jangan di-bundle (Baileys punya optional deps seperti jimp)
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'pino',
    'sharp',
    'bullmq',
    'ioredis',
    '@prisma/client',
    'jspdf',
    'jspdf-autotable',
  ],
  poweredByHeader: false,
  // Server-side image optimization
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
