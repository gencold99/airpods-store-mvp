import Link from 'next/link';
import type { Metadata } from 'next';
import { productRepository } from '@/lib/repositories';
import { businessConfig } from '@/lib/config';
import { formatPrice } from '@/lib/pricing';
import {
	applyCatalogQuery,
	isCatalogQueryActive,
	listCategories,
	parseCatalogQuery,
	type RawSearchParams,
} from '@/lib/catalog/query';
import CatalogControls from './CatalogControls';
import CatalogGrid, { type CatalogCardView } from './CatalogGrid';

export const metadata: Metadata = {
	title: 'Каталог AirPods',
	description: 'Сравните модели AirPods, отфильтруйте по категории и наличию и добавьте нужную конфигурацию в корзину.',
	alternates: { canonical: '/shop' },
};

export default async function Shop({ searchParams }: { searchParams?: RawSearchParams }) {
	const result = await productRepository.list();

	if (!result.ok) {
		return (
			<main className="container page-header" id="main" tabIndex={-1}>
				<div className="status error" role="alert">
					Не удалось загрузить каталог. Обновите страницу.
				</div>
			</main>
		);
	}

	const products = result.data;
	const query = parseCatalogQuery(searchParams);
	const items = applyCatalogQuery(products, query);
	const categories = listCategories(products);
	const hasDemoPrices = items.some((item) => item.priceMode === 'demo');
	const hasOnRequestPrices = items.some((item) => item.priceMode === 'on-request');

	// Цена форматируется на сервере: в клиент уезжает готовая строка, а не Intl-вызов.
	const cards: CatalogCardView[] = items.map((item) => ({
		id: item.product.id,
		slug: item.product.slug,
		name: item.product.name,
		initials: item.product.name.split(' ')[1] ?? item.product.name.slice(0, 3),
		tagline: item.product.tagline,
		category: item.product.category,
		priceLabel: formatPrice(item.price),
		priceOnRequest: item.priceMode === 'on-request',
		inStock: item.inStock,
		purchasable: item.purchasable,
		variantId: item.product.variants[0]?.id ?? null,
		highlights: item.product.highlights.slice(0, 3),
	}));

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Catalog</div>
				<h1>Каталог AirPods</h1>
				<p className="lead">Сравните модели и выберите конфигурацию.</p>
			</div>

			<CatalogControls query={query} categories={categories} resultCount={items.length} />

			{hasDemoPrices ? <p className="status warn">{businessConfig.pricing.demoDisclaimer}</p> : null}
			{hasOnRequestPrices ? <p className="status info">{businessConfig.pricing.onRequestNote}</p> : null}

			{cards.length === 0 ? (
				<div className="card">
					<h2>Ничего не найдено</h2>
					<p className="muted">
						По выбранным условиям товаров нет. Измените запрос или сбросьте фильтры, чтобы увидеть весь каталог.
					</p>
					{isCatalogQueryActive(query) ? (
						<Link className="button primary" href="/shop">
							Сбросить фильтры
						</Link>
					) : null}
				</div>
			) : (
				<CatalogGrid items={cards} />
			)}
		</main>
	);
}
