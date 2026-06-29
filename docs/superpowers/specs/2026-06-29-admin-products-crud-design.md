# Admin Products CRUD

Date: 2026-06-29 · Status: approved

First vertical slice of admin CRUD. Establishes the contracts → API → web-form
pattern that Distributors, Retailers, Orders, and Sales Visits will copy. The
admin pages are read-only lists today; this adds create / edit / deactivate for
Products.

## Decisions

- **Soft-delete:** no DELETE route. "Deactivate" sets `active = false`
  (preserves orders/price-list/standing references); "Activate" restores it.
- **Authz:** catalog is HQ-global (not distributor-scoped), so writes are gated
  to `ADMIN` and `SALES_HEAD`.
- **No DB migration:** `hsnCode` and `shelfLifeDays` already exist on the Prisma
  `Product` model — this only exposes them.

## Backend (`Milk/`)

**Contracts** (`packages/contracts/src/catalog.ts`)
- Extend `productDtoSchema` with `hsnCode: z.string().nullable()` and
  `shelfLifeDays: z.number().nullable()`.
- New `upsertProductSchema`:
  - `sku` (trimmed, uppercased, 1–40), `name` (1–120),
  - `category` (`ProductCategory`), `uom` (`Uom`),
  - `packSize` (decimal string, > 0), `taxRate` (decimal string, 0–100),
  - `hsnCode` (optional string), `shelfLifeDays` (optional int ≥ 0),
  - `isReturnablePack` (bool, default false), `active` (bool, default true).
  - `updateProductSchema = upsertProductSchema.partial()` for PATCH.

**Controller** (`apps/api/src/catalog/catalog.controller.ts`),
`@Roles('ADMIN', 'SALES_HEAD')`:
- `POST /catalog/products` → `createProduct`
- `PATCH /catalog/products/:id` → `updateProduct` (also performs
  deactivate/restore via `{ active }`)

**Service** (`apps/api/src/catalog/catalog.service.ts`)
- `createProduct(input)`, `updateProduct(id, input)`.
- SKU uniqueness via the existing DB unique constraint → catch Prisma `P2002`
  → `ConflictException` ("A product with this SKU already exists").
- `updateProduct` 404s (`NotFoundException`) when the id doesn't exist.
- Shared `toDto` mapper extended with the two new fields.

## Frontend (`Milk/apps/web`)

- **`lib/api.ts`** — `catalog.createProduct(input)` (`POST`),
  `catalog.updateProduct(id, input)` (`PATCH`).
- **`features/catalog/use-products.ts`** — `useCreateProduct()` /
  `useUpdateProduct()`, both invalidating `['products']` (mirrors
  `use-ledger.ts`).
- **`features/catalog/product-form-dialog.tsx`** (new) — a Dialog reused for
  create and edit, mirroring `features/orders/review-dialog.tsx` (Dialog +
  `useToast` + mutation). Validated client-side by `upsertProductSchema`. Fields:
  name, SKU, category + uom selects, pack size, tax %, HSN, shelf-life days,
  returnable + active toggles. Surfaces the API `message` on error (e.g. the
  409 SKU conflict).
- **`app/(app)/products/page.tsx`** — "Add product" button in `PageHeader`;
  per-row actions via `dropdown-menu` (Edit, Deactivate/Activate) on both the
  desktop table and the mobile cards. Deactivate/activate confirms via a small
  dialog before mutating (reversible, so lightweight).

## Verification

Monorepo gates: `npm run typecheck`, `npm run lint`, `npm run build` (turbo,
covering `contracts`, `api`, `web`). No runtime screenshot here — it needs
Postgres + the API running (see `RUNNING.md`); offered as a follow-up.

## Branching

Branch `feat/admin-products-crud` off `main`. The repo has unrelated
deploy-config WIP in the working tree; commits include only the files listed
above.

## Follow-ups (out of scope)

Repeat the pattern for Retailers (edit + deactivate; create exists),
Distributors (full), Sales Visits (edit/cancel), and Orders (cancel/void).
