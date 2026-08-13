export type PromoKind = 'percent' | 'fixed';

export type PromoRule = {
	code: string;
	kind: PromoKind;
	/** percent: 1-100, fixed: kopecks */
	value: number;
	expiresAt: string | null;
	active: boolean;
	description: string;
};

export const siteConfig = {
	name: 'Bright Future',
	baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bright-future.example',
	locale: 'ru_RU',
};

/**
 * All commercial values stay in configuration.
 * Real prices are not known yet, so the price list below is an explicitly labelled
 * placeholder used only to make the purchase path testable. Any real price coming
 * from the product/variant record automatically wins over the placeholder.
 */
export const businessConfig = {
	currency: 'RUB' as const,
	pricing: {
		usePlaceholderPrices: true,
		disclaimer:
			'Значения цен — демонстрационные placeholder-данные для проверки расчётов. Финальные цены подключаются перед запуском.',
		/** kopecks, keyed by product id */
		placeholderPriceList: {
			'airpods-4': 1490000,
			'airpods-pro': 2290000,
			'airpods-max': 5490000,
		} as Record<string, number>,
	},
	cart: {
		maxQuantityPerLine: 10,
	},
	delivery: {
		pricingStatus: 'pending' as const,
		note: 'Стоимость и сроки доставки подтверждаются менеджером после оформления и не входят в расчёт итога.',
		ufa: { label: 'Курьерская доставка по Уфе', price: null, eta: null },
		russia: { label: 'Доставка по России', price: null, eta: null },
	},
	warranty: {
		label: 'Гарантия',
		description: 'Условия будут добавлены после подтверждения.',
	},
	payment: {
		provider: 'mock' as const,
		disclaimer:
			'Оплата выполняется mock-провайдером: реальные средства не списываются, данные карты не сохраняются и не передаются.',
		testCards: {
			success: '4111 1111 1111 1111',
			declined: '4000 0000 0000 0002',
		},
	},
	promoCodes: [
		{
			code: 'BRIGHT10',
			kind: 'percent',
			value: 10,
			expiresAt: null,
			active: true,
			description: 'Скидка 10% на заказ',
		},
		{
			code: 'UFA500',
			kind: 'fixed',
			value: 50000,
			expiresAt: null,
			active: true,
			description: 'Скидка 500 ₽ на заказ',
		},
		{
			code: 'WINTER24',
			kind: 'percent',
			value: 15,
			expiresAt: '2024-03-01T00:00:00.000Z',
			active: true,
			description: 'Истёкшая сезонная акция',
		},
		{
			code: 'ARCHIVE',
			kind: 'fixed',
			value: 100000,
			expiresAt: null,
			active: false,
			description: 'Отключённый код',
		},
	] as PromoRule[],
};
