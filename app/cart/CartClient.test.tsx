import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CartProvider } from '@/lib/cart/CartProvider';
import { money } from '@/lib/money';
import type { Product } from '@/lib/domain';
import CartClient from './CartClient';

const CART_KEY = 'bright-future.cart.v1';

// 200 ₽ per unit. Every total in this file stays below 1000 so the assertions
// do not depend on how Intl groups thousands.
const product: Product = {
	id: 'first',
	slug: 'first',
	name: 'AirPods A',
	tagline: 'Тестовая модель',
	category: 'AirPods',
	image: null,
	price: money(20000),
	oldPrice: money(null),
	availability: 'available',
	variants: [{ id: 'standard', label: 'Стандартная версия', sku: 'SKU-first', price: money(20000), available: true }],
	specs: {},
};

function seedCart(quantity: number): void {
	window.localStorage.setItem(
		CART_KEY,
		JSON.stringify({ items: [{ productId: 'first', variantId: 'standard', quantity }], promoCode: null }),
	);
}

function renderCart() {
	return render(
		<CartProvider>
			<CartClient products={[product]} />
		</CartProvider>,
	);
}

function summaryRow(label: string): HTMLElement {
	const row = screen.getByText(label).closest('.summary-row');
	if (!(row instanceof HTMLElement)) throw new Error(`Summary row "${label}" was not rendered`);
	return row;
}

function applyPromo(code: string): void {
	fireEvent.change(screen.getByLabelText('Промокод'), { target: { value: code } });
	fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
}

beforeEach(() => {
	window.localStorage.clear();
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
});

describe('CartClient', () => {
	it('shows the empty state when there is nothing to buy', () => {
		renderCart();

		expect(screen.getByRole('heading', { name: 'Корзина пока пуста' })).toBeInTheDocument();
	});

	it('recalculates the total when the quantity changes', () => {
		seedCart(2);
		renderCart();

		expect(summaryRow('Итого')).toHaveTextContent('400');

		fireEvent.change(screen.getByLabelText(/Количество/), { target: { value: '3' } });

		expect(summaryRow('Итого')).toHaveTextContent('600');
	});

	it('applies a valid promo code and reduces the total', () => {
		seedCart(2);
		renderCart();

		applyPromo('bright10');

		expect(screen.getByText(/Промокод BRIGHT10 применён/)).toBeInTheDocument();
		expect(summaryRow('Скидка')).toHaveTextContent('40');
		expect(summaryRow('Итого')).toHaveTextContent('360');
	});

	it('rejects an unknown promo code and leaves the total untouched', () => {
		seedCart(1);
		renderCart();

		applyPromo('nope');

		expect(screen.getByText(/не найден/)).toBeInTheDocument();
		expect(summaryRow('Итого')).toHaveTextContent('200');
	});

	it('falls back to the empty state after the last line is removed', () => {
		seedCart(1);
		renderCart();

		fireEvent.click(screen.getByRole('button', { name: /Удалить/ }));

		expect(screen.getByRole('heading', { name: 'Корзина пока пуста' })).toBeInTheDocument();
	});
});
