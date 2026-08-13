import { businessConfig } from './config';
import type { Money } from './money';

export type PaymentStatus = 'idle' | 'submitting' | 'success' | 'failed' | 'cancelled';

export type PaymentState = {
	status: PaymentStatus;
	reference: string | null;
	error: string | null;
};

export type PaymentEvent =
	| { type: 'submit' }
	| { type: 'succeed'; reference: string }
	| { type: 'fail'; reason: string }
	| { type: 'cancel' }
	| { type: 'reset' };

export const initialPaymentState: PaymentState = { status: 'idle', reference: null, error: null };

/**
 * Explicit state machine. Unsupported transitions are ignored so the UI can never
 * show a confirmation without a real success transition.
 */
export function paymentReducer(state: PaymentState, event: PaymentEvent): PaymentState {
	switch (state.status) {
		case 'idle':
			return event.type === 'submit' ? { status: 'submitting', reference: null, error: null } : state;

		case 'submitting':
			if (event.type === 'succeed') return { status: 'success', reference: event.reference, error: null };
			if (event.type === 'fail') return { status: 'failed', reference: null, error: event.reason };
			if (event.type === 'cancel') return { status: 'cancelled', reference: null, error: null };
			return state;

		case 'failed':
		case 'cancelled':
			if (event.type === 'submit') return { status: 'submitting', reference: null, error: null };
			if (event.type === 'reset') return initialPaymentState;
			return state;

		case 'success':
			return state;

		default:
			return state;
	}
}

export type PaymentRequest = {
	amount: Money;
	cardNumber: string;
	expiry: string;
	cvc: string;
	orderReference: string;
};

export type PaymentResult =
	| { ok: true; reference: string }
	| { ok: false; reason: string };

export type PaymentProvider = {
	id: string;
	authorize(request: PaymentRequest): Promise<PaymentResult>;
};

export function normalizeCardNumber(value: string): string {
	return value.replace(/[\s-]/g, '');
}

export function isValidCardNumber(value: string): boolean {
	const digits = normalizeCardNumber(value);
	if (!/^\d{16}$/.test(digits)) return false;
	let sum = 0;
	for (let index = 0; index < digits.length; index += 1) {
		let digit = Number(digits[digits.length - 1 - index]);
		if (index % 2 === 1) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
	}
	return sum % 10 === 0;
}

export function isValidExpiry(value: string, now: Date = new Date()): boolean {
	const match = /^(\d{2})\/(\d{2})$/.exec(value.trim());
	if (!match) return false;
	const month = Number(match[1]);
	const year = 2000 + Number(match[2]);
	if (month < 1 || month > 12) return false;
	const endOfMonth = new Date(year, month, 1).getTime();
	return endOfMonth > now.getTime();
}

export function isValidCvc(value: string): boolean {
	return /^\d{3}$/.test(value.trim());
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock provider. It never persists or transmits card data and never touches real money.
 * Replacing it with a real PSP means implementing this interface only.
 */
export const mockPaymentProvider: PaymentProvider = {
	id: businessConfig.payment.provider,
	async authorize(request: PaymentRequest): Promise<PaymentResult> {
		await delay(450);
		const digits = normalizeCardNumber(request.cardNumber);
		if (!isValidCardNumber(digits)) return { ok: false, reason: 'Номер карты не прошёл проверку.' };
		if (!isValidExpiry(request.expiry)) return { ok: false, reason: 'Срок действия карты недействителен.' };
		if (!isValidCvc(request.cvc)) return { ok: false, reason: 'CVC указан неверно.' };
		if (typeof request.amount.amount !== 'number' || request.amount.amount <= 0) {
			return { ok: false, reason: 'Сумма заказа не определена, оплата не выполнена.' };
		}
		if (digits.endsWith('0002')) return { ok: false, reason: 'Банк отклонил операцию. Попробуйте другую карту.' };
		return { ok: true, reference: `PAY-${request.orderReference}` };
	},
};
