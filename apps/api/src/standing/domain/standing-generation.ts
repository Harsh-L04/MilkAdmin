/**
 * Pure logic for materializing standing orders into a delivery date's window.
 * No clock, no DB — the caller supplies the candidate list and the date.
 *
 * Weekday mask convention (matches the Prisma schema): 7-bit, Monday = bit 0 …
 * Sunday = bit 6. 127 = every day.
 */

export interface DueStanding {
  weekdayMask: number;
  active: boolean;
}

/** Weekday bit for a delivery date — Monday = 0 … Sunday = 6. */
export function weekdayBit(date: Date): number {
  // JS getUTCDay: Sunday = 0 … Saturday = 6. Shift so Monday = 0.
  return (date.getUTCDay() + 6) % 7;
}

/** Whether a standing order's mask includes the delivery date's weekday. */
export function isStandingDue(weekdayMask: number, date: Date): boolean {
  return (weekdayMask & (1 << weekdayBit(date))) !== 0;
}

/** Active standing orders that are due on the given delivery date. */
export function dueStandingOrders<T extends DueStanding>(
  standingOrders: T[],
  date: Date,
): T[] {
  return standingOrders.filter(
    (s) => s.active && isStandingDue(s.weekdayMask, date),
  );
}
