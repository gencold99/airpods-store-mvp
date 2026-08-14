import type { Order, OrderCustomer, OrderLine } from '../domain';
import { CURRENCY, isKnown, money, type KnownMoney, type Money } from '../money';

/**
 * Подтверждение заказа живёт в sessionStorage, то есть в данных, которые пользователь
 * может переписать руками. Поэтому здесь два независимых барьера:
 *
 * 1. Runtime parser: любой объект из storage проверяется по схеме, а не приводится через `as`.
 *    Malformed или частично изменённая форма не должна попадать в UI и ронять рендер.
 * 2. One-time handoff token: заказ отдаётся не «как есть», а в конверте с короткоживущим
 *    токеном, привязанным к id заказа. Токен потребляется после успешного подтверждения,
 *    поэтому подделанный «paid» объект без токена и повторное открытие страницы
 *    подтверждения не показывают заказ.
 *
 * Это не замена серверной проверки: mock-оплата и клиентский handoff остаются MVP-решением
 * (см. docs/confirmation-handoff.md).
 */

/** v2: заказ хранится только внутри handoff-конверта. */
export const ORDER_HANDOFF_KEY = 'bright-future.order-handoff.v2';
/** v1 хранил сырой заказ без токена: такие записи больше не принимаются. */
export const LEGACY_ORDER_KEY = 'bright-future.last-order.v1';
export const HANDOFF_VERSION = 2;
/** Handoff нужен только на переход checkout → confirmation, поэтому живёт минуты, а не сессию. */
export const HANDOFF_TTL_MS = 10 * 60 * 1000;

const MAX_LINES = 50;
const MAX_QUANTITY = 1000;
const MIN_TOKEN_SECRET_LENGTH = 16;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type OrderHandoff = {
	version: number;
	token: string;
	orderId: string;
	issuedAt: number;
	expiresAt: number;
	order: Order;
};

export type HandoffRejection = 'missing' | 'malformed' | 'unpaid' | 'token-mismatch' | 'expired';

export type HandoffReadResult =
	| { ok: true; handoff: OrderHandoff }
	| { ok: false; reason: HandoffRejection };

/**
 * Позиция, прошедшая парсер: обе суммы уже доказано известны.
 * Без этого типа доказательство теряется на границе OrderLine, где Money допускает null,
 * и проверка целостности итога перестаёт компилироваться (TS18047).
 */
type ParsedOrderLine = OrderLine & { unitPrice: KnownMoney; lineTotal: KnownMoney };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isWholeNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value);
}

function parseMoney(value: unknown): Money | null {
	if (!isRecord(value)) return null;
	if (value.currency !== CURRENCY) return null;
	if (value.amount === null) return money(null);
	if (typeof value.amount !== 'number' || !Number.isFinite(value.amount)) return null;
	return money(value.amount);
}

/** Суммы заказа всегда известны: заказ не создаётся, пока цена «по запросу». */
function parseKnownMoney(value: unknown): KnownMoney | null {
	const parsed = parseMoney(value);
	if (!parsed || !isKnown(parsed)) return null;
	if (!Number.isInteger(parsed.amount) || parsed.amount < 0) return null;
	return parsed;
}

function parseCustomer(value: unknown): OrderCustomer | null {
	if (!isRecord(value)) return null;
	const { email, name, phone, city } = value;
	if (!isNonEmptyString(email) || !EMAIL_PATTERN.test(email.trim())) return null;
	if (!isNonEmptyString(name) || !isNonEmptyString(phone) || !isNonEmptyString(city)) return null;
	return { email: email.trim(), name: name.trim(), phone: phone.trim(), city: city.trim() };
}

