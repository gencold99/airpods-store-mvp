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

export type TrustSignal = {
	id: string;
	title: string;
	text: string;
	/** 'confirmed' — обещание, которое магазин уже может держать; 'pending' — данных ещё нет. */
	status: 'confirmed' | 'pending';
};

export const siteConfig = {
	name: 'Bright Future',
	baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bright-future.example',
	locale: 'ru_RU',
};

/**
 * Все коммерческие значения живут в конфигурации.
 *
 * DECISION (lead, 14.08.2026):
 * 1. Публичных placeholder-цен быть не должно. Пока реального прайса нет, товар
 *    продаётся по запросу, а не с выдуманным числом.
 * 2. Итог заказа = только товары. Доставка не входит в total, пока нет реальных тарифов,
 *    и это должно быть явно сказано в интерфейсе.
 */
export const businessConfig = {
	currency: 'RUB' as const,
	pricing: {
		onRequestLabel: 'Цена по запросу',
		onRequestAction: 'Уточнить цену',
		onRequestNote:
			'Цену и наличие подтверждает менеджер: оставьте заявку, и мы вернёмся с точной стоимостью.',
		/**
		 * Внутренний режим для проверки расчётов на preview-сборке. По умолчанию выключен,
		 * поэтому в публичной сборке числа из demoPriceList появиться не могут.
		 */
		demoPricesEnabled: process.env.NEXT_PUBLIC_DEMO_PRICES === 'true',
		demoDisclaimer:
			'Включён внутренний режим демо-цен (NEXT_PUBLIC_DEMO_PRICES): суммы нужны только для проверки расчётов и не являются офертой.',
		/** kopecks, keyed by product id */
		demoPriceList: {
			'airpods-4': 1490000,
			'airpods-pro': 2290000,
			'airpods-max': 5490000,
		} as Record<string, number>,
	},
	cart: {
		maxQuantityPerLine: 10,
	},
	totals: {
		/** Доставка не входит в итог, пока её стоимость не подтверждена. */
		includesDelivery: false,
		goodsLabel: 'Итого за товары',
		deliveryValue: 'Уточняется после подтверждения',
		explanation:
			'В итог входят только товары. Стоимость доставки по Уфе и России менеджер рассчитывает и подтверждает после оформления заказа — до отправки и до любых доплат.',
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
	/** Обещания магазина, а не характеристики товара: их можно показывать до подключения каталога. */
	trust: [
		{
			id: 'original',
			title: 'Только оригинальные AirPods',
			text: 'Магазин работает с оригинальными устройствами Apple: подмены модели или комплектации не будет.',
			status: 'confirmed',
		},
		{
			id: 'payment',
			title: 'Данные карты не сохраняются',
			text: 'Реквизиты карты обрабатывает платёжный провайдер, магазин их не хранит. Сейчас подключён mock-провайдер: реальных списаний нет.',
			status: 'confirmed',
		},
		{
			id: 'guest',
			title: 'Оформление без регистрации',
			text: 'Заказ оформляется как гость: нужны только контакты для подтверждения и доставки.',
			status: 'confirmed',
		},
		{
			id: 'delivery',
			title: 'Доставка по Уфе и России',
			text: 'Способ доставки выбирается при оформлении. Стоимость и срок менеджер подтверждает после заказа.',
			status: 'pending',
		},
	] as TrustSignal[],
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
