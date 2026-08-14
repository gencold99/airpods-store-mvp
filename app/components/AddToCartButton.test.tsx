import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CartProvider } from '@/lib/cart/CartProvider';
import AddToCartButton from './AddToCartButton';

afterEach(() => {
	cleanup();
	window.localStorage.clear();
});

describe('AddToCartButton', () => {
	it('names the product for assistive tech and confirms the addition in a live region', () => {
		render(
			<CartProvider>
				<AddToCartButton productId="airpods-4" variantId="standard" productName="AirPods 4" />
			</CartProvider>,
		);

		const button = screen.getByRole('button', { name: /AirPods 4/ });
		expect(button).toHaveTextContent('В корзину');
		expect(screen.getByRole('status')).toBeEmptyDOMElement();

		fireEvent.click(button);

		// The label must stay stable so the control never gets stuck in a "done" state.
		expect(screen.getByRole('button', { name: /AirPods 4/ })).toHaveTextContent('В корзину');
		expect(screen.getByRole('status')).toHaveTextContent('AirPods 4 в корзине');
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

	it('explains that a product without a price is sold on request', () => {
		render(
			<CartProvider>
				<AddToCartButton
					productId="airpods-pro"
					variantId="standard"
					productName="AirPods Pro"
					disabled
					reason="price-on-request"
				/>
			</CartProvider>,
		);

		const button = screen.getByRole('button', { name: /AirPods Pro/ });
		expect(button).toBeDisabled();
		expect(button).toHaveTextContent('Цена по запросу');
	});
});
