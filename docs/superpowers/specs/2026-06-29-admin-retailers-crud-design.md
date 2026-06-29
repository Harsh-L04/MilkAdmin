# Admin Retailers CRUD (edit + deactivate)

Date: 2026-06-29 · Status: approved

Second slice of the admin CRUD initiative (after Products). Create already
exists (`POST /customers`, used by the mobile app); this adds **edit** and
**deactivate/activate** to the admin retailers page. Follows the same
contracts → API → web-form pattern.

## Decisions

- **Soft-delete via `status`:** "Deactivate" sets the retailer's `status` to
  `SUSPENDED`; "Activate" restores `ACTIVE`. Orders & ledger are preserved.
- **Phone is immutable** in edit — it is the retailer's unique login key
  (changing it is a separate flow). Sales-rep reassignment is also deferred
  (needs a team picker), out of scope here.
- **Scope-aware authz:** `ADMIN`/`SALES_HEAD` may edit any outlet;
  `DISTRIBUTOR`/`SALES_OFFICER` only their own (checked in the service against
  the retailer's `distributorId`).
- **No DB migration** — uses the existing `Retailer.status` (`UserStatus`).

## Backend (`Milk/`)

- **Contracts** (`packages/contracts/src/distributor.ts`): `customerStatusSchema`
  (`ACTIVE | SUSPENDED`), `updateCustomerSchema` (partial: outletName, address,
  route, gstin, whatsapp, paymentTerms, outletType, status — **no phone**), and
  `status` added to `CustomerDto`.
- **Controller** (`distributor.controller.ts`): `PATCH /customers/:id`, roles
  `ADMIN, SALES_HEAD, DISTRIBUTOR, SALES_OFFICER`.
- **Service** (`distributor.service.ts`): `updateCustomer(user, id, input)` —
  loads the retailer, enforces scope (HQ any / rep own), route find-or-create
  under the **outlet's own** distributor, applies the partial update incl.
  `status`. `toCustomerDto` now returns `status`. 404 if not found, 403 if out
  of scope.

## Frontend (`Milk/apps/web`)

- **`lib/api.ts`** — `retailers.update(id, input)` → `PATCH /customers/:id`.
- **`features/network/use-network.ts`** — `useUpdateRetailer()` invalidating
  `['admin','retailers']`.
- **`features/network/retailer-form-dialog.tsx`** (new) — edit dialog prefilled
  from the `RetailerRow`, validated by `updateCustomerSchema`. Optional fields
  are omitted when blank (strict GSTIN/phone schemas reject empty strings).
  Mirrors the product form dialog (Dialog + `useToast` + mutation).
- **`app/(app)/retailers/page.tsx`** — per-row actions dropdown (Edit,
  Deactivate/Activate) with `stopPropagation` so it doesn't trigger the row's
  navigation to the detail page; a confirm dialog for status changes.

## Verification

Monorepo `typecheck`, `lint`, `build` (contracts/api/web). No runtime
screenshot (needs Postgres + API).

## Branching

`feat/admin-retailers-crud` off `main` (independent of the products branch —
different files). Commit only the listed files (repo has unrelated deploy WIP).

## Follow-ups

Add **Create retailer** on the web (mobile-only today), Distributors (full),
Sales Visits (edit/cancel), Orders (cancel/void).
