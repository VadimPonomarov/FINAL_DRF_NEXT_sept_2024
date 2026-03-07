import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${process.env.NEXTAUTH_URL || 'https://autoria-clone.vercel.app'}/sitemap.xml`,
  };
}
