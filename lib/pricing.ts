import { businessConfig } from './config';
import type { CartState } from './cart/cartReducer';
import type { Product, ProductVariant } from './domain';
import { addMoney, formatMoney, isKnown, money, multiplyMoney, subtractMoney, type Money } from './money';
import { discountFor, evaluatePromo, type PromoEvaluation } from './promo';

/**
 * 'known'      — реальная цена из товарных данных;
 * 'demo'       — внутренний preview-режим (NEXT_PUBLIC_DEMO_PRICES);
 * 'on-request' — цены нет, товар продаётся по запросу.
 */
export type PriceMode = 'known' | 'demo' | 'on-request';

export type ResolvedPrice = { price: Money; mode: PriceMode };

export function resolveUnitPrice(product: Product, variant: ProductVariant | undefined): ResolvedPrice {
	if (variant && isKnown(variant.price)) return { price: variant.price, mode: 'known' };
	if (isKnown(product.price)) return { price: product.price, mode: 'known' };
	if (businessConfig.pricing.demoPricesEnabled) {
		const demo = businessConfig.pricing.demoPriceList[product.id];
		if (typeof demo === 'number') return { price: money(demo), mode: 'demo' };
	}
	return { price: money(null), mode: 'on-request' };
}

/** Сумма, которой мы не знаем, никогда не печатается как число: это «Цена по запросу». */
export function formatPrice(value: Money): string {
	return formatMoney(value, businessConfig.pricing.onRequestLabel);
}

export type CartLine = {
	productId: string;
	variantId: string;
	slug: string;
	name: string;
	variantLabel: string;
	quantity: number;
	unitPrice: Money;
	lineTotal: Money;
	priceMode: PriceMode;
};

export type CartSummary = {
	lines: CartLine[];
	itemCount: number;
	subtotal: Money;
	discount: Money;
	/** Только товары: доставка сюда не входит по решению lead'а. */
	total: Money;
	promo: PromoEvaluation;
	pricingComplete: boolean;
	hasOnRequestLines: boolean;
	hasDemoPrices: boolean;
};

export function summarizeCart(state: CartState, products: Product[], now: Date = new Date()): CartSummary {
	const lines: CartLine[] = [];

	for (const item of state.items) {
		const product = products.find((candidate) => candidate.id === item.productId);
		if (!product) continue;
		const variant = product.variants.find((candidate) => candidate.id === item.variantId) ?? product.variants[0];
		if (!variant) continue;
		const { price, mode } = resolveUnitPrice(product, variant);
		lines.push({
			productId: product.id,
			variantId: variant.id,
			slug: product.slug,
			name: product.name,
			variantLabel: variant.label,
			quantity: item.quantity,
			unitPrice: price,
			lineTotal: multiplyMoney(price, item.quantity),
			priceMode: mode,
		});
	}

	const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
	const pricingComplete = lines.length > 0 && lines.every((line) => isKnown(line.lineTotal));
	const subtotal = pricingComplete
		? lines.reduce<Money>((sum, line) => addMoney(sum, line.lineTotal), money(0))
		: money(null);
	const promo = evaluatePromo(state.promoCode, now);
	const discount = discountFor(promo, subtotal);
	const total = subtractMoney(subtotal, discount);

	return {
		lines,
		itemCount,
		subtotal,
		discount,
		total,
		promo,
		pricingComplete,
		hasOnRequestLines: lines.some((line) => line.priceMode === 'on-request'),
		hasDemoPrices: lines.some((line) => line.priceMode === 'demo'),
	};
}
