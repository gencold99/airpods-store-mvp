import { describe, expect, it } from 'vitest';
import { cartReducer, initialCartState } from './cartReducer';

describe('cartReducer', () => {
  it('adds and clamps quantities', () => {
    const added = cartReducer(initialCartState, { type: 'add', productId: 'airpods-4', variantId: 'standard', quantity: 2 });
    const capped = cartReducer(added, { type: 'add', productId: 'airpods-4', variantId: 'standard', quantity: 99 });
    expect(capped.items[0].quantity).toBe(10);
  });

  it('removes a line when quantity reaches zero', () => {
    const state = cartReducer(initialCartState, { type: 'add', productId: 'airpods-4', variantId: 'standard' });
    const next = cartReducer(state, { type: 'setQuantity', productId: 'airpods-4', variantId: 'standard', quantity: 0 });
    expect(next.items).toHaveLength(0);
  });
});
