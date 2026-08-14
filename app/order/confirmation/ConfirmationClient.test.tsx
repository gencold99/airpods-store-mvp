import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { businessConfig } from '@/lib/config';
import { money } from '@/lib/money';
import type { Order } from '@/lib/domain';
import ConfirmationClient from './ConfirmationClient';

const ORDER_KEY = 'bright-future.last-order.v1';

const paidOrder: Order = {
	id: 'BF-TEST',
	createdAt: '2026-08-14T00:00:00.000Z',
	customer: { email: 'buyer@example.com', name: 'Иван Иванов', phone: '+7 999 000 00 00', city: 'Уфа' },
	lines: [
		{
			productId: 'first',
			variantId: 'standard',
			name: 'AirPods A',
			variantLabel: 'Стандартная версия',
			quantity: 1,
			unitPrice: money(20000),
			lineTotal: money(20000),
		},
	],
	subtotal: money(20000),
	discount: money(0),
	total: money(20000),
	promoCode: null,
	deliveryOptionId: 'ufa-courier',
	deliveryLabel: 'Курьерская доставка по Уфе',
	deliveryCostStatus: 'pending',
	status: 'paid',
	paymentReference: 'PAY-BF-TEST',
	pricingIsDemo: false,
};

afterEach(() => {
	cleanup();
	window.sessionStorage.clear();
});

describe('ConfirmationClient', () => {
	it('never confirms an order that was not paid in this session', () => {
		render(<ConfirmationClient />);

		expect(screen.getByRole('heading', { name: 'Подтверждённого заказа нет' })).toBeInTheDocument();
		expect(screen.queryByText('Оплачено')).not.toBeInTheDocument();
	});

	it('confirms an order that carries a successful payment reference', () => {
		window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(paidOrder));

		render(<ConfirmationClient />);

		expect(screen.getByRole('heading', { name: /Заказ BF-TEST подтверждён/ })).toBeInTheDocument();
		expect(screen.getByText('Оплачено', { selector: '.badge' })).toBeInTheDocument();
	});

	it('says the paid amount covers goods only while delivery is still pending', () => {
		window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(paidOrder));

		render(<ConfirmationClient />);

		expect(screen.getByText('Оплачено за товары')).toBeInTheDocument();
		expect(screen.getByText(businessConfig.totals.deliveryValue)).toBeInTheDocument();
	});

	it('refuses an order whose paid status was tampered with', () => {
		window.sessionStorage.setItem(ORDER_KEY, JSON.stringify({ ...paidOrder, status: 'pending' }));

		render(<ConfirmationClient />);

		expect(screen.getByRole('heading', { name: 'Подтверждённого заказа нет' })).toBeInTheDocument();
	});

	it('refuses an order without a payment reference', () => {
		window.sessionStorage.setItem(ORDER_KEY, JSON.stringify({ ...paidOrder, paymentReference: '' }));

		render(<ConfirmationClient />);

		expect(screen.getByRole('heading', { name: 'Подтверждённого заказа нет' })).toBeInTheDocument();
	});
});
