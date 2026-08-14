export type { Currency, Money, KnownMoney } from './money';
import type { Money } from './money';

export type ProductVariant = {
	id: string;
	label: string;
	sku: string;
	price: Money;
	available: boolean;
};

/** Слот галереи. Реальный файл появляется вместе с товарными данными, до этого src = null. */
export type ProductMediaSlot = {
	id: string;
	label: string;
	src: string | null;
};

export type Product = {
	id: string;
	slug: string;
	name: string;
	tagline: string;
	category: string;
	image: string | null;
	gallery: ProductMediaSlot[];
	/** Аргументы покупки. Пусто, пока нет верифицированных данных: характеристики нельзя выдумывать. */
	highlights: string[];
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
	/** Итог по товарам. Доставка в него не входит, пока deliveryCostStatus !== 'confirmed'. */
	total: Money;
	promoCode: string | null;
	deliveryOptionId: string;
	deliveryLabel: string;
	deliveryCostStatus: 'pending' | 'confirmed';
	/** An order only exists in this MVP after a successful payment authorization. */
	status: 'paid';
	paymentReference: string;
	/** Заказ оформлен во внутреннем режиме демо-цен. */
	pricingIsDemo: boolean;
};

/** Заявка на цену для товара, который продаётся по запросу. */
export type PriceQuoteRequest = {
	id: string;
	createdAt: string;
	productId: string;
	productName: string;
	name: string;
	contact: string;
	comment: string;
};

export type RepositoryResult<T> = { ok: true; data: T } | { ok: false; error: string };
