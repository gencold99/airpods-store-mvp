import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CartProvider } from '@/lib/cart/CartProvider';
import AddToCartButton from './AddToCartButton';

afterEach(() => {
	cleanup();
	window.localStorage.clear();
});

describe('AddToCartButton', () => {
	it('names the product for assistive tech and confirms the addition', () => {
		render(
			<CartProvider>
				<AddToCartButton productId="airpods-4" variantId="standard" productName="AirPods 4" />
			</CartProvider>,
		);

		const button = screen.getByRole('button', { name: /AirPods 4/ });
		expect(button).toHaveTextContent('В корзину');

		fireEvent.click(button);

		expect(screen.getByRole('button', { name: /AirPods 4/ })).toHaveTextContent('Добавлено');
	});

	it('cannot be used for an out-of-stock product', () => {
		render(
			<CartProvider>
				<AddToCartButton productId="airpods-max" variantId="standard" productName="AirPods Max" disabled />
			</CartProvider>,
		);

		const button = screen.getByRole('button', { name: /AirPods Max/ });
		expect(button).toBeDisabled();
		expect(button).toHaveTextContent('Нет в наличии');
	});
});
