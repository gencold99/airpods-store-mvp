import { afterEach, describe, expect, it } from 'vitest';
import { money } from '@/lib/money';
import type { Order } from '@/lib/domain';
import {
	HANDOFF_TTL_MS,
	HANDOFF_VERSION,
	LEGACY_ORDER_KEY,
	ORDER_HANDOFF_KEY,
	clearLastOrder,
	consumeConfirmationHandoff,
	createHandoffToken,
	isTokenBoundTo,
	parseOrder,
	readConfirmationHandoff,
	saveLastOrder,
} from './orderStorage';

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
			quantity: 2,
			unitPrice: money(20000),
			lineTotal: money(40000),
		},
	],
	subtotal: money(40000),
	discount: money(0),
	total: money(40000),
	promoCode: null,
	deliveryOptionId: 'ufa-courier',
	deliveryLabel: 'Курьерская доставка по Уфе',
	deliveryCostStatus: 'pending',
	status: 'paid',
	paymentReference: 'PAY-BF-TEST',
	pricingIsDemo: false,
};

type Envelope = {
	version?: unknown;
	token?: unknown;
	orderId?: unknown;
	issuedAt?: unknown;
	expiresAt?: unknown;
	order?: unknown;
};

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

afterEach(() => {
	window.sessionStorage.clear();
});

describe('order handoff token', () => {
	it('binds the token to the order it was issued for', () => {
		const token = createHandoffToken('BF-ABC');

		expect(isTokenBoundTo(token, 'BF-ABC')).toBe(true);
		expect(isTokenBoundTo(token, 'BF-OTHER')).toBe(false);
		expect(isTokenBoundTo('BF-ABC.short', 'BF-ABC')).toBe(false);
		expect(isTokenBoundTo('BF-ABC', 'BF-ABC')).toBe(false);
	});

	it('saves a paid order inside a versioned envelope and drops the legacy record', () => {
		window.sessionStorage.setItem(LEGACY_ORDER_KEY, JSON.stringify(paidOrder));

		const token = saveLastOrder(paidOrder);
		expect(token).not.toBeNull();
		expect(window.sessionStorage.getItem(LEGACY_ORDER_KEY)).toBeNull();

		const result = readConfirmationHandoff();
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.handoff.token).toBe(token);
			expect(result.handoff.order.id).toBe('BF-TEST');
			expect(result.handoff.order.total.amount).toBe(40000);
		}
	});
});

describe('readConfirmationHandoff', () => {
	it('reports a missing record when nothing was stored', () => {
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'missing' });
	});

	it('rejects a forged paid order written without a handoff envelope', () => {
		window.sessionStorage.setItem(ORDER_HANDOFF_KEY, JSON.stringify(paidOrder));

		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });
	});

	it('rejects an envelope whose token was removed or re-pointed', () => {
		seedEnvelope({ token: undefined });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'token-mismatch' });

		seedEnvelope({ token: createHandoffToken('BF-SOMEONE-ELSE') });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'token-mismatch' });

		seedEnvelope({ orderId: 'BF-SOMEONE-ELSE' });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'token-mismatch' });
	});

	it('rejects an unpaid or unreferenced order even inside a valid envelope', () => {
		seedEnvelope({ order: orderWith({ status: 'pending' }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'unpaid' });

		seedEnvelope({ order: orderWith({ paymentReference: '' }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'unpaid' });
	});

	it('rejects malformed lines', () => {
		seedEnvelope({ order: orderWith({ lines: [] }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ lines: 'AirPods A' }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ lines: [{ ...paidOrder.lines[0], quantity: 0 }] }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ lines: [{ ...paidOrder.lines[0], lineTotal: money(1) }] }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ lines: [{ ...paidOrder.lines[0], unitPrice: money(null) }] }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });
	});

	it('rejects a malformed customer', () => {
		seedEnvelope({ order: orderWith({ customer: null }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ customer: { ...paidOrder.customer, email: '' } }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ customer: { ...paidOrder.customer, phone: 42 } }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });
	});

	it('rejects totals that do not add up', () => {
		seedEnvelope({ order: orderWith({ total: money(1) }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ subtotal: money(90000) }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ discount: money(90000) }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ total: { amount: '40000', currency: 'RUB' } }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ order: orderWith({ total: money(null) }) });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });
	});

	it('rejects broken JSON and unknown envelope versions', () => {
		window.sessionStorage.setItem(ORDER_HANDOFF_KEY, '{oops');
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ version: 1 });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });

		seedEnvelope({ expiresAt: undefined });
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'malformed' });
	});

	it('rejects an expired handoff', () => {
		const issuedAt = Date.now() - HANDOFF_TTL_MS - 1000;
		seedEnvelope({ issuedAt, expiresAt: issuedAt + HANDOFF_TTL_MS });

		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'expired' });
	});

	it('rejects a handoff issued far in the future', () => {
		const issuedAt = Date.now() + HANDOFF_TTL_MS * 10;
		seedEnvelope({ issuedAt, expiresAt: issuedAt + HANDOFF_TTL_MS });

		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'expired' });
	});
});

describe('consumeConfirmationHandoff', () => {
	it('makes the handoff single-use', () => {
		const token = saveLastOrder(paidOrder);
		expect(token).not.toBeNull();

		expect(readConfirmationHandoff().ok).toBe(true);
		expect(consumeConfirmationHandoff(token ?? '')).toBe(true);

		expect(window.sessionStorage.getItem(ORDER_HANDOFF_KEY)).toBeNull();
		expect(readConfirmationHandoff()).toEqual({ ok: false, reason: 'missing' });
		expect(consumeConfirmationHandoff(token ?? '')).toBe(false);
	});

	it('never lets a foreign token consume the record', () => {
		saveLastOrder(paidOrder);

		expect(consumeConfirmationHandoff(createHandoffToken(paidOrder.id))).toBe(false);
		expect(readConfirmationHandoff().ok).toBe(true);
	});

	it('clears both the current and the legacy record', () => {
		saveLastOrder(paidOrder);
		window.sessionStorage.setItem(LEGACY_ORDER_KEY, JSON.stringify(paidOrder));

		clearLastOrder();

		expect(window.sessionStorage.getItem(ORDER_HANDOFF_KEY)).toBeNull();
		expect(window.sessionStorage.getItem(LEGACY_ORDER_KEY)).toBeNull();
	});
});

describe('parseOrder', () => {
	it('accepts a well-formed paid order', () => {
		expect(parseOrder(JSON.parse(JSON.stringify(paidOrder)))).not.toBeNull();
	});

	it('refuses primitives, arrays and partial shapes', () => {
		expect(parseOrder('BF-TEST')).toBeNull();
		expect(parseOrder(null)).toBeNull();
		expect(parseOrder([paidOrder])).toBeNull();
		expect(parseOrder({ id: 'BF-TEST', status: 'paid' })).toBeNull();
		expect(parseOrder(orderWith({ createdAt: 'not-a-date' }))).toBeNull();
		expect(parseOrder(orderWith({ deliveryCostStatus: 'free' }))).toBeNull();
		expect(parseOrder(orderWith({ pricingIsDemo: 'false' }))).toBeNull();
		expect(parseOrder(orderWith({ promoCode: 7 }))).toBeNull();
	});
});
