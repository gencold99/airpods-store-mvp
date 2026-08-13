export type { Currency, Money, KnownMoney } from './money';
import type { Money } from './money';

export type ProductVariant = {
	id: string;
	label: string;
	sku: string;
	price: Money;
	available: boolean;
};

export type Product = {
	id: string;
	slug: string;
	name: string;
	tagline: string;
	category: string;
	image: string | null;
	price: Money;
	oldPrice: Money;
	availability: 'available' | 'unavailable' | 'placeholder';
	variants: ProductVariant[];
	specs: Record<string, string | null>;
};

export type CartItem = { productId: string; variantId: string; quantity: number };

export type OrderCustomer = { email: string; name: string; phone: string; city: string };

export type OrderLine = {
	productId: string;
	variantId: string;
	name: string;
	variantLabel: string;
	quantity: number;
	unitPrice: Money;
	lineTotal: Money;
};

export type Order = {
	id: string;
	createdAt: string;
	customer: OrderCustomer;
	lines: OrderLine[];
	subtotal: Money;
	discount: Money;
	total: Money;
	promoCode: string | null;
	deliveryOptionId: string;
	deliveryLabel: string;
	/** An order only exists in this MVP after a successful payment authorization. */
	status: 'paid';
	paymentReference: string;
	pricingIsPlaceholder: boolean;
};

export type RepositoryResult<T> = { ok: true; data: T } | { ok: false; error: string };
