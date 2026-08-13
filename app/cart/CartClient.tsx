'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { summarizeCart } from '@/lib/pricing';
import { formatMoney } from '@/lib/money';
import { businessConfig } from '@/lib/config';
import { analytics } from '@/lib/analytics';
import type { Product } from '@/lib/domain';

export default function CartClient({ products }: { products: Product[] }) {
	const { state, dispatch, hydrated } = useCart();
	const summary = useMemo(() => summarizeCart(state, products), [state, products]);
	const [promoInput, setPromoInput] = useState('');

	useEffect(() => {
		if (hydrated) analytics.track({ name: 'view_cart', itemCount: summary.itemCount });
	}, [hydrated, summary.itemCount]);

	if (!hydrated) {
		return (
			<div className="card">
				<p className="muted" role="status">
					Загружаем корзину…
				</p>
			</div>
		);
	}

	if (summary.lines.length === 0) {
		return (
			<div className="card">
				<h2>Корзина пока пуста</h2>
				<p className="muted">Добавьте товар из каталога, чтобы продолжить.</p>
				<Link className="button primary" href="/shop">
					Перейти в каталог
				</Link>
			</div>
		);
	}

	const promoStatusClass =
		summary.promo.status === 'valid' ? 'ok' : summary.promo.status === 'expired' ? 'warn' : summary.promo.status === 'invalid' ? 'error' : 'info';

	return (
		<div className="layout-2col">
			<section className="card" aria-labelledby="cart-items-heading">
				<h2 id="cart-items-heading">Товары в корзине</h2>
				<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
					{summary.lines.map((line) => (
						<li className="line-item" key={`${line.productId}:${line.variantId}`}>
							<span className="thumb" aria-hidden="true">
								{line.name.split(' ')[1] ?? 'A'}
							</span>
							<div>
								<Link href={`/products/${line.slug}`}>
									<strong>{line.name}</strong>
								</Link>
								<p className="muted" style={{ margin: '4px 0' }}>
									{line.variantLabel} · {formatMoney(line.unitPrice)} за шт.
								</p>
								<div className="qty">
									<label className="visually-hidden" htmlFor={`qty-${line.productId}-${line.variantId}`}>
										Количество: {line.name}
									</label>
									<input
										id={`qty-${line.productId}-${line.variantId}`}
										type="number"
										inputMode="numeric"
										min={1}
										max={businessConfig.cart.maxQuantityPerLine}
										value={line.quantity}
										onChange={(event) =>
											dispatch({
												type: 'setQuantity',
												productId: line.productId,
												variantId: line.variantId,
												quantity: Number(event.target.value),
											})
										}
									/>
									<button
										className="link-button"
										type="button"
										onClick={() => dispatch({ type: 'remove', productId: line.productId, variantId: line.variantId })}
									>
										Удалить<span className="visually-hidden"> {line.name}</span>
									</button>
								</div>
							</div>
							<strong>{formatMoney(line.lineTotal)}</strong>
						</li>
					))}
				</ul>
			</section>

			<aside className="card summary" aria-labelledby="cart-summary-heading">
				<h2 id="cart-summary-heading">Итог заказа</h2>

				<form
					className="promo-form"
					onSubmit={(event) => {
						event.preventDefault();
						dispatch({ type: 'applyPromo', code: promoInput });
					}}
				>
					<div className="field">
						<label htmlFor="promo">Промокод</label>
						<input
							id="promo"
							name="promo"
							value={promoInput}
							onChange={(event) => setPromoInput(event.target.value)}
							autoComplete="off"
							aria-describedby="promo-status"
						/>
					</div>
					<button className="button secondary" type="submit">
						Применить
					</button>
				</form>

				<p className={`status ${promoStatusClass}`} id="promo-status" role="status" aria-live="polite">
					{summary.promo.status === 'idle' ? 'Промокод не применён.' : summary.promo.message}
				</p>
				{state.promoCode ? (
					<button className="link-button" type="button" onClick={() => dispatch({ type: 'removePromo' })}>
						Убрать промокод
					</button>
				) : null}

				<div style={{ height: 12 }} />
				<div className="summary-row">
					<span>Товары ({summary.itemCount})</span>
					<span>{formatMoney(summary.subtotal)}</span>
				</div>
				<div className="summary-row">
					<span>Скидка</span>
					<span>−{formatMoney(summary.discount, '0 ₽')}</span>
				</div>
				<div className="summary-row">
					<span>Доставка</span>
					<span>Уточняется</span>
				</div>
				<div className="summary-row total">
					<span>Итого</span>
					<span>{formatMoney(summary.total)}</span>
				</div>

				<p className="muted" style={{ fontSize: 13 }}>
					{businessConfig.delivery.note}
				</p>
				{summary.hasPlaceholderPrices ? (
					<p className="status warn">{businessConfig.pricing.disclaimer}</p>
				) : null}

				<Link className="button accent" href="/checkout">
					Перейти к оформлению
				</Link>
				<div style={{ height: 10 }} />
				<Link className="button secondary" href="/shop">
					Продолжить покупки
				</Link>
			</aside>
		</div>
	);
}
