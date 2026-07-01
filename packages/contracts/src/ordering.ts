import { z } from 'zod';
import { cuid, decimalString } from './common';

export const OrderStatus = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'IN_PRODUCTION',
  'DISPATCHED',
  'DELIVERED',
  'SETTLED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const orderItemInputSchema = z.object({
  productId: cuid,
  qty: decimalString.refine((v) => Number(v) > 0, 'Quantity must be positive'),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const OrderType = z.enum(['RETAILER', 'SELF']);
export type OrderType = z.infer<typeof OrderType>;

export const createOrderSchema = z.object({
  orderWindowId: cuid,
  items: z.array(orderItemInputSchema).min(1, 'Order needs at least one item'),
  // Distributors may tag an order as a self-order for hawkers (spec §2.5).
  orderType: OrderType.default('RETAILER'),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const submitOrderSchema = z.object({
  orderId: cuid,
});
export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;

// Manual approval action by a distributor / sales officer for exception orders.
export const reviewOrderSchema = z.object({
  orderId: cuid,
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(500).optional(),
});
export type ReviewOrderInput = z.infer<typeof reviewOrderSchema>;

// Forward lifecycle after approval (handled by the order state machine).
export const advanceOrderSchema = z.object({
  orderId: cuid,
  toStatus: z.enum([
    'IN_PRODUCTION',
    'DISPATCHED',
    'DELIVERED',
    'SETTLED',
    'CANCELLED',
  ]),
});
export type AdvanceOrderInput = z.infer<typeof advanceOrderSchema>;

export const standingOrderItemSchema = z.object({
  productId: cuid,
  qty: decimalString.refine((v) => Number(v) > 0, 'Quantity must be positive'),
});

export const upsertStandingOrderSchema = z.object({
  retailerId: cuid,
  name: z.string().trim().max(80).optional(),
  // 7-bit weekday mask, Monday = bit 0. 127 = every day.
  weekdayMask: z.number().int().min(1).max(127).default(127),
  active: z.boolean().default(true),
  items: z.array(standingOrderItemSchema).min(1),
});
export type UpsertStandingOrderInput = z.infer<typeof upsertStandingOrderSchema>;

export interface StandingOrderLineDto {
  productId: string;
  qty: number;
  product?: {
    id: string;
    sku: string;
    name: string;
    category: string;
    uom: string;
    packSize: string;
    taxRate: string;
    isReturnablePack: boolean;
    active: boolean;
  };
}

export interface StandingOrderDto {
  id: string;
  name: string | null;
  retailerId: string;
  retailer: string;
  weekdayMask: number;
  active: boolean;
  items: StandingOrderLineDto[];
}
