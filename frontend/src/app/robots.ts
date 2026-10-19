import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://coptic-church.org');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/schedule',
          '/sermons',
          '/ministries',
          '/donations',
          '/about',
          '/contact',
          '/og-banner.png',
          '/logo.png',
          '/favicon.ico',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/login',
          '/register-member',
          '/api/*',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
