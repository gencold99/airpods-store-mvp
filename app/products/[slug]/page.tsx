import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { productRepository } from '@/lib/repositories';
import { businessConfig } from '@/lib/config';
import { formatPrice, resolveUnitPrice } from '@/lib/pricing';
import AddToCartForm from '@/app/components/AddToCartForm';
import ProductGallery from './ProductGallery';
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
	const initials = product.name.split(' ')[1] ?? product.name.slice(0, 3);
	const specs = Object.entries(product.specs).filter(
		(entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0,
	);

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header" style={{ paddingBottom: 16 }}>
				<div className="eyebrow">Каталог / {product.category}</div>
			</div>

			<div className="pdp">
				<ProductGallery name={product.name} initials={initials} slots={product.gallery} />

				<div className="card buy-box">
					<h1>{product.name}</h1>
					<p className="muted">{product.tagline}</p>
					<p className="price price-lg">{formatPrice(price)}</p>
					{mode === 'demo' ? <p className="status warn">{businessConfig.pricing.demoDisclaimer}</p> : null}
					<p className={inStock ? 'stock in' : 'stock out'}>{inStock ? 'В наличии' : 'Нет в наличии'}</p>

					{priceOnRequest ? (
						<>
							<p className="status info">{businessConfig.pricing.onRequestNote}</p>
							<a className="button primary" href="#price-request">
								{businessConfig.pricing.onRequestAction}
							</a>
						</>
					) : inStock ? (
						<AddToCartForm product={product} />
					) : (
						<p className="status warn">Модели нет в наличии, поэтому добавить её в корзину нельзя.</p>
					)}

					<ul className="reassurance">
						{businessConfig.trust.slice(0, 2).map((signal) => (
							<li key={signal.id}>
								<strong>{signal.title}</strong>
								<span className="muted"> {signal.text}</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			<section className="section" style={{ paddingTop: 32 }}>
				<h2>Ключевые преимущества</h2>
				{product.highlights.length > 0 ? (
					<ul className="benefit-list">
						{product.highlights.map((highlight) => (
							<li key={highlight}>{highlight}</li>
						))}
					</ul>
				) : (
					<div className="card">
						<p className="muted">
							Аргументы покупки появятся вместе с верифицированными товарными данными: мы не публикуем характеристики, которые не можем подтвердить.
						</p>
					</div>
				)}
			</section>

			<section className="section" style={{ paddingTop: 0 }}>
				<h2>Характеристики</h2>
				<div className="card">
					{specs.length > 0 ? (
						<ul className="spec-list">
							{specs.map(([key, value]) => (
								<li className="spec-row" key={key}>
									<span className="muted">{key}</span>
									<span>{value}</span>
								</li>
							))}
						</ul>
					) : (
						<p className="muted">Технические характеристики будут показаны только после верификации источника данных.</p>
					)}
				</div>
			</section>

			<section className="section" style={{ paddingTop: 0 }}>
				<h2>Доставка, оплата и гарантия</h2>
				<ul className="reassurance">
					{businessConfig.trust.map((signal) => (
						<li key={signal.id}>
							<strong>{signal.title}</strong>
							<span className="muted"> {signal.text}</span>
						</li>
					))}
					<li>
						<strong>{businessConfig.warranty.label}</strong>
						<span className="muted"> {businessConfig.warranty.description}</span>
					</li>
				</ul>
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
