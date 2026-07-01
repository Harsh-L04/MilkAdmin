import { z } from 'zod';

// ----- Global settings (spec §8) -----

// Daily order placement deadline as 24h HH:MM local time. Empty string clears it.
export const orderDeadlineSchema = z.object({
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM')
    .or(z.literal('')),
});
export type OrderDeadlineInput = z.infer<typeof orderDeadlineSchema>;

export interface OrderDeadlineDto {
  /** HH:MM, or null when no deadline is configured. */
  time: string | null;
}
