import type { CartItem, Order, OrderCustomer, OrderLine, Product, RepositoryResult } from './domain';
import { money, type Money } from './money';

const placeholderPrice: Money = money(null);

const products: Product[] = [
	{
		id: 'airpods-4',
		slug: 'airpods-4',
		name: 'AirPods 4',
		tagline: 'Лёгкий звук для каждого дня.',
		category: 'AirPods',
		image: null,
		price: placeholderPrice,
		oldPrice: placeholderPrice,
		availability: 'available',
		variants: [
			{ id: 'standard', label: 'Стандартная версия', sku: 'PLACEHOLDER-A4', price: placeholderPrice, available: true },
			{ id: 'anc', label: 'Версия с шумоподавлением', sku: 'PLACEHOLDER-A4-ANC', price: placeholderPrice, available: true },
		],
		specs: { 'Цена': 'Будет добавлена', 'Наличие': 'Проверяется', 'Характеристики': null },
	},
	{
		id: 'airpods-pro',
		slug: 'airpods-pro',
		name: 'AirPods Pro',
		tagline: 'Погружение без лишнего шума.',
		category: 'AirPods Pro',
		image: null,
		price: placeholderPrice,
		oldPrice: placeholderPrice,
		availability: 'available',
		variants: [
			{ id: 'standard', label: 'Стандартная версия', sku: 'PLACEHOLDER-AP', price: placeholderPrice, available: true },
		],
		specs: { 'Цена': 'Будет добавлена', 'Наличие': 'Проверяется', 'Характеристики': null },
	},
	{
		id: 'airpods-max',
		slug: 'airpods-max',
		name: 'AirPods Max',
		tagline: 'Большой звук. Большое присутствие.',
		category: 'Наушники',
		image: null,
		price: placeholderPrice,
		oldPrice: placeholderPrice,
		availability: 'available',
		variants: [
			{ id: 'standard', label: 'Стандартная версия', sku: 'PLACEHOLDER-AM', price: placeholderPrice, available: true },
		],
		specs: { 'Цена': 'Будет добавлена', 'Наличие': 'Проверяется', 'Характеристики': null },
	},
];

export const productRepository = {
	async list(): Promise<RepositoryResult<Product[]>> {
		return { ok: true, data: products };
	},
	async getBySlug(slug: string): Promise<RepositoryResult<Product>> {
		const item = products.find((product) => product.slug === slug);
		return item ? { ok: true, data: item } : { ok: false, error: 'Товар не найден' };
	},
};

export type CreateOrderInput = {
	customer: OrderCustomer;
	lines: OrderLine[];
	subtotal: Money;
	discount: Money;
	total: Money;
	promoCode: string | null;
	deliveryOptionId: string;
	deliveryLabel: string;
	paymentReference: string;
	pricingIsPlaceholder: boolean;
};

export function newOrderReference(now: number = Date.now()): string {
	return `BF-${now.toString(36).toUpperCase()}`;
}

export const orderRepository = {
	/** An order can only be created with a payment reference from a successful authorization. */
	async create(input: CreateOrderInput): Promise<RepositoryResult<Order>> {
		if (!input.paymentReference) return { ok: false, error: 'Заказ нельзя создать без успешной оплаты.' };
		if (input.lines.length === 0) return { ok: false, error: 'Заказ не содержит товаров.' };
		return {
			ok: true,
			data: {
				id: newOrderReference(),
				createdAt: new Date().toISOString(),
				customer: input.customer,
				lines: input.lines,
				subtotal: input.subtotal,
				discount: input.discount,
				total: input.total,
				promoCode: input.promoCode,
				deliveryOptionId: input.deliveryOptionId,
				deliveryLabel: input.deliveryLabel,
				status: 'paid',
				paymentReference: input.paymentReference,
				pricingIsPlaceholder: input.pricingIsPlaceholder,
			},
		};
	},
};

export type { CartItem };
