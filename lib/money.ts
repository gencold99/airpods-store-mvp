export type Currency = 'RUB';

/** Amounts are stored as integer kopecks to avoid floating point drift. */
export type Money = { amount: number | null; currency: Currency };

export type KnownMoney = Money & { amount: number };

export const CURRENCY: Currency = 'RUB';

export function money(amount: number | null): Money {
	return { amount, currency: CURRENCY };
}

export function isKnown(value: Money): value is KnownMoney {
	return typeof value.amount === 'number' && Number.isFinite(value.amount);
}

export function addMoney(a: Money, b: Money): Money {
	if (!isKnown(a) || !isKnown(b)) return money(null);
	return money(a.amount + b.amount);
}

export function subtractMoney(a: Money, b: Money): Money {
	if (!isKnown(a) || !isKnown(b)) return money(null);
	return money(Math.max(0, a.amount - b.amount));
}

export function multiplyMoney(value: Money, factor: number): Money {
	if (!isKnown(value) || !Number.isFinite(factor)) return money(null);
	return money(Math.round(value.amount * factor));
}

export function percentOf(value: Money, percent: number): Money {
	if (!isKnown(value) || !Number.isFinite(percent)) return money(null);
	return money(Math.round((value.amount * percent) / 100));
}

export function minMoney(a: Money, b: Money): Money {
	if (!isKnown(a) || !isKnown(b)) return money(null);
	return money(Math.min(a.amount, b.amount));
}

export function formatMoney(value: Money, fallback = 'Цена уточняется'): string {
	if (!isKnown(value)) return fallback;
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: value.currency,
		maximumFractionDigits: 0,
	}).format(value.amount / 100);
}
