'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { analytics } from '@/lib/analytics';

/** Почему кнопка недоступна — от этого зависит и подпись, и то, что делать дальше. */
export type AddToCartBlockReason = 'out-of-stock' | 'price-on-request';

export default function AddToCartButton({
	productId,
	variantId,
	productName,
	disabled = false,
	reason = 'out-of-stock',
}: {
	productId: string;
	variantId: string;
	productName: string;
	disabled?: boolean;
	reason?: AddToCartBlockReason;
}) {
	const { dispatch } = useCart();
	const [added, setAdded] = useState(false);

	// Подпись кнопки не мигает между состояниями: подтверждение живёт в отдельном live-region,
	// поэтому кнопка не «залипает» и остаётся доступной для повторного добавления.
	const label = disabled ? (reason === 'price-on-request' ? 'Цена по запросу' : 'Нет в наличии') : 'В корзину';

	return (
		<>
			<button
				className="button primary"
				type="button"
				disabled={disabled}
				onClick={() => {
					if (disabled) return;
					dispatch({ type: 'add', productId, variantId, quantity: 1 });
					analytics.track({ name: 'add_to_cart', productId, variantId, quantity: 1 });
					setAdded(true);
				}}
			>
				{label}
				<span className="visually-hidden"> — {productName}</span>
			</button>
			<p className="added-hint" role="status" aria-live="polite">
				{added ? (
					<>
						{productName} в корзине.{' '}
						<Link className="link-button" href="/cart">
							Перейти в корзину
						</Link>
					</>
				) : null}
			</p>
		</>
	);
}
