import { businessConfig } from './config';

export type FaqItem = {
	id: string;
	question: string;
	/** Собирается только из уже согласованных строк businessConfig. */
	answer: string;
};

/**
 * FAQ — самое удобное место, чтобы незаметно придумать коммерческое обещание: срок
 * доставки, гарантию, цену. Поэтому ответы не пишутся заново, а собираются из конфига:
 * новое утверждение можно добавить только там, где его видит ревьюер.
 */
export function buildFaq(): FaqItem[] {
	const original = businessConfig.trust.find((signal) => signal.id === 'original');
	const guest = businessConfig.trust.find((signal) => signal.id === 'guest');

	const items: FaqItem[] = [];

	if (original) {
		items.push({ id: 'original', question: 'Это оригинальные AirPods?', answer: original.text });
	}

	items.push({
		id: 'price-on-request',
		question: `Почему у части моделей указано «${businessConfig.pricing.onRequestLabel}»?`,
		answer: businessConfig.pricing.onRequestNote,
	});

	items.push({
		id: 'total',
		question: 'Что входит в итоговую сумму?',
		answer: businessConfig.totals.explanation,
	});

	items.push({
		id: 'delivery',
		question: `Какая есть доставка?`,
		answer: `${businessConfig.delivery.ufa.label} и ${businessConfig.delivery.russia.label}. ${businessConfig.delivery.note}`,
	});

	items.push({
		id: 'payment',
		question: 'Как проходит оплата?',
		answer: businessConfig.payment.disclaimer,
	});

	items.push({
		id: 'warranty',
		question: `${businessConfig.warranty.label}: что уже известно?`,
		answer: businessConfig.warranty.description,
	});

	if (guest) {
		items.push({ id: 'guest', question: 'Нужна ли регистрация?', answer: guest.text });
	}

	return items;
}
