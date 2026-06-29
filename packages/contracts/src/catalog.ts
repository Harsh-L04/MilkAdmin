import { z } from 'zod';
import { decimalString } from './common';

export const ProductCategory = z.enum(['MILK', 'DAIRY']);
export type ProductCategory = z.infer<typeof ProductCategory>;

export const Uom = z.enum(['LITRE', 'ML', 'KG', 'GRAM', 'PIECE', 'POUCH']);
export type Uom = z.infer<typeof Uom>;

export const productDtoSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: ProductCategory,
  uom: Uom,
  packSize: z.string(),
  taxRate: z.string(),
  hsnCode: z.string().nullable(),
  shelfLifeDays: z.number().nullable(),
  isReturnablePack: z.boolean(),
  active: z.boolean(),
});
export type ProductDto = z.infer<typeof productDtoSchema>;

export const listProductsQuerySchema = z.object({
  category: ProductCategory.optional(),
  active: z.coerce.boolean().optional(),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

/** Create / edit payload for the admin catalog. Decimals travel as strings. */
export const upsertProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(40)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, 'Name is required').max(120),
  category: ProductCategory,
  uom: Uom,
  packSize: decimalString.refine((v) => Number(v) > 0, 'Pack size must be greater than 0'),
  taxRate: decimalString.refine(
    (v) => Number(v) >= 0 && Number(v) <= 100,
    'Tax rate must be between 0 and 100',
  ),
  hsnCode: z.string().trim().max(20).optional(),
  shelfLifeDays: z.number().int().min(0).max(3650).optional(),
  isReturnablePack: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type UpsertProductInput = z.infer<typeof upsertProductSchema>;

/** PATCH payload — any subset of the editable fields (e.g. just `active`). */
export const updateProductSchema = upsertProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
