import { businessConfig } from '../config';
import type { CartItem } from '../domain';
import { normalizePromoCode } from '../promo';

export type CartState = { items: CartItem[]; promoCode: string | null };

export const initialCartState: CartState = { items: [], promoCode: null };

export type CartAction =
	| { type: 'hydrate'; state: unknown }
	| { type: 'add'; productId: string; variantId: string; quantity?: number }
	| { type: 'setQuantity'; productId: string; variantId: string; quantity: number }
	| { type: 'remove'; productId: string; variantId: string }
	| { type: 'applyPromo'; code: string }
	| { type: 'removePromo' }
	| { type: 'clear' };

const MAX = businessConfig.cart.maxQuantityPerLine;

function clampQuantity(quantity: number): number {
	if (!Number.isFinite(quantity)) return 0;
	return Math.max(0, Math.min(MAX, Math.trunc(quantity)));
}

function sameLine(item: CartItem, productId: string, variantId: string): boolean {
	return item.productId === productId && item.variantId === variantId;
}

/** Defensive parsing: persisted state is untrusted input. */
export function sanitizeCartState(input: unknown): CartState {
	if (typeof input !== 'object' || input === null) return initialCartState;
	const candidate = input as { items?: unknown; promoCode?: unknown };
	const items: CartItem[] = [];
	if (Array.isArray(candidate.items)) {
		for (const raw of candidate.items) {
			if (typeof raw !== 'object' || raw === null) continue;
			const line = raw as { productId?: unknown; variantId?: unknown; quantity?: unknown };
			if (typeof line.productId !== 'string' || typeof line.variantId !== 'string') continue;
			const quantity = clampQuantity(typeof line.quantity === 'number' ? line.quantity : 0);
			if (quantity <= 0) continue;
			const existing = items.find((item) => sameLine(item, line.productId as string, line.variantId as string));
			if (existing) existing.quantity = clampQuantity(existing.quantity + quantity);
			else items.push({ productId: line.productId, variantId: line.variantId, quantity });
		}
	}
	return { items, promoCode: normalizePromoCode(candidate.promoCode as string | null | undefined) };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
	switch (action.type) {
		case 'hydrate':
			return sanitizeCartState(action.state);

		case 'add': {
			const requested = clampQuantity(action.quantity ?? 1);
			if (requested <= 0) return state;
			const existing = state.items.find((item) => sameLine(item, action.productId, action.variantId));
			if (existing) {
				return {
					...state,
					items: state.items.map((item) =>
						sameLine(item, action.productId, action.variantId)
							? { ...item, quantity: clampQuantity(item.quantity + requested) }
							: item,
					),
				};
			}
			return {
				...state,
				items: [...state.items, { productId: action.productId, variantId: action.variantId, quantity: requested }],
			};
		}

		case 'setQuantity': {
			const quantity = clampQuantity(action.quantity);
			if (quantity <= 0) {
				return { ...state, items: state.items.filter((item) => !sameLine(item, action.productId, action.variantId)) };
			}
			return {
				...state,
				items: state.items.map((item) =>
					sameLine(item, action.productId, action.variantId) ? { ...item, quantity } : item,
				),
			};
		}

		case 'remove':
			return { ...state, items: state.items.filter((item) => !sameLine(item, action.productId, action.variantId)) };

		case 'applyPromo':
			return { ...state, promoCode: normalizePromoCode(action.code) };

		case 'removePromo':
			return { ...state, promoCode: null };

		case 'clear':
			return initialCartState;

		default:
			return state;
	}
}
