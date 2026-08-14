import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { productRepository } from '@/lib/repositories';
import { businessConfig } from '@/lib/config';
import { formatPrice, resolveUnitPrice } from '@/lib/pricing';
import AddToCartForm from '@/app/components/AddToCartForm';
import PriceRequestForm from './PriceRequestForm';

export async function generateStaticParams() {
	const result = await productRepository.list();
	return result.ok ? result.data.map((product) => ({ slug: product.slug })) : [];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
	const result = await productRepository.getBySlug(params.slug);
	if (!result.ok) return { title: 'Товар не найден' };
	return {
		title: result.data.name,
		description: result.data.tagline,
		alternates: { canonical: `/products/${result.data.slug}` },
		openGraph: { title: result.data.name, description: result.data.tagline, type: 'website' },
	};
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
	const result = await productRepository.getBySlug(params.slug);
	if (!result.ok) notFound();
	const product = result.data;
	const { price, mode } = resolveUnitPrice(product, product.variants[0]);
	const priceOnRequest = mode === 'on-request';
	const inStock = product.availability === 'available' && product.variants.some((variant) => variant.available);

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Product / {product.category}</div>
				<h1>{product.name}</h1>
				<p className="lead">{product.tagline}</p>
			</div>

			<section className="split section" style={{ paddingTop: 0 }}>
				<div className="hero-art" role="img" aria-label={`Слот изображения: ${product.name}`}>
					<span className="display">{product.name.split(' ')[1]}</span>
				</div>
				<div className="card">
					<p className="price">{formatPrice(price)}</p>
					{mode === 'demo' ? <p className="status warn">{businessConfig.pricing.demoDisclaimer}</p> : null}
					{priceOnRequest ? <p className="status info">{businessConfig.pricing.onRequestNote}</p> : null}

					<h2>Конфигурация и покупка</h2>
					{priceOnRequest ? (
						<a className="button primary" href="#price-request">
							{businessConfig.pricing.onRequestAction}
						</a>
					) : inStock ? (
						<AddToCartForm product={product} />
					) : (
						<p className="status warn">Модели нет в наличии, поэтому добавить её в корзину нельзя.</p>
					)}

					<hr />
					<h3>Доставка</h3>
					<p className="muted">
						{businessConfig.delivery.ufa.label}. {businessConfig.delivery.note}
					</p>
					<h3>{businessConfig.warranty.label}</h3>
					<p className="muted">{businessConfig.warranty.description}</p>
				</div>
			</section>

			<section className="section" style={{ paddingTop: 0 }}>
				<h2>Спецификация</h2>
				<div className="card">
					<p className="muted">Технические характеристики будут показаны только после верификации источника данных.</p>
				</div>
			</section>

			{priceOnRequest ? (
				<section className="section" id="price-request" style={{ paddingTop: 0 }}>
					<h2>{businessConfig.pricing.onRequestAction}</h2>
					<p className="muted">{businessConfig.pricing.onRequestNote}</p>
					<PriceRequestForm product={product} />
				</section>
			) : null}
		</main>
	);
}
