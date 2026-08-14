import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';
import { productRepository } from '@/lib/repositories';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const result = await productRepository.list();
	const products = result.ok ? result.data : [];
	return [
		{ url: siteConfig.baseUrl, changeFrequency: 'weekly', priority: 1 },
		{ url: `${siteConfig.baseUrl}/shop`, changeFrequency: 'weekly', priority: 0.8 },
		...products.map((product) => ({
			url: `${siteConfig.baseUrl}/products/${product.slug}`,
			changeFrequency: 'weekly' as const,
			priority: 0.7,
		})),
	];
}
