import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://coptic-church.org');

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString();

  return [
    {
      url: `${SITE_URL}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          ar: `${SITE_URL}`,
          en: `${SITE_URL}?lang=en`,
        },
      },
    },
    {
      url: `${SITE_URL}/schedule`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          ar: `${SITE_URL}/schedule`,
          en: `${SITE_URL}/schedule?lang=en`,
        },
      },
    },
    {
      url: `${SITE_URL}/sermons`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          ar: `${SITE_URL}/sermons`,
          en: `${SITE_URL}/sermons?lang=en`,
        },
      },
    },
    {
      url: `${SITE_URL}/ministries`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          ar: `${SITE_URL}/ministries`,
          en: `${SITE_URL}/ministries?lang=en`,
        },
      },
    },
    {
      url: `${SITE_URL}/donations`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          ar: `${SITE_URL}/donations`,
          en: `${SITE_URL}/donations?lang=en`,
        },
      },
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          ar: `${SITE_URL}/about`,
          en: `${SITE_URL}/about?lang=en`,
        },
      },
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: {
        languages: {
          ar: `${SITE_URL}/contact`,
          en: `${SITE_URL}/contact?lang=en`,
        },
      },
    },
  ];
}
