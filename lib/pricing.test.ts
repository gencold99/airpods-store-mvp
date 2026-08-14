import { describe, expect, it } from 'vitest';
import { formatPrice, summarizeCart } from './pricing';
import { money } from './money';
import { businessConfig } from './config';
import type { CartState } from './cart/cartReducer';
import type { Product } from './domain';

const NOW = new Date('2026-08-14T00:00:00.000Z');

function makeProduct(id: string, name: string, price: number | null): Product {
	return {
		id,
		slug: id,
		name,
		tagline: '',
		category: 'AirPods',
		image: null,
		gallery: [],
		highlights: [],
		price: money(price),
		oldPrice: money(null),
		availability: 'available',
		variants: [{ id: 'standard', label: 'Стандартная версия', sku: `SKU-${id}`, price: money(price), available: true }],
		specs: {},
	};
}

// 1 490 ₽ and 2 290 ₽ expressed in kopecks.
const first = makeProduct('first', 'AirPods A', 149000);
const second = makeProduct('second', 'AirPods B', 229000);
const unpriced = makeProduct('unpriced', 'AirPods Future', null);

function cart(items: CartState['items'], promoCode: string | null = null): CartState {
	return { items, promoCode };
}

describe('formatPrice', () => {
	it('renders an unknown amount as a price on request instead of a number', () => {
		expect(formatPrice(money(null))).toBe(businessConfig.pricing.onRequestLabel);
		expect(formatPrice(money(149000))).toMatch(/149/);
	});
});

describe('summarizeCart', () => {
	it('multiplies unit price by quantity and totals every line', () => {
		const summary = summarizeCart(
			cart([
				{ productId: 'first', variantId: 'standard', quantity: 2 },
				{ productId: 'second', variantId: 'standard', quantity: 1 },
			]),
			[first, second],
			NOW,
		);

		expect(summary.itemCount).toBe(3);
		expect(summary.subtotal.amount).toBe(149000 * 2 + 229000);
		expect(summary.discount.amount).toBe(0);
		expect(summary.total.amount).toBe(summary.subtotal.amount);
		expect(summary.pricingComplete).toBe(true);
	});

	it('applies a percentage promo code to the total', () => {
		const summary = summarizeCart(
			cart([{ productId: 'first', variantId: 'standard', quantity: 1 }], 'BRIGHT10'),
			[first],
			NOW,
		);

		expect(summary.promo.status).toBe('valid');
		expect(summary.discount.amount).toBe(14900);
		expect(summary.total.amount).toBe(149000 - 14900);
	});

	it('never lets a discount push the total below zero', () => {
		const cheap = makeProduct('cheap', 'AirPods Mini', 30000);
		const summary = summarizeCart(
			cart([{ productId: 'cheap', variantId: 'standard', quantity: 1 }], 'UFA500'),
			[cheap],
			NOW,
		);

		expect(summary.discount.amount).toBe(30000);
		expect(summary.total.amount).toBe(0);
	});

	it('ignores an expired promo code', () => {
		const summary = summarizeCart(
			cart([{ productId: 'first', variantId: 'standard', quantity: 1 }], 'WINTER24'),
			[first],
			NOW,
		);

		expect(summary.promo.status).toBe('expired');
		expect(summary.discount.amount).toBe(0);
		expect(summary.total.amount).toBe(149000);
	});

	it('reports an unknown total instead of inventing one', () => {
		const summary = summarizeCart(cart([{ productId: 'unpriced', variantId: 'standard', quantity: 1 }]), [unpriced], NOW);

		expect(summary.pricingComplete).toBe(false);
		expect(summary.subtotal.amount).toBeNull();
		expect(summary.total.amount).toBeNull();
		expect(summary.hasOnRequestLines).toBe(true);
		expect(summary.lines[0].priceMode).toBe('on-request');
	});

	it('drops cart lines whose product no longer exists', () => {
		const summary = summarizeCart(
			cart([
				{ productId: 'first', variantId: 'standard', quantity: 1 },
				{ productId: 'deleted', variantId: 'standard', quantity: 5 },
			]),
			[first],
			NOW,
		);

		expect(summary.lines).toHaveLength(1);
		expect(summary.itemCount).toBe(1);
		expect(summary.total.amount).toBe(149000);
	});

	it('falls back to the first variant when the stored variant is gone', () => {
		const summary = summarizeCart(cart([{ productId: 'first', variantId: 'removed', quantity: 1 }]), [first], NOW);

		expect(summary.lines[0].variantId).toBe('standard');
		expect(summary.total.amount).toBe(149000);
	});
});
