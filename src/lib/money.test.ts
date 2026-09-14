import { describe, expect, it } from 'vitest';
import { formatMoney, sumAmounts, toAmount } from './money';

const nbsp = (text: string) => text.replace(/ | /g, ' ');

describe('formatMoney', () => {
  it('formats euros in both languages', () => {
    expect(nbsp(formatMoney(2, 'pt-PT'))).toBe('2,00 €');
    expect(nbsp(formatMoney(2, 'en-GB'))).toBe('€2.00');
    expect(nbsp(formatMoney(1234.5, 'pt-PT'))).toBe('1234,50 €');
  });

  it('treats null as zero', () => {
    expect(nbsp(formatMoney(null, 'pt-PT'))).toBe('0,00 €');
  });
});

describe('amounts', () => {
  it('rounds to cents and survives strings from PostgREST', () => {
    expect(toAmount('2.00')).toBe(2);
    expect(toAmount(0.1 + 0.2)).toBe(0.3);
    expect(toAmount(undefined)).toBe(0);
  });

  it('sums without floating point noise', () => {
    expect(sumAmounts([{ a: 0.1 }, { a: 0.2 }], (row) => row.a)).toBe(0.3);
  });
});
