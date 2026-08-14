import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { businessConfig } from '@/lib/config';
import { money } from '@/lib/money';
import {
	HANDOFF_TTL_MS,
	HANDOFF_VERSION,
	ORDER_HANDOFF_KEY,
	createHandoffToken,
	saveLastOrder,
} from '@/lib/order/orderStorage';
import type { Order } from '@/lib/domain';
import ConfirmationClient from './ConfirmationClient';

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

type Envelope = Record<string, unknown>;

function seedEnvelope(overrides: Envelope = {}, now = Date.now()): void {
	const envelope: Envelope = {
		version: HANDOFF_VERSION,
		token: createHandoffToken(paidOrder.id),
		orderId: paidOrder.id,
		issuedAt: now,
		expiresAt: now + HANDOFF_TTL_MS,
		order: paidOrder,
		...overrides,
	};
	window.sessionStorage.setItem(ORDER_HANDOFF_KEY, JSON.stringify(envelope));
}

function orderWith(patch: Record<string, unknown>): Record<string, unknown> {
	return { ...(paidOrder as unknown as Record<string, unknown>), ...patch };
}

function expectNoConfirmation(): void {
	expect(screen.getByRole('heading', { name: 'Подтверждённого заказа нет' })).toBeInTheDocument();
	expect(screen.queryByText('Оплачено', { selector: '.badge' })).not.toBeInTheDocument();
}

afterEach(() => {
	cleanup();
	window.sessionStorage.clear();
});

describe('ConfirmationClient', () => {
	it('never confirms an order that was not paid in this session', () => {
		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('confirms an order handed off after a successful payment', () => {
		saveLastOrder(paidOrder);

		render(<ConfirmationClient />);

		expect(screen.getByRole('heading', { name: /Заказ BF-TEST подтверждён/ })).toBeInTheDocument();
		expect(screen.getByText('Оплачено', { selector: '.badge' })).toBeInTheDocument();
	});

	it('says the paid amount covers goods only while delivery is still pending', () => {
		saveLastOrder(paidOrder);

		render(<ConfirmationClient />);

		expect(screen.getByText('Оплачено за товары')).toBeInTheDocument();
		expect(screen.getByText(businessConfig.totals.deliveryValue)).toBeInTheDocument();
		expect(screen.getByText(businessConfig.totals.explanation)).toBeInTheDocument();
	});

	it('keeps the mock-payment disclaimer on the confirmation', () => {
		saveLastOrder(paidOrder);

		render(<ConfirmationClient />);

		expect(screen.getByText(businessConfig.payment.disclaimer)).toBeInTheDocument();
	});

	it('refuses a forged paid order written straight into storage without a token', () => {
		window.sessionStorage.setItem(ORDER_HANDOFF_KEY, JSON.stringify(paidOrder));

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('refuses an envelope without a handoff token', () => {
		seedEnvelope({ token: undefined });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('refuses a token issued for another order', () => {
		seedEnvelope({ token: createHandoffToken('BF-SOMEONE-ELSE') });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('refuses an order whose paid status was tampered with', () => {
		seedEnvelope({ order: orderWith({ status: 'pending' }) });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('refuses an order without a payment reference', () => {
		seedEnvelope({ order: orderWith({ paymentReference: '' }) });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('survives malformed lines without rendering a broken confirmation', () => {
		seedEnvelope({ order: orderWith({ lines: [{ name: 'AirPods A' }] }) });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('survives a malformed customer', () => {
		seedEnvelope({ order: orderWith({ customer: null }) });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('refuses a total that does not match the stored lines', () => {
		seedEnvelope({ order: orderWith({ total: money(1) }) });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('refuses broken JSON in storage', () => {
		window.sessionStorage.setItem(ORDER_HANDOFF_KEY, '{not json');

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('refuses an expired handoff', () => {
		const issuedAt = Date.now() - HANDOFF_TTL_MS - 1000;
		seedEnvelope({ issuedAt, expiresAt: issuedAt + HANDOFF_TTL_MS });

		render(<ConfirmationClient />);

		expectNoConfirmation();
	});

	it('consumes the handoff so the confirmation cannot be reopened', () => {
		saveLastOrder(paidOrder);

		render(<ConfirmationClient />);
		expect(screen.getByRole('heading', { name: /Заказ BF-TEST подтверждён/ })).toBeInTheDocument();
		expect(window.sessionStorage.getItem(ORDER_HANDOFF_KEY)).toBeNull();

		cleanup();
		render(<ConfirmationClient />);

		expectNoConfirmation();
	});
});
