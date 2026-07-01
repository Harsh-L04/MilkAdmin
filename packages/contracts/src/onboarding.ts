import { z } from 'zod';
import { phoneSchema, decimalString, cuid } from './common';

// ----- Onboarding lifecycle (spec §2.8) -----

export const onboardingStatusSchema = z.enum([
  'PENDING',
  'PROSPECTIVE',
  'ONBOARDED',
  'REJECTED',
]);
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type UserStatusInput = z.infer<typeof userStatusSchema>;

// A YYYY-MM month/year (shop establishment).
const monthYearSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

// Rejection note is mandatory whenever status is REJECTED.
const rejectionRefinement = <T extends { onboardingStatus?: OnboardingStatus; onboardingNote?: string }>(
  val: T,
  ctx: z.RefinementCtx,
) => {
  if (val.onboardingStatus === 'REJECTED' && !val.onboardingNote?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['onboardingNote'],
      message: 'A reason is required when status is Rejected',
    });
  }
};

// ----- Onboard Distributor (spec §2.8.1) -----

export const onboardDistributorSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    email: z.string().trim().email().optional(),
    phone: phoneSchema,
    region: z.string().trim().max(80).optional(),
    subArea: z.string().trim().max(80).optional(),
    address: z.string().trim().max(240).optional(),
    salesOfficerId: cuid.optional(),
    bankDetails: z.string().trim().max(240).optional(),
    pan: z.string().trim().max(20).optional(),
    securityDeposit: decimalString.optional(),
    onboardingStatus: onboardingStatusSchema.default('PENDING'),
    onboardingNote: z.string().trim().max(500).optional(),
    status: userStatusSchema.default('ACTIVE'),
  })
  .superRefine(rejectionRefinement);
export type OnboardDistributorInput = z.infer<typeof onboardDistributorSchema>;

// ----- Onboard Retailer (spec §2.8.2) -----

export const onboardRetailerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    email: z.string().trim().email().optional(),
    phone: phoneSchema,
    area: z.string().trim().max(80).optional(),
    subArea: z.string().trim().max(80).optional(),
    address: z.string().trim().max(240).optional(),
    salesOfficerId: cuid.optional(),
    distributorId: cuid,
    outletName: z.string().trim().min(1, 'Outlet name is required').max(120),
    shopEstablishedOn: monthYearSchema.optional(),
    brandsDealing: z.array(z.string().trim().min(1)).default([]),
    productsSold: z.array(cuid).default([]),
    monthlyTurnover: decimalString.optional(),
    bankDetails: z.string().trim().max(240).optional(),
    pan: z.string().trim().max(20).optional(),
    shopLicenseNo: z.string().trim().max(60).optional(),
    licenseImageKey: z.string().trim().max(200).optional(),
    securityDeposit: decimalString.optional(),
    instrumentNo: z.string().trim().max(60).optional(),
    instrumentDate: z.string().datetime().optional(),
    onboardingStatus: onboardingStatusSchema.default('PENDING'),
    onboardingNote: z.string().trim().max(500).optional(),
    status: userStatusSchema.default('ACTIVE'),
  })
  .superRefine(rejectionRefinement);
export type OnboardRetailerInput = z.infer<typeof onboardRetailerSchema>;

// ----- Onboard Sales Head / Sales Officer (spec §2.9) -----

export const onboardStaffSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    email: z.string().trim().email().optional(),
    phone: phoneSchema,
    role: z.enum(['SALES_HEAD', 'SALES_OFFICER']),
    // Required when role is SALES_OFFICER (a rep reports to a head).
    reportsToId: cuid.optional(),
    area: z.string().trim().max(80).optional(),
    subArea: z.string().trim().max(80).optional(),
    status: userStatusSchema.default('ACTIVE'),
  })
  .superRefine((val, ctx) => {
    if (val.role === 'SALES_OFFICER' && !val.reportsToId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reportsToId'],
        message: 'A Sales Officer must be assigned to a Sales Head',
      });
    }
  });
export type OnboardStaffInput = z.infer<typeof onboardStaffSchema>;

// ----- Update onboarding status (approve / reject / progress) -----

export const updateOnboardingSchema = z
  .object({
    onboardingStatus: onboardingStatusSchema,
    onboardingNote: z.string().trim().max(500).optional(),
    status: userStatusSchema.optional(),
  })
  .superRefine(rejectionRefinement);
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;

// ----- List DTOs -----

export interface OnboardedUserRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: 'DISTRIBUTOR' | 'RETAILER' | 'SALES_HEAD' | 'SALES_OFFICER';
  area: string | null;
  subArea: string | null;
  onboardedOn: string;
  onboardingStatus: OnboardingStatus | null;
  status: string;
  // Role-specific extras (outlet, distributor, sales head/officer names).
  extra?: Record<string, string | number | null>;
}
