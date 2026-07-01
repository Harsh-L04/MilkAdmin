import { describe, it, expect } from 'vitest';
import {
  weekdayBit,
  isStandingDue,
  dueStandingOrders,
} from '../src/standing/domain/standing-generation';

// 2026-06-29 is a Monday; 2026-06-28 is a Sunday (UTC).
const monday = new Date('2026-06-29T00:00:00Z');
const sunday = new Date('2026-06-28T00:00:00Z');

describe('weekdayBit', () => {
  it('maps Monday to 0 and Sunday to 6 (matches the schema mask)', () => {
    expect(weekdayBit(monday)).toBe(0);
    expect(weekdayBit(sunday)).toBe(6);
  });
});

describe('isStandingDue', () => {
  it('is true when the mask includes the delivery weekday', () => {
    expect(isStandingDue(0b0000001, monday)).toBe(true); // Monday bit set
    expect(isStandingDue(127, sunday)).toBe(true); // every day
  });

  it('is false when the mask excludes the delivery weekday', () => {
    expect(isStandingDue(0b0000001, sunday)).toBe(false); // Monday-only, deliver Sunday
    expect(isStandingDue(0, monday)).toBe(false); // never
  });
});

describe('dueStandingOrders', () => {
  it('keeps only active orders that are due on the delivery date', () => {
    const list = [
      { id: 'a', active: true, weekdayMask: 127 }, // every day -> due
      { id: 'b', active: false, weekdayMask: 127 }, // inactive -> excluded
      { id: 'c', active: true, weekdayMask: 0b1000000 }, // Sunday-only -> not due Monday
    ];
    expect(dueStandingOrders(list, monday).map((s) => s.id)).toEqual(['a']);
  });
});
