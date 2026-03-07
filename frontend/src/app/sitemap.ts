import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL || 'https://autoria-clone.vercel.app';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/autoria/ads/view`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/autoria/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ];
}
