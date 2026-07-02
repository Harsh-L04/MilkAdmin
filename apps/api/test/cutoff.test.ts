import { describe, it, expect } from 'vitest';
import {
  isWindowOpen,
  shouldLock,
  pickOpenWindow,
  type SelectableWindow,
} from '../src/ordering/domain/cutoff';

const cutoff = new Date('2026-06-24T18:00:00Z');
const before = new Date('2026-06-24T17:59:59Z');
const after = new Date('2026-06-24T18:00:01Z');

describe('isWindowOpen', () => {
  it('returns true when OPEN and before cutoff', () => {
    expect(isWindowOpen({ status: 'OPEN', cutoffAt: cutoff }, before)).toBe(true);
  });

  it('returns false when OPEN and at cutoff (exclusive)', () => {
    expect(isWindowOpen({ status: 'OPEN', cutoffAt: cutoff }, cutoff)).toBe(false);
  });

  it('returns false when OPEN and after cutoff', () => {
    expect(isWindowOpen({ status: 'OPEN', cutoffAt: cutoff }, after)).toBe(false);
  });

  it('returns false when LOCKED regardless of time', () => {
    expect(isWindowOpen({ status: 'LOCKED', cutoffAt: cutoff }, before)).toBe(false);
    expect(isWindowOpen({ status: 'LOCKED', cutoffAt: cutoff }, after)).toBe(false);
  });

  it('returns false when CLOSED regardless of time', () => {
    expect(isWindowOpen({ status: 'CLOSED', cutoffAt: cutoff }, before)).toBe(false);
    expect(isWindowOpen({ status: 'CLOSED', cutoffAt: cutoff }, after)).toBe(false);
  });

  it('returns false when DISPATCHED regardless of time', () => {
    expect(isWindowOpen({ status: 'DISPATCHED', cutoffAt: cutoff }, before)).toBe(false);
  });
});

describe('shouldLock', () => {
  it('returns true when OPEN and after cutoff', () => {
    expect(shouldLock({ status: 'OPEN', cutoffAt: cutoff }, after)).toBe(true);
  });

  it('returns false when OPEN and before cutoff', () => {
    expect(shouldLock({ status: 'OPEN', cutoffAt: cutoff }, before)).toBe(false);
  });

  it('returns false when LOCKED even after cutoff', () => {
    expect(shouldLock({ status: 'LOCKED', cutoffAt: cutoff }, after)).toBe(false);
  });

  it('returns false when CLOSED even after cutoff', () => {
    expect(shouldLock({ status: 'CLOSED', cutoffAt: cutoff }, after)).toBe(false);
  });

  it('returns true when OPEN and exactly at cutoff', () => {
    expect(shouldLock({ status: 'OPEN', cutoffAt: cutoff }, cutoff)).toBe(true);
  });
});

describe('pickOpenWindow', () => {
  const mk = (
    id: string,
    deliveryDate: string,
    cutoffAt: string,
    status: 'OPEN' | 'LOCKED' | 'DISPATCHED' | 'CLOSED' = 'OPEN',
  ): SelectableWindow => ({
    id,
    status,
    deliveryDate: new Date(deliveryDate),
    cutoffAt: new Date(cutoffAt),
  });

  it('returns the soonest open window', () => {
    const now = new Date('2026-06-26T08:00:00Z');
    const r = pickOpenWindow(
      [
        mk('late', '2026-06-28', '2026-06-26T18:00:00Z'),
        mk('soon', '2026-06-27', '2026-06-26T18:00:00Z'),
      ],
      now,
    );
    expect(r?.id).toBe('soon');
  });

  it('returns null when list is empty', () => {
    expect(pickOpenWindow([], new Date('2026-06-26T08:00:00Z'))).toBeNull();
  });

  it('returns null when all windows are LOCKED', () => {
    const now = new Date('2026-06-26T08:00:00Z');
    expect(
      pickOpenWindow(
        [mk('a', '2026-06-27', '2026-06-26T18:00:00Z', 'LOCKED')],
        now,
      ),
    ).toBeNull();
  });

  it('returns null when the only OPEN window has passed cutoff', () => {
    const now = new Date('2026-06-26T08:00:00Z');
    expect(
      pickOpenWindow([mk('a', '2026-06-27', '2026-06-26T07:00:00Z')], now),
    ).toBeNull();
  });

  it('handles DST spring-forward boundary', () => {
    const now = new Date('2026-03-08T06:00:00Z'); // US spring-forward day
    const w = mk('dst', '2026-03-09', '2026-03-08T10:00:00Z');
    expect(isWindowOpen(w, now)).toBe(true);
  });

  it('handles DST fall-back boundary', () => {
    const now = new Date('2026-11-01T06:00:00Z'); // US fall-back day
    const w = mk('dst', '2026-11-02', '2026-11-01T10:00:00Z');
    expect(isWindowOpen(w, now)).toBe(true);
  });

  it('handles midnight cutoff edge case', () => {
    const now = new Date('2026-06-25T23:59:59Z');
    const w = mk('midnight', '2026-06-26', '2026-06-26T00:00:00Z');
    expect(isWindowOpen(w, now)).toBe(true);
    expect(isWindowOpen(w, new Date('2026-06-26T00:00:00Z'))).toBe(false);
  });
});
