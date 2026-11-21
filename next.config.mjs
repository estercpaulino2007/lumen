/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];
import path from 'path';
export default {
  webpack(config) { config.resolve.alias['@'] = path.resolve(process.cwd()); return config; },
  serverExternalPackages: ['pdfjs-dist', 'iovalkey', 'bcryptjs'],
  async headers() { return [{ source: '/:path*', headers: securityHeaders }]; },
};
