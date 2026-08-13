'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { cartReducer, initialCartState, type CartAction, type CartState } from './cartReducer';

const STORAGE_KEY = 'bright-future.cart.v1';

type CartContextValue = {
	state: CartState;
	dispatch: Dispatch<CartAction>;
	itemCount: number;
	hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(cartReducer, initialCartState);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (raw) dispatch({ type: 'hydrate', state: JSON.parse(raw) });
		} catch {
			/* corrupted storage is ignored and replaced on next write */
		}
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			/* storage may be unavailable (private mode); cart still works in memory */
		}
	}, [state, hydrated]);

	const value = useMemo<CartContextValue>(
		() => ({
			state,
			dispatch,
			itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
			hydrated,
		}),
		[state, hydrated],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
	const context = useContext(CartContext);
	if (!context) throw new Error('useCart must be used inside CartProvider');
	return context;
}
