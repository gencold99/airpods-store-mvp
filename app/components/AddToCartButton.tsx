'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { analytics } from '@/lib/analytics';

export default function AddToCartButton({
	productId,
	variantId,
	productName,
	disabled = false,
}: {
	productId: string;
	variantId: string;
	productName: string;
	disabled?: boolean;
}) {
	const { dispatch } = useCart();
	const [added, setAdded] = useState(false);

	return (
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
			{disabled ? 'Нет в наличии' : added ? 'Добавлено' : 'В корзину'}
			<span className="visually-hidden"> — {productName}</span>
		</button>
	);
}
