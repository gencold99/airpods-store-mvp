import { describe, expect, it } from 'vitest';
import { initialPaymentState, mockPaymentProvider, paymentReducer } from './payment';
import { money } from './money';

describe('payment state machine', () => {
  it('only reaches success after submitting', () => {
    const submitting = paymentReducer(initialPaymentState, { type: 'submit' });
    const success = paymentReducer(submitting, { type: 'succeed', reference: 'PAY-1' });
    expect(submitting.status).toBe('submitting');
    expect(success.status).toBe('success');
    expect(paymentReducer(initialPaymentState, { type: 'succeed', reference: 'PAY-1' })).toEqual(initialPaymentState);
  });

  it('supports success and declined demo cards', async () => {
    const base = { amount: money(1490000), expiry: '12/99', cvc: '123', orderReference: 'BF-1' };
    expect((await mockPaymentProvider.authorize({ ...base, cardNumber: '4111 1111 1111 1111' })).ok).toBe(true);
    expect((await mockPaymentProvider.authorize({ ...base, cardNumber: '4000 0000 0000 0002' })).ok).toBe(false);
  });
});
