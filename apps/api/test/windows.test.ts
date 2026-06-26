import { describe, it, expect } from 'vitest';
import { pickOpenWindow } from '../src/ordering/domain/cutoff';

const mk = (
  id: string,
  status: 'OPEN' | 'LOCKED',
  deliveryDate: string,
  cutoffAt: string,
) => ({
  id,
  status: status as 'OPEN' | 'LOCKED',
  deliveryDate: new Date(deliveryDate),
  cutoffAt: new Date(cutoffAt),
});

const now = new Date('2026-06-26T08:00:00Z');

describe('pickOpenWindow', () => {
  it('returns null when nothing is open', () => {
    expect(
      pickOpenWindow([mk('a', 'LOCKED', '2026-06-27', '2026-06-26T18:00:00Z')], now),
    ).toBeNull();
  });

  it('ignores OPEN windows whose cutoff has passed', () => {
    expect(
      pickOpenWindow([mk('a', 'OPEN', '2026-06-27', '2026-06-26T07:00:00Z')], now),
    ).toBeNull();
  });

  it('returns the soonest-delivery open window', () => {
    const r = pickOpenWindow(
      [
        mk('late', 'OPEN', '2026-06-28', '2026-06-26T18:00:00Z'),
        mk('soon', 'OPEN', '2026-06-27', '2026-06-26T18:00:00Z'),
      ],
      now,
    );
    expect(r?.id).toBe('soon');
  });
});