function parseLine(value: unknown): ParsedOrderLine | null {
	if (!isRecord(value)) return null;
	const { productId, variantId, name, variantLabel, quantity } = value;
	if (!isNonEmptyString(productId) || !isNonEmptyString(variantId)) return null;
	if (!isNonEmptyString(name) || !isNonEmptyString(variantLabel)) return null;
	if (!isWholeNumber(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null;

	const unitPrice = parseKnownMoney(value.unitPrice);
	const lineTotal = parseKnownMoney(value.lineTotal);
	if (!unitPrice || !lineTotal) return null;
	// Позиция не может «подешеветь» в storage: строка считается заново и сверяется.
	if (lineTotal.amount !== unitPrice.amount * quantity) return null;

	return { productId, variantId, name, variantLabel, quantity, unitPrice, lineTotal };
}

export function parseOrder(value: unknown): Order | null {
	if (!isRecord(value)) return null;

	const { id, createdAt, status, paymentReference, deliveryOptionId, deliveryLabel, deliveryCostStatus, pricingIsDemo, promoCode } = value;

	if (!isNonEmptyString(id)) return null;
	if (!isNonEmptyString(createdAt) || Number.isNaN(Date.parse(createdAt))) return null;
	// Подтверждение существует только для успешно оплаченного заказа.
	if (status !== 'paid') return null;
	if (!isNonEmptyString(paymentReference)) return null;
	if (!isNonEmptyString(deliveryOptionId) || !isNonEmptyString(deliveryLabel)) return null;
	if (deliveryCostStatus !== 'pending' && deliveryCostStatus !== 'confirmed') return null;
	if (typeof pricingIsDemo !== 'boolean') return null;

	const promo = promoCode === null ? null : isNonEmptyString(promoCode) ? promoCode : undefined;
	if (promo === undefined) return null;

	const customer = parseCustomer(value.customer);
	if (!customer) return null;

	const rawLines = value.lines;
	if (!Array.isArray(rawLines) || rawLines.length === 0 || rawLines.length > MAX_LINES) return null;
	const lines: ParsedOrderLine[] = [];
	for (const rawLine of rawLines) {
		const line = parseLine(rawLine);
		if (!line) return null;
		lines.push(line);
	}

	const subtotal = parseKnownMoney(value.subtotal);
	const discount = parseKnownMoney(value.discount);
	const total = parseKnownMoney(value.total);
	if (!subtotal || !discount || !total) return null;

	// Итог пересчитывается из позиций: показывать сумму, которая не сходится, нельзя.
	const linesTotal = lines.reduce((sum, line) => sum + line.lineTotal.amount, 0);
	if (linesTotal !== subtotal.amount) return null;
	if (discount.amount > subtotal.amount) return null;
	if (Math.max(0, subtotal.amount - discount.amount) !== total.amount) return null;

	return {
		id,
		createdAt,
		customer,
		lines,
		subtotal,
		discount,
		total,
		promoCode: promo,
		deliveryOptionId,
		deliveryLabel,
		deliveryCostStatus,
		status: 'paid',
		paymentReference,
		pricingIsDemo,
	};
}

function randomSecret(): string {
	const cryptoRef = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
	if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
		const bytes = cryptoRef.getRandomValues(new Uint8Array(16));
		return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	}
	// Fallback только для окружений без WebCrypto: токен всё равно одноразовый и короткоживущий.
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Токен привязан к заказу: `<orderId>.<secret>`. */
export function createHandoffToken(orderId: string): string {
	return `${orderId}.${randomSecret()}`;
}

export function isTokenBoundTo(token: string, orderId: string): boolean {
	const parts = token.split('.');
	if (parts.length !== 2) return false;
	const [boundOrderId, secret] = parts;
	return boundOrderId === orderId && secret.length >= MIN_TOKEN_SECRET_LENGTH;
}

/**
 * Сохраняет оплаченный заказ для передачи на страницу подтверждения.
 * Возвращает токен handoff или null, если storage недоступен.
 */
export function saveLastOrder(order: Order, now: number = Date.now()): string | null {
	const token = createHandoffToken(order.id);
	const envelope: OrderHandoff = {
		version: HANDOFF_VERSION,
		token,
		orderId: order.id,
		issuedAt: now,
		expiresAt: now + HANDOFF_TTL_MS,
		order,
	};
	try {
		window.sessionStorage.setItem(ORDER_HANDOFF_KEY, JSON.stringify(envelope));
		window.sessionStorage.removeItem(LEGACY_ORDER_KEY);
		return token;
	} catch {
		/* storage может быть заблокирован: подтверждение честно покажет, что заказа нет */
		return null;
	}
}

export function readConfirmationHandoff(now: number = Date.now()): HandoffReadResult {
	let raw: string | null = null;
	try {
		raw = window.sessionStorage.getItem(ORDER_HANDOFF_KEY);
	} catch {
		return { ok: false, reason: 'missing' };
	}
	if (!raw) return { ok: false, reason: 'missing' };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ok: false, reason: 'malformed' };
	}

	if (!isRecord(parsed)) return { ok: false, reason: 'malformed' };
	const { version, token, orderId, issuedAt, expiresAt, order } = parsed;
	if (version !== HANDOFF_VERSION) return { ok: false, reason: 'malformed' };
	if (!isRecord(order)) return { ok: false, reason: 'malformed' };
	if (typeof issuedAt !== 'number' || !Number.isFinite(issuedAt)) return { ok: false, reason: 'malformed' };
	if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
		return { ok: false, reason: 'malformed' };
	}
	// Конверт без токена — самый простой способ подделать подтверждение вручную.
	if (!isNonEmptyString(token) || !isNonEmptyString(orderId)) return { ok: false, reason: 'token-mismatch' };

	if (order.status !== 'paid' || !isNonEmptyString(order.paymentReference)) return { ok: false, reason: 'unpaid' };

	const parsedOrder = parseOrder(order);
	if (!parsedOrder) return { ok: false, reason: 'malformed' };
	if (orderId !== parsedOrder.id || !isTokenBoundTo(token, parsedOrder.id)) return { ok: false, reason: 'token-mismatch' };
	if (now > expiresAt) return { ok: false, reason: 'expired' };
	// Запись «из будущего» (подкрученные часы или ручная правка) тоже не принимается.
	if (issuedAt - now > HANDOFF_TTL_MS) return { ok: false, reason: 'expired' };

	return {
		ok: true,
		handoff: { version: HANDOFF_VERSION, token, orderId, issuedAt, expiresAt, order: parsedOrder },
	};
}

/** Одноразовость handoff: запись удаляется только тем токеном, которым была прочитана. */
export function consumeConfirmationHandoff(token: string): boolean {
	try {
		const raw = window.sessionStorage.getItem(ORDER_HANDOFF_KEY);
		if (!raw) return false;
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed) || parsed.token !== token) return false;
		window.sessionStorage.removeItem(ORDER_HANDOFF_KEY);
		return true;
	} catch {
		return false;
	}
}

export function clearLastOrder(): void {
	try {
		window.sessionStorage.removeItem(ORDER_HANDOFF_KEY);
		window.sessionStorage.removeItem(LEGACY_ORDER_KEY);
	} catch {
		/* noop */
	}
}
