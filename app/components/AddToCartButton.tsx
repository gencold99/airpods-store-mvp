'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { analytics } from '@/lib/analytics';

export default function AddToCartButton({
	productId,
	variantId,
	productName,
}: {
	productId: string;
	variantId: string;
	productName: string;
}) {
	const { dispatch } = useCart();
	const [added, setAdded] = useState(false);

	return (
		<button
			className="button primary"
			type="button"
			onClick={() => {
				dispatch({ type: 'add', productId, variantId, quantity: 1 });
				analytics.track({ name: 'add_to_cart', productId, variantId, quantity: 1 });
				setAdded(true);
			}}
		>
			{added ? 'Добавлено' : 'В корзину'}
			<span className="visually-hidden"> — {productName}</span>
		</button>
	);
}
