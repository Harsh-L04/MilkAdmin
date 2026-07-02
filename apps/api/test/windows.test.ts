import { describe, it, expect } from 'vitest';
import { pickOpenWindow, isWindowOpen, type SelectableWindow } from '../src/ordering/domain/cutoff';

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

describe('pickOpenWindow', () => {
  const now = new Date('2026-06-26T08:00:00Z');

  it('returns null when nothing is open', () => {
    expect(
      pickOpenWindow([mk('a', '2026-06-27', '2026-06-26T18:00:00Z', 'LOCKED')], now),
    ).toBeNull();
  });

  it('ignores OPEN windows whose cutoff has passed', () => {
    expect(
      pickOpenWindow([mk('a', '2026-06-27', '2026-06-26T07:00:00Z')], now),
    ).toBeNull();
  });

  it('returns the soonest-delivery open window', () => {
    const r = pickOpenWindow(
      [
        mk('late', '2026-06-28', '2026-06-26T18:00:00Z'),
        mk('soon', '2026-06-27', '2026-06-26T18:00:00Z'),
      ],
      now,
    );
    expect(r?.id).toBe('soon');
  });

  it('picks the earliest delivery date among multiple', () => {
    const r = pickOpenWindow(
      [
        mk('a', '2026-06-29', '2026-06-26T18:00:00Z'),
        mk('b', '2026-06-28', '2026-06-26T18:00:00Z'),
        mk('c', '2026-06-27', '2026-06-26T18:00:00Z'),
      ],
      now,
    );
    expect(r?.id).toBe('c');
  });

  it('ignores LOCKED windows even with earlier delivery', () => {
    const r = pickOpenWindow(
      [
        mk('locked-early', '2026-06-26', '2026-06-26T18:00:00Z', 'LOCKED'),
        mk('open-later', '2026-06-27', '2026-06-26T18:00:00Z', 'OPEN'),
      ],
      now,
    );
    expect(r?.id).toBe('open-later');
  });

  it('handles DST transition windows', () => {
    const dst = new Date('2026-03-08T07:00:00Z');
    const r = pickOpenWindow(
      [mk('dst-window', '2026-03-09', '2026-03-08T10:00:00Z')],
      dst,
    );
    expect(r?.id).toBe('dst-window');
  });
});
