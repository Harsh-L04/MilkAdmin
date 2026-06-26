export type WindowStatus = 'OPEN' | 'LOCKED' | 'DISPATCHED' | 'CLOSED';

export interface OrderWindowLike {
  status: WindowStatus;
  cutoffAt: Date;
}

/**
 * A window accepts new/edited orders only while OPEN and before its cutoff.
 * Milk is produced overnight; once cutoff passes, demand must be frozen so
 * production can plan. Pure function — no clock dependency, caller passes now.
 */
export function isWindowOpen(window: OrderWindowLike, now: Date): boolean {
  return window.status === 'OPEN' && now.getTime() < window.cutoffAt.getTime();
}

/** True when an OPEN window has passed its cutoff and should be auto-LOCKED. */
export function shouldLock(window: OrderWindowLike, now: Date): boolean {
  return window.status === 'OPEN' && now.getTime() >= window.cutoffAt.getTime();
}

export interface SelectableWindow extends OrderWindowLike {
  deliveryDate: Date;
}

/**
 * The window a retailer should order into right now: OPEN, before cutoff,
 * soonest delivery first. Pure — caller supplies `now` and the candidate list.
 */
export function pickOpenWindow<T extends SelectableWindow>(
  windows: T[],
  now: Date,
): T | null {
  const open = windows
    .filter((w) => isWindowOpen(w, now))
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());
  return open[0] ?? null;
}
