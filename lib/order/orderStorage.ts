import type { Order } from '../domain';

const KEY = 'bright-future.last-order.v1';

export function saveLastOrder(order: Order): void {
	try {
		window.sessionStorage.setItem(KEY, JSON.stringify(order));
	} catch {
		/* ignore storage failures; confirmation will show a fallback */
	}
}

export function readLastOrder(): Order | null {
	try {
		const raw = window.sessionStorage.getItem(KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Order;
		if (!parsed || parsed.status !== 'paid' || typeof parsed.id !== 'string') return null;
		if (typeof parsed.paymentReference !== 'string' || parsed.paymentReference.length === 0) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function clearLastOrder(): void {
	try {
		window.sessionStorage.removeItem(KEY);
	} catch {
		/* noop */
	}
}
