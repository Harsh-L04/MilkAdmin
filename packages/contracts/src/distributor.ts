import { z } from 'zod';
import { phoneSchema } from './common';

// ----- Distributor profile -----

export const updateProfileSchema = z.object({
  businessName: z.string().trim().min(1).max(120).optional(),
  contactName: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().max(240).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface ProfileDto {
  businessName: string;
  contactName: string;
  address: string | null;
  phone: string;
  region: string | null;
}

// ----- Customers (retailers the distributor manages) -----

// 15-char GSTIN. Optional — many small outlets are unregistered.
const gstinSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/,
    'Enter a valid 15-character GSTIN',
  );

export const createCustomerSchema = z.object({
  outletName: z.string().trim().min(1, 'Outlet name is required').max(120),
  address: z.string().trim().min(1, 'Address is required').max(240),
  route: z.string().trim().min(1, 'Route is required').max(60),
  gstin: gstinSchema.optional(),
  // E.164; also used as the WhatsApp number.
  phone: phoneSchema,
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export interface CustomerDto {
  id: string;
  outletName: string;
  address: string | null;
  route: string | null;
  gstin: string | null;
  phone: string;
  createdAt: string;
}
