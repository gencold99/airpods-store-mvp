'use client';

import Link from 'next/link';
import { useState } from 'react';
import AddToCartButton from '@/app/components/AddToCartButton';
import Overlay from '@/app/components/Overlay';
import { businessConfig } from '@/lib/config';

/**
 * Сериализуемая view-модель карточки. Цена форматируется на сервере: так Intl вызывается
 * один раз и нет риска hydration mismatch из-за разных сборок ICU.
 */
export type CatalogCardView = {
	id: string;
	slug: string;
	name: string;
	initials: string;
	tagline: string;
	category: string;
	priceLabel: string;
	priceOnRequest: boolean;
	inStock: boolean;
	purchasable: boolean;
	variantId: string | null;
	highlights: string[];
};

function PrimaryAction({ item }: { item: CatalogCardView }) {
	if (item.priceOnRequest) {
		return (
			<Link className="button primary" href={`/products/${item.slug}#price-request`}>
				{businessConfig.pricing.onRequestAction}
				<span className="visually-hidden"> — {item.name}</span>
			</Link>
		);
	}
	if (!item.variantId) return null;
	return (
		<AddToCartButton
			productId={item.id}
			variantId={item.variantId}
			productName={item.name}
			disabled={!item.purchasable}
		/>
	);
}

export default function CatalogGrid({ items }: { items: CatalogCardView[] }) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const active = items.find((item) => item.id === activeId) ?? null;

	return (
		<>
			<div className="grid catalog-grid">
				{items.map((item) => (
					<article className="card product-card" key={item.id}>
						<Link
							className="product-card-media"
							href={`/products/${item.slug}`}
							aria-label={`Открыть страницу товара: ${item.name}`}
						>
							<span className="product-image" aria-hidden="true">
								{item.initials}
							</span>
						</Link>
						<div className="product-card-body">
							<p className="eyebrow">{item.category}</p>
							<h2 className="product-card-title">
								<Link href={`/products/${item.slug}`}>{item.name}</Link>
							</h2>
							<p className="muted">{item.tagline}</p>
							<p className="price">{item.priceLabel}</p>
							<p className={item.inStock ? 'stock in' : 'stock out'}>{item.inStock ? 'В наличии' : 'Нет в наличии'}</p>
						</div>
						<div className="product-card-actions">
							<PrimaryAction item={item} />
							<button className="button secondary" type="button" onClick={() => setActiveId(item.id)}>
								Быстрый просмотр<span className="visually-hidden"> — {item.name}</span>
							</button>
						</div>
					</article>
				))}
			</div>

			{/* Quick view — это preview-слой, а не навигация: URL и фильтры остаются нетронутыми. */}
			<Overlay open={active !== null} onClose={() => setActiveId(null)} titleId="quick-view-title" variant="modal">
				{active ? (
					<div className="quick-view">
						<div className="quick-view-head">
							<div>
								<p className="eyebrow">{active.category}</p>
								<h2 id="quick-view-title">{active.name}</h2>
								<p className="muted">{active.tagline}</p>
							</div>
							<button className="link-button" type="button" onClick={() => setActiveId(null)}>
								Закрыть
							</button>
						</div>

						<div className="quick-view-media" role="img" aria-label={`Слот изображения: ${active.name}`}>
							<span aria-hidden="true">{active.initials}</span>
						</div>

						<div>
							<p className="price price-lg">{active.priceLabel}</p>
							<p className={active.inStock ? 'stock in' : 'stock out'}>
								{active.inStock ? 'В наличии' : 'Нет в наличии'}
							</p>
						</div>

						{active.highlights.length > 0 ? (
							<ul className="benefit-list">
								{active.highlights.map((highlight) => (
									<li key={highlight}>{highlight}</li>
								))}
							</ul>
						) : (
							<p className="muted" style={{ fontSize: 13 }}>
								Ключевые характеристики появятся вместе с товарными данными.
							</p>
						)}

						{active.priceOnRequest ? (
							<p className="status info">{businessConfig.pricing.onRequestNote}</p>
						) : null}

						<div className="quick-view-actions">
							<PrimaryAction item={active} />
							<Link className="button secondary" href={`/products/${active.slug}`}>
								Открыть страницу товара
							</Link>
						</div>
					</div>
				) : null}
			</Overlay>
		</>
	);
}
