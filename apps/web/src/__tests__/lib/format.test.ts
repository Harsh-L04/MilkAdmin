import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatMoneyCompact,
  formatQty,
  formatNumber,
  formatDate,
  formatDateTime,
  formatRelative,
  humanizeEnum,
  initials,
} from '@/lib/format';

describe('formatMoney', () => {
  it('formats INR currency', () => {
    const result = formatMoney('1500');
    expect(result).toMatch(/1,500/);
    expect(result).toContain('₹');
  });

  it('returns — for null/undefined', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('')).toBe('—');
  });

  it('handles numbers', () => {
    const result = formatMoney(250.5);
    expect(result).toContain('₹');
  });
});

describe('formatMoneyCompact', () => {
  it('formats lakhs', () => {
    expect(formatMoneyCompact(250000)).toMatch(/2\.50L/);
  });

  it('formats crores', () => {
    expect(formatMoneyCompact(50000000)).toMatch(/Cr/);
  });

  it('formats thousands', () => {
    expect(formatMoneyCompact(5000)).toContain('K');
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2024-03-15T10:30:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('2024');
  });

  it('returns — for null', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatRelative', () => {
  it('returns relative time strings', () => {
    expect(formatRelative(new Date().toISOString())).toBe('just now');
  });
});

describe('humanizeEnum', () => {
  it('converts SCREAMING_SNAKE to Title Case', () => {
    expect(humanizeEnum('IN_PRODUCTION')).toBe('In Production');
    expect(humanizeEnum('DRAFT')).toBe('Draft');
  });
});

describe('initials', () => {
  it('extracts initials from name', () => {
    expect(initials('John Doe')).toBe('JD');
    expect(initials('Alice')).toBe('A');
  });
});
