import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [{ userAgent: '*', allow: '/', disallow: ['/cart', '/checkout', '/order/', '/admin'] }],
		sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
	};
}
