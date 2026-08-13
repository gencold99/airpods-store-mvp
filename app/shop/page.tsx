import Link from 'next/link';
import type { Metadata } from 'next';
import { productRepository } from '@/lib/repositories';
import { resolveUnitPrice } from '@/lib/pricing';
import { formatMoney } from '@/lib/money';
import { businessConfig } from '@/lib/config';
import AddToCartButton from '@/app/components/AddToCartButton';

export const metadata: Metadata = {
	title: 'Каталог AirPods',
	description: 'Сравните модели AirPods и добавьте нужную конфигурацию в корзину.',
};

export default async function Shop() {
	const result = await productRepository.list();

	if (!result.ok) {
		return (
			<main className="container page-header" id="main" tabIndex={-1}>
				<div className="status error" role="alert">
					Не удалось загрузить каталог.
				</div>
			</main>
		);
	}

	const products = result.data;
	const hasPlaceholderPrices = products.some((product) => resolveUnitPrice(product, product.variants[0]).isPlaceholder);

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Catalog</div>
				<h1>Каталог AirPods</h1>
				<p className="lead">Сравните модели и выберите конфигурацию. Наличие и финальные цены подключаются через businessConfig.</p>
			</div>

			<p className="muted">Моделей в каталоге: {products.length}</p>
			{hasPlaceholderPrices ? <p className="status warn">{businessConfig.pricing.disclaimer}</p> : null}

			<div className="grid section" style={{ paddingTop: 20 }}>
				{products.map((product) => {
					const variant = product.variants[0];
					const { price } = resolveUnitPrice(product, variant);
					return (
						<article className="card product-card" key={product.id}>
							<Link href={`/products/${product.slug}`}>
								<div className="product-image" aria-hidden="true">
									{product.name.split(' ')[1]}
								</div>
								<h2>{product.name}</h2>
							</Link>
							<p className="muted">{product.tagline}</p>
							<span className="price">{formatMoney(price)}</span>
							<div className="hero-actions">
								<AddToCartButton productId={product.id} variantId={variant.id} productName={product.name} />
								<Link className="button secondary" href={`/products/${product.slug}`}>
									Подробнее<span className="visually-hidden"> о {product.name}</span>
								</Link>
							</div>
						</article>
					);
				})}
			</div>
		</main>
	);
}
