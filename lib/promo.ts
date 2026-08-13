import { businessConfig, type PromoRule } from './config';
import { isKnown, money, percentOf, minMoney, type Money } from './money';

export type PromoStatus = 'idle' | 'valid' | 'invalid' | 'expired';

export type PromoEvaluation = {
	status: PromoStatus;
	code: string | null;
	rule: PromoRule | null;
	message: string;
};

export function normalizePromoCode(raw: string | null | undefined): string | null {
	if (typeof raw !== 'string') return null;
	const normalized = raw.trim().toUpperCase();
	return normalized.length > 0 ? normalized : null;
}

export function evaluatePromo(
	raw: string | null | undefined,
	now: Date = new Date(),
	rules: PromoRule[] = businessConfig.promoCodes,
): PromoEvaluation {
	const code = normalizePromoCode(raw);
	if (!code) {
		return { status: 'idle', code: null, rule: null, message: '' };
	}

	const rule = rules.find((item) => item.code.toUpperCase() === code) ?? null;
	if (!rule || !rule.active) {
		return { status: 'invalid', code, rule: null, message: `Промокод ${code} не найден.` };
	}

	if (rule.expiresAt && new Date(rule.expiresAt).getTime() <= now.getTime()) {
		return { status: 'expired', code, rule, message: `Срок действия промокода ${code} истёк.` };
	}

	return { status: 'valid', code, rule, message: `Промокод ${code} применён: ${rule.description}.` };
}

export function discountFor(evaluation: PromoEvaluation, subtotal: Money): Money {
	if (evaluation.status !== 'valid' || !evaluation.rule) return money(0);
	if (!isKnown(subtotal)) return money(null);
	const raw = evaluation.rule.kind === 'percent' ? percentOf(subtotal, evaluation.rule.value) : money(evaluation.rule.value);
	return minMoney(raw, subtotal);
}
