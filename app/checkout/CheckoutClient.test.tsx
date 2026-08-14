import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CartProvider } from '@/lib/cart/CartProvider';
import { businessConfig } from '@/lib/config';
import { money } from '@/lib/money';
import { HANDOFF_VERSION, ORDER_HANDOFF_KEY } from '@/lib/order/orderStorage';
import type { Product } from '@/lib/domain';
import CheckoutClient from './CheckoutClient';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push, replace: push, refresh: vi.fn(), prefetch: vi.fn() }),
}));

const CART_KEY = 'bright-future.cart.v1';

const SUCCESS_CARD = '4111 1111 1111 1111';
const DECLINED_CARD = '4000 0000 0000 0002';

// 200 ₽ per unit keeps every total below 1000 and away from Intl grouping.
const product: Product = {
	id: 'first',
	slug: 'first',
	name: 'AirPods A',
	tagline: 'Тестовая модель',
	category: 'AirPods',
	image: null,
	gallery: [],
	highlights: [],
	price: money(20000),
	oldPrice: money(null),
	availability: 'available',
	variants: [{ id: 'standard', label: 'Стандартная версия', sku: 'SKU-first', price: money(20000), available: true }],
	specs: {},
};

const unpriced: Product = {
	...product,
	id: 'unpriced',
	slug: 'unpriced',
	name: 'AirPods Future',
	price: money(null),
	variants: [{ id: 'standard', label: 'Стандартная версия', sku: 'SKU-unpriced', price: money(null), available: true }],
};

function seedCart(quantity: number, productId = 'first'): void {
	window.localStorage.setItem(
		CART_KEY,
		JSON.stringify({ items: [{ productId, variantId: 'standard', quantity }], promoCode: null }),
	);
}

function renderCheckout(products: Product[] = [product]) {
	return render(
		<CartProvider>
			<CheckoutClient products={products} />
		</CartProvider>,
	);
}

function fillContactsAndCard(card: string): void {
	fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'buyer@example.com' } });
	fireEvent.change(screen.getByLabelText('Имя и фамилия'), { target: { value: 'Иван Иванов' } });
	fireEvent.change(screen.getByLabelText('Телефон'), { target: { value: '+7 999 000 00 00' } });
	fireEvent.change(screen.getByLabelText('Номер карты'), { target: { value: card } });
	fireEvent.change(screen.getByLabelText('Срок действия (ММ/ГГ)'), { target: { value: '12/29' } });
	fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
}

function pay(): void {
	fireEvent.click(screen.getByRole('button', { name: /Оплатить/ }));
}

beforeEach(() => {
	push.mockClear();
	window.localStorage.clear();
	window.sessionStorage.clear();
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	window.sessionStorage.clear();
});

describe('CheckoutClient', () => {
	it('refuses to open the payment step with an empty cart', () => {
		renderCheckout();

		expect(screen.getByRole('heading', { name: 'Оформлять пока нечего' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Оплатить/ })).not.toBeInTheDocument();
	});

	it('blocks payment until the contact details are valid', () => {
		seedCart(1);
		renderCheckout();

		pay();

		expect(screen.getByText('Укажите корректный email для подтверждения заказа.')).toBeInTheDocument();
		expect(push).not.toHaveBeenCalled();
		expect(window.sessionStorage.getItem(ORDER_HANDOFF_KEY)).toBeNull();
	});

	it('never offers payment for a line without a known price', () => {
		seedCart(1, 'unpriced');
		renderCheckout([unpriced]);

		expect(screen.getByRole('heading', { name: 'Итог пока нельзя посчитать' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Оплатить/ })).not.toBeInTheDocument();
	});

	it('states that the shown total covers goods only', () => {
		seedCart(1);
		renderCheckout();

		expect(screen.getByText(businessConfig.totals.goodsLabel)).toBeInTheDocument();
		expect(screen.getByText(businessConfig.totals.deliveryValue)).toBeInTheDocument();
		expect(screen.getByText(businessConfig.totals.explanation)).toBeInTheDocument();
	});

	it('shows an error and creates no order when the card is declined', async () => {
		seedCart(2);
		renderCheckout();
		fillContactsAndCard(DECLINED_CARD);

		pay();

		await waitFor(() => expect(screen.getByText(/Оплата не прошла/)).toBeInTheDocument(), { timeout: 5000 });

		expect(push).not.toHaveBeenCalled();
		expect(window.sessionStorage.getItem(ORDER_HANDOFF_KEY)).toBeNull();
		expect(screen.queryByText(/Оплата подтверждена/)).not.toBeInTheDocument();
	});

	it('hands off a paid order inside a tokenized envelope and only then moves to the confirmation', async () => {
		seedCart(2);
		renderCheckout();
		fillContactsAndCard(SUCCESS_CARD);

		pay();

		await waitFor(() => expect(push).toHaveBeenCalledWith('/order/confirmation'), { timeout: 5000 });

		const stored = window.sessionStorage.getItem(ORDER_HANDOFF_KEY);
		expect(stored).not.toBeNull();

		const envelope = JSON.parse(stored ?? '{}') as {
			version?: number;
			token?: string;
			orderId?: string;
			issuedAt?: number;
			expiresAt?: number;
			order?: {
				id?: string;
				status?: string;
				paymentReference?: string;
				deliveryCostStatus?: string;
				total?: { amount?: number };
			};
		};

		expect(envelope.version).toBe(HANDOFF_VERSION);
		expect(envelope.orderId).toBe(envelope.order?.id);
		expect(envelope.token?.startsWith(`${envelope.orderId ?? ''}.`)).toBe(true);
		expect((envelope.token ?? '').split('.')[1]?.length).toBeGreaterThanOrEqual(16);
		expect(envelope.expiresAt ?? 0).toBeGreaterThan(envelope.issuedAt ?? 0);
		expect(envelope.order?.status).toBe('paid');
		expect(envelope.order?.paymentReference).toMatch(/^PAY-BF-/);
		expect(envelope.order?.deliveryCostStatus).toBe('pending');
		expect(envelope.order?.total?.amount).toBe(40000);
		expect(screen.getByText(/Оплата подтверждена/)).toBeInTheDocument();
	});
});
