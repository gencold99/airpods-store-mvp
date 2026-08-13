import { describe, expect, it } from 'vitest';
import { evaluatePromo } from './promo';

describe('promo evaluation', () => {
  it('accepts a valid code case-insensitively', () => {
    const result = evaluatePromo('bright10', new Date('2026-08-13T00:00:00Z'));
    expect(result.status).toBe('valid');
    expect(result.code).toBe('BRIGHT10');
  });

  it('distinguishes expired and invalid codes', () => {
    expect(evaluatePromo('winter24', new Date('2026-08-13T00:00:00Z')).status).toBe('expired');
    expect(evaluatePromo('missing', new Date('2026-08-13T00:00:00Z')).status).toBe('invalid');
  });
});
