import Link from 'next/link';
import type { Metadata } from 'next';
import { productRepository } from '@/lib/repositories';
import { businessConfig } from '@/lib/config';
import { formatPrice } from '@/lib/pricing';
import AddToCartButton from '@/app/components/AddToCartButton';
import {
	applyCatalogQuery,
	isCatalogQueryActive,
	listCategories,
	parseCatalogQuery,
	type RawSearchParams,
} from '@/lib/catalog/query';
import CatalogControls from './CatalogControls';

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

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Catalog</div>
				<h1>Каталог AirPods</h1>
				<p className="lead">Сравните модели и выберите конфигурацию.</p>
			</div>

			<CatalogControls query={query} categories={categories} />

			<p className="muted" role="status" aria-live="polite">
				Найдено моделей: {items.length} из {products.length}
			</p>
			{hasDemoPrices ? <p className="status warn">{businessConfig.pricing.demoDisclaimer}</p> : null}
			{hasOnRequestPrices ? <p className="status info">{businessConfig.pricing.onRequestNote}</p> : null}

			{items.length === 0 ? (
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
				<div className="grid section" style={{ paddingTop: 20 }}>
					{items.map((item) => {
						const { product, price, priceMode, inStock, purchasable } = item;
						const variant = product.variants[0];
						return (
							<article className="card product-card" key={product.id}>
								<Link href={`/products/${product.slug}`}>
									<div className="product-image" aria-hidden="true">
										{product.name.split(' ')[1]}
									</div>
									<h2>{product.name}</h2>
								</Link>
								<p className="muted">{product.tagline}</p>
								<span className="price">{formatPrice(price)}</span>
								{inStock ? null : <p className="muted">Нет в наличии</p>}
								<div className="hero-actions">
									{priceMode === 'on-request' ? (
										<Link className="button primary" href={`/products/${product.slug}#price-request`}>
											{businessConfig.pricing.onRequestAction}
											<span className="visually-hidden"> — {product.name}</span>
										</Link>
									) : variant ? (
										<AddToCartButton
											productId={product.id}
											variantId={variant.id}
											productName={product.name}
											disabled={!purchasable}
										/>
									) : null}
									<Link className="button secondary" href={`/products/${product.slug}`}>
										Подробнее<span className="visually-hidden"> о {product.name}</span>
									</Link>
								</div>
							</article>
						);
					})}
				</div>
			)}
		</main>
	);
}
