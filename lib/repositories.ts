import type {
	CartItem,
	Order,
	OrderCustomer,
	OrderLine,
	PriceQuoteRequest,
	Product,
	ProductMediaSlot,
	RepositoryResult,
} from './domain';
import { money, type Money } from './money';

const unknownPrice: Money = money(null);

/**
 * Слоты галереи создаются на товар, чтобы UI мог показать media rail до появления
 * реальных фотографий. Подписи нейтральные: обещать конкретный кадр мы пока не можем.
 */
function gallerySlots(): ProductMediaSlot[] {
	return [
		{ id: 'main', label: 'Основное фото', src: null },
		{ id: 'secondary', label: 'Дополнительный ракурс', src: null },
		{ id: 'detail', label: 'Деталь', src: null },
	];
}

const products: Product[] = [
	{
		id: 'airpods-4',
		slug: 'airpods-4',
		name: 'AirPods 4',
		tagline: 'Лёгкий звук для каждого дня.',
		category: 'AirPods',
		image: null,
		gallery: gallerySlots(),
		// Преимущества появятся вместе с верифицированными данными: выдумывать их нельзя.
		highlights: [],
		price: unknownPrice,
		oldPrice: unknownPrice,
		availability: 'available',
		variants: [
			{ id: 'standard', label: 'Стандартная версия', sku: 'PLACEHOLDER-A4', price: unknownPrice, available: true },
			{ id: 'anc', label: 'Версия с шумоподавлением', sku: 'PLACEHOLDER-A4-ANC', price: unknownPrice, available: true },
		],
		specs: {},
	},
	{
		id: 'airpods-pro',
		slug: 'airpods-pro',
		name: 'AirPods Pro',
		tagline: 'Погружение без лишнего шума.',
		category: 'AirPods Pro',
		image: null,
		gallery: gallerySlots(),
		highlights: [],
		price: unknownPrice,
		oldPrice: unknownPrice,
		availability: 'available',
		variants: [
			{ id: 'standard', label: 'Стандартная версия', sku: 'PLACEHOLDER-AP', price: unknownPrice, available: true },
		],
		specs: {},
	},
	{
		id: 'airpods-max',
		slug: 'airpods-max',
		name: 'AirPods Max',
		tagline: 'Большой звук. Большое присутствие.',
		category: 'Наушники',
		image: null,
		gallery: gallerySlots(),
		highlights: [],
		price: unknownPrice,
		oldPrice: unknownPrice,
		availability: 'available',
		variants: [
			{ id: 'standard', label: 'Стандартная версия', sku: 'PLACEHOLDER-AM', price: unknownPrice, available: true },
		],
		specs: {},
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
	deliveryCostStatus: 'pending' | 'confirmed';
	paymentReference: string;
	pricingIsDemo: boolean;
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
				deliveryCostStatus: input.deliveryCostStatus,
				status: 'paid',
				paymentReference: input.paymentReference,
				pricingIsDemo: input.pricingIsDemo,
			},
		};
	},
};

export type CreateQuoteInput = {
	productId: string;
	productName: string;
	name: string;
	contact: string;
	comment: string;
};

const quotes: PriceQuoteRequest[] = [];

export function newQuoteReference(now: number = Date.now()): string {
	return `BF-Q-${now.toString(36).toUpperCase()}`;
}

/**
 * Заявка на цену для товаров, которые продаются по запросу.
 * Mock-реализация держит заявку в памяти вкладки; реальный transport подключается
 * за этим же интерфейсом, без изменений в UI.
 */
export const quoteRepository = {
	async create(input: CreateQuoteInput): Promise<RepositoryResult<PriceQuoteRequest>> {
		const contact = input.contact.trim();
		if (contact.length < 5) return { ok: false, error: 'Укажите телефон или email, чтобы менеджер мог ответить.' };
		if (input.productId.length === 0) return { ok: false, error: 'Не удалось определить товар для запроса.' };

		const request: PriceQuoteRequest = {
			id: newQuoteReference(),
			createdAt: new Date().toISOString(),
			productId: input.productId,
			productName: input.productName,
			name: input.name.trim(),
			contact,
			comment: input.comment.trim().slice(0, 500),
		};
		quotes.push(request);
		return { ok: true, data: request };
	},
	async list(): Promise<RepositoryResult<PriceQuoteRequest[]>> {
		return { ok: true, data: [...quotes] };
	},
};

export type { CartItem };
