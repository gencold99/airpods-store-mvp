'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { analytics } from '@/lib/analytics';
import { businessConfig } from '@/lib/config';
import type { Product } from '@/lib/domain';

const MAX = businessConfig.cart.maxQuantityPerLine;

export default function AddToCartForm({ product }: { product: Product }) {
	const { dispatch } = useCart();
	const variantId = useId();
	const quantityId = useId();
	const [variant, setVariant] = useState(product.variants[0]?.id ?? 'standard');
	const [quantity, setQuantity] = useState(1);
	const [message, setMessage] = useState('');

	function onQuantityChange(raw: string) {
		const parsed = Number.parseInt(raw, 10);
		// Пустое или мусорное значение не должно превращать количество в NaN.
		if (!Number.isFinite(parsed)) {
			setQuantity(1);
			return;
		}
		setQuantity(Math.min(Math.max(parsed, 1), MAX));
	}

	function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		dispatch({ type: 'add', productId: product.id, variantId: variant, quantity });
		analytics.track({ name: 'add_to_cart', productId: product.id, variantId: variant, quantity });
		setMessage(`${product.name} добавлен в корзину: ${quantity} шт.`);
	}

	return (
		<form className="form" onSubmit={onSubmit}>
			<div className="field">
				<label htmlFor={variantId}>Конфигурация</label>
				<select id={variantId} value={variant} onChange={(event) => setVariant(event.target.value)}>
					{product.variants.map((item) => (
						<option key={item.id} value={item.id}>
							{item.label}
						</option>
					))}
				</select>
			</div>
			<div className="field">
				<label htmlFor={quantityId}>Количество</label>
				<input
					id={quantityId}
					type="number"
					inputMode="numeric"
					min={1}
					max={MAX}
					value={quantity}
					onChange={(event) => onQuantityChange(event.target.value)}
				/>
			</div>
			<button className="button primary" type="submit">
				Добавить в корзину
			</button>
			<p className="status info" role="status" aria-live="polite">
				{message || 'Товар можно оформить как гость, без регистрации.'}
			</p>
			{message ? (
				<Link className="button secondary" href="/cart">
					Перейти в корзину
				</Link>
			) : null}
		</form>
	);
}
