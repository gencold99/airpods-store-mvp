import { describe, expect, it } from 'vitest';
import { businessConfig } from './config';
import { buildFaq } from './faq';

const faq = buildFaq();

/** Все строки, которые уже прошли ревью как допустимые утверждения магазина. */
const approved: string[] = [
	...businessConfig.trust.map((signal) => signal.text),
	businessConfig.pricing.onRequestNote,
	businessConfig.totals.explanation,
	businessConfig.delivery.note,
	businessConfig.delivery.ufa.label,
	businessConfig.delivery.russia.label,
	businessConfig.payment.disclaimer,
	businessConfig.warranty.description,
];

describe('buildFaq', () => {
	it('answers every question it asks', () => {
		expect(faq.length).toBeGreaterThan(0);
		for (const item of faq) {
			expect(item.question.trim().length).toBeGreaterThan(0);
			expect(item.answer.trim().length).toBeGreaterThan(0);
		}
	});

	it('uses unique ids so the list stays stable for React and for anchors', () => {
		const ids = faq.map((item) => item.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	// Главное: FAQ не должен стать лазейкой для несогласованных обещаний.
	it('never invents an answer outside the approved configuration copy', () => {
		for (const item of faq) {
			const grounded = approved.some((text) => item.answer.includes(text));
			expect(grounded, `Ответ на «${item.question}» не опирается на businessConfig`).toBe(true);
		}
	});

	it('quotes no price and no delivery term while those are unconfirmed', () => {
		expect(businessConfig.pricing.demoPricesEnabled).toBe(false);
		expect(businessConfig.delivery.pricingStatus).toBe('pending');

		for (const item of faq) {
			expect(item.answer).not.toMatch(/\d+\s*₽/);
			expect(item.answer).not.toMatch(/\d+\s*(дн|час)/i);
		}
	});
});
