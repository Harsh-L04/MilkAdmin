import { describe, it, expect } from 'vitest';
import {
  weekdayBit,
  isStandingDue,
  dueStandingOrders,
} from '../src/standing/domain/standing-generation';

const monday = new Date('2026-06-29T00:00:00Z');
const tuesday = new Date('2026-06-30T00:00:00Z');
const wednesday = new Date('2026-07-01T00:00:00Z');
const thursday = new Date('2026-07-02T00:00:00Z');
const friday = new Date('2026-07-03T00:00:00Z');
const saturday = new Date('2026-07-04T00:00:00Z');
const sunday = new Date('2026-06-28T00:00:00Z');

describe('weekdayBit', () => {
  it('maps Monday to 0', () => {
    expect(weekdayBit(monday)).toBe(0);
  });

  it('maps Tuesday to 1', () => {
    expect(weekdayBit(tuesday)).toBe(1);
  });

  it('maps Wednesday to 2', () => {
    expect(weekdayBit(wednesday)).toBe(2);
  });

  it('maps Thursday to 3', () => {
    expect(weekdayBit(thursday)).toBe(3);
  });

  it('maps Friday to 4', () => {
    expect(weekdayBit(friday)).toBe(4);
  });

  it('maps Saturday to 5', () => {
    expect(weekdayBit(saturday)).toBe(5);
  });

  it('maps Sunday to 6', () => {
    expect(weekdayBit(sunday)).toBe(6);
  });
});

describe('isStandingDue', () => {
  it('returns true when mask includes the weekday (Monday bit)', () => {
    expect(isStandingDue(0b0000001, monday)).toBe(true);
  });

  it('returns true when mask=127 (every day)', () => {
    expect(isStandingDue(127, sunday)).toBe(true);
    expect(isStandingDue(127, monday)).toBe(true);
  });

  it('returns false when mask=0 (never)', () => {
    expect(isStandingDue(0, monday)).toBe(false);
    expect(isStandingDue(0, sunday)).toBe(false);
  });

  it('returns false when mask excludes the weekday', () => {
    expect(isStandingDue(0b0000001, sunday)).toBe(false);
  });

  it('returns true for Sunday with Sunday bit set', () => {
    expect(isStandingDue(0b1000000, sunday)).toBe(true);
  });

  it('returns true for Monday-Mask on Monday and false on Tuesday', () => {
    expect(isStandingDue(0b0000001, monday)).toBe(true);
    expect(isStandingDue(0b0000001, tuesday)).toBe(false);
  });
});

describe('dueStandingOrders', () => {
  it('filters active orders due on the delivery date', () => {
    const list = [
      { id: 'a', active: true, weekdayMask: 127 },
      { id: 'b', active: false, weekdayMask: 127 },
      { id: 'c', active: true, weekdayMask: 0b1000000 },
    ];
    expect(dueStandingOrders(list, monday).map((s) => s.id)).toEqual(['a']);
  });

  it('returns empty array when no standings are due', () => {
    const list = [
      { id: 'a', active: true, weekdayMask: 0b1000000 },
    ];
    expect(dueStandingOrders(list, monday)).toEqual([]);
  });

  it('returns empty array when no standings are active', () => {
    const list = [
      { id: 'a', active: false, weekdayMask: 127 },
    ];
    expect(dueStandingOrders(list, monday)).toEqual([]);
  });

  it('returns multiple due orders', () => {
    const list = [
      { id: 'a', active: true, weekdayMask: 127 },
      { id: 'b', active: true, weekdayMask: 0b0000001 },
    ];
    expect(dueStandingOrders(list, monday).map((s) => s.id)).toEqual(['a', 'b']);
  });
});
