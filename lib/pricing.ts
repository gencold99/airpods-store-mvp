import { businessConfig } from './config';
import type { CartState } from './cart/cartReducer';
import type { Product, ProductVariant } from './domain';
import { addMoney, isKnown, money, multiplyMoney, subtractMoney, type Money } from './money';
import { discountFor, evaluatePromo, type PromoEvaluation } from './promo';

export type ResolvedPrice = { price: Money; isPlaceholder: boolean };

export function resolveUnitPrice(product: Product, variant: ProductVariant): ResolvedPrice {
	if (isKnown(variant.price)) return { price: variant.price, isPlaceholder: false };
	if (isKnown(product.price)) return { price: product.price, isPlaceholder: false };
	if (businessConfig.pricing.usePlaceholderPrices) {
		const placeholder = businessConfig.pricing.placeholderPriceList[product.id];
		if (typeof placeholder === 'number') return { price: money(placeholder), isPlaceholder: true };
	}
	return { price: money(null), isPlaceholder: true };
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
	isPlaceholderPrice: boolean;
};

export type CartSummary = {
	lines: CartLine[];
	itemCount: number;
	subtotal: Money;
	discount: Money;
	total: Money;
	promo: PromoEvaluation;
	pricingComplete: boolean;
	hasPlaceholderPrices: boolean;
};

export function summarizeCart(state: CartState, products: Product[], now: Date = new Date()): CartSummary {
	const lines: CartLine[] = [];

	for (const item of state.items) {
		const product = products.find((candidate) => candidate.id === item.productId);
		if (!product) continue;
		const variant = product.variants.find((candidate) => candidate.id === item.variantId) ?? product.variants[0];
		if (!variant) continue;
		const { price, isPlaceholder } = resolveUnitPrice(product, variant);
		lines.push({
			productId: product.id,
			variantId: variant.id,
			slug: product.slug,
			name: product.name,
			variantLabel: variant.label,
			quantity: item.quantity,
			unitPrice: price,
			lineTotal: multiplyMoney(price, item.quantity),
			isPlaceholderPrice: isPlaceholder,
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
		hasPlaceholderPrices: lines.some((line) => line.isPlaceholderPrice),
	};
}
