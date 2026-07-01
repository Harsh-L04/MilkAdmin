# Resume Context — Milk Admin

## Current State
- **Branch**: `feat/password-auth-file-upload` (pushed to `origin`)
- **Last commit**: `42a97f0` — `feat: password auth (bcrypt) + MinIO file upload (Epic 1 foundations)`
- **Working tree**: clean, nothing to commit

## What Was Completed (Epic 1 — Foundations)
- Password auth (bcrypt) with `login` and `changePassword` endpoints — `apps/api/src/auth/`
- MinIO file upload / download / presigned URL module — `apps/api/src/file/`
- Zod validation schemas for auth + file in `packages/contracts/src/`
- Prisma migration `20260701045426_add_password_hash` — adds `passwordHash` to User model
- Seed script sets bcrypt hash `Moderns@2026` for all seeded users — `packages/database/src/seed.ts`
- Onboarding service sets initial password on user creation — `apps/api/src/onboarding/`
- Env validation for MinIO + bcrypt config — `apps/api/src/config/env.validation.ts`
- **All endpoints tested** — health, login (correct + wrong pw), change-password, OTP fallback, file upload (multipart to MinIO), file download (presigned URL redirect, auth-gated)

## Architecture
- **Backend**: NestJS (port 4000) at `Milk Admin/apps/api/`
- **Database**: PostgreSQL via Prisma, schema at `packages/database/prisma/schema.prisma`
- **Contracts**: Zod schemas at `packages/contracts/src/`, re-exported from `index.ts`
- **Frontends**:
  - MilkApp (Expo/RN) at `Milk Admin/apps/mobile/`
  - Admin Web (Next.js) at `Milk Admin/apps/web/`
- **Infra**: MinIO at localhost:9000 in docker-compose

## What to Do Next (Epic 2 + Epic 3)
### Epic 2 — Field App (Distributor + Sales Officer)
- Distributor dashboard: pending onboarding, self-orders, payment logging, sample requests
- Sales Officer: retailer management, self-orders, payment collection, visits
- Order deadlines / cutoff enforcement
- Standing orders management

### Epic 3 — Admin Polish
- Edit distributor/retailer records inline
- Filters (status, area, date range)
- Force logout user
- Reconcile unlinked users
- Dropdown selects for relation fields

### Also Needed
- Update MilkApp Expo/RN frontend to show password login UI + file upload UI
- Update Admin Web Next.js frontend for same
- Remove OTP-only login assumption in both frontends

## Relevant Files & Paths
| Area | Path |
|------|------|
| Auth controller | `apps/api/src/auth/auth.controller.ts` |
| Auth service | `apps/api/src/auth/auth.service.ts` |
| File controller | `apps/api/src/file/file.controller.ts` |
| File service | `apps/api/src/file/file.service.ts` |
| Auth contracts | `packages/contracts/src/auth.ts` |
| File contracts | `packages/contracts/src/file.ts` |
| Prisma schema | `packages/database/prisma/schema.prisma` |
| Seed script | `packages/database/src/seed.ts` |
| Env validation | `apps/api/src/config/env.validation.ts` |
| App module | `apps/api/src/app.module.ts` |
| .env (api) | `apps/api/.env` |
| .env (root) | `.env` |
| Docker compose | `docker-compose.yml` |

## Build & Run
```bash
cd "Milk Admin/apps/api"
npx nest build
node dist/main.js
# Server starts on :4000 with /api/v1/* routes
```

## Users (seeded)
All users have password `Moderns@2026` (bcrypt-hashed). Phone numbers in seed script at `packages/database/src/seed.ts`.

## Key Decisions
- OTP replaced by password as primary auth; OTP kept as fallback
- `z.coerce.boolean()` doesn't work for `'false'` string; use `z.string().default('false').transform(v => v === 'true' || v === '1')`
- MinIO bucket auto-created via `ensureBucket()` on first upload
- File upload limit: 10 MB via MulterModule
- Switch to `feat/password-auth-file-upload` branch before starting new work
