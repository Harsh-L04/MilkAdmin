import { z } from 'zod';
import { cuid, decimalString } from './common';

export const paymentModeSchema = z.enum(['CASH', 'UPI', 'CHEQUE', 'OTHER']);
export type PaymentMode = z.infer<typeof paymentModeSchema>;

export const recordCollectionSchema = z.object({
  retailerId: cuid,
  amount: decimalString.refine((v) => Number(v) > 0, 'Amount must be positive'),
  mode: paymentModeSchema.default('CASH'),
  note: z.string().trim().max(200).optional(),
});
export type RecordCollectionInput = z.infer<typeof recordCollectionSchema>;

export interface LedgerEntryDto {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  refType: string;
  refId: string | null;
  balanceAfter: string;
  note: string | null;
  createdAt: string;
}

export interface OutletLedgerDto {
  retailerId: string;
  outletName: string;
  balance: string;
  creditLimit: string;
  entries: LedgerEntryDto[];
}
