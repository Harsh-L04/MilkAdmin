# Resume Context — Milk Admin

## Current State
- **Branch**: `feat/enterprise-testing` (pushed to `origin`)
- **Last commit**: `d6fd61f` — `feat: add enterprise-grade testing framework for backend and admin panel`
- **Working tree**: clean, nothing to commit

## What Was Completed

### Epic 1 — Foundations (done before testing sprint)
- Password auth (bcrypt) with `login` and `changePassword` endpoints — `apps/api/src/auth/`
- MinIO file upload / download / presigned URL module — `apps/api/src/file/`
- Zod validation schemas for auth + file in `packages/contracts/src/`
- Prisma migration `20260701045426_add_password_hash` — adds `passwordHash` to User model
- Seed script sets bcrypt hash `Moderns@2026` for all seeded users — `packages/database/src/seed.ts`
- Onboarding service sets initial password on user creation — `apps/api/src/onboarding/`
- Env validation for MinIO + bcrypt config — `apps/api/src/config/env.validation.ts`

### Enterprise Testing Framework (current sprint)
#### Backend (NestJS + Vitest) — `apps/api/`
- **196 tests across 17 files** — all passing
- **Domain logic**: `order-state-machine` (5), `auto-approval` (13), `cutoff` (18), `standing-generation` (17), `windows` (6)
- **Services**: `auth.service` (15), `ordering.service` (26), `standing-generator.service` (9), `ledger.service` (8), `payment.service` (11), `catalog.service` (10), `settings.service` (9), `report.service` (7)
- **Auth/Security**: `jwt-auth.guard` (5), `roles.guard` (7), `zod-validation.pipe` (9), `scope` (21)
- Coverage: 95% threshold (lines, branches, functions, statements) via Istanbul
- `vitest.config.ts` configured with HTML + lcov + junit reporters

#### Admin Panel (Next.js + Vitest) — `apps/web/`
- **115 tests across 30 files** — all passing
- **Lib**: API client (19), auth-context (4), tokens (7), format (11)
- **UI Components**: button (6), input (3), table (2), badge (3), dialog (2), select (1), kpi-card (3), skeleton (1), search-input (5)
- **Layout**: app-shell with sidebar nav (2)
- **Features**: catalog CRUD (7), orders review dialog (6), dashboard KPIs (5), network (2), ledger (2), payments (6), onboarding (7), settings (2), reports (1), sample-orders (3), sales-visits (1)
- 95% coverage threshold configured
- `vitest.config.ts` with React plugin, jsdom, Istanbul

## Architecture (current)
- **Backend**: NestJS (port 4000) at `Milk Admin/apps/api/`
- **Database**: PostgreSQL via Prisma, schema at `packages/database/prisma/schema.prisma`
- **Contracts**: Zod schemas at `packages/contracts/src/`, re-exported from `index.ts`
- **Admin Web**: Next.js App Router at `apps/web/`
- **Mobile App**: Expo/React Native at separate `MilkApp/` repo
- **Infra**: MinIO at localhost:9000 in docker-compose, Redis for caching/locks

## Testing Infrastructure

### Running Tests
```bash
# Backend (apps/api)
cd "Milk Admin/apps/api"
npm test              # vitest run
npm run test:watch    # vitest
npm run test:coverage # vitest run --coverage

# Admin Panel (apps/web)
cd "Milk Admin/apps/web"
npm test              # vitest run
npm run test:watch    # vitest
npm run test:coverage # vitest run --coverage
```

### Coverage
- 95% minimum for lines, branches, functions, statements globally
- Report formats: text (terminal), json, html (browser), lcov (IDE), junit (CI)

### Key Testing Patterns
- All services mocked via `vi.mock()` with factory functions
- Domain logic tested as pure functions (no DI needed)
- Controllers tested with NestJS `@nestjs/testing` Test.createTestingModule
- Admin panel uses jsdom + @testing-library/react for component tests
- API client tests mock global fetch directly
- Tokens module has in-memory cache; cleared in `beforeEach`

## What to Do Next

### Complete Coverage Gaps
- **Mobile app** (`MilkApp`): install Jest and run tests (test files already written)
- **Integration tests**: backend API endpoints with test containers or supertest
- **E2E tests**: Playwright for admin panel, Detox for mobile app
- **Visual regression**: Chromatic or Percy for UI components
- **Performance tests**: k6 or autocannon for critical API endpoints
- **Load tests**: artillery.io for order submission flow
- **Accessibility tests**: axe-core integration

### Epic 2 — Field App Features
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

### CI/CD
- GitHub Actions workflow already at `.github/workflows/` (check if exists)
- Add workflow steps for test + coverage + lint + typecheck

## Relevant Files & Paths
| Area | Path |
|------|------|
| Auth controller | `apps/api/src/auth/auth.controller.ts` |
| Auth service | `apps/api/src/auth/auth.service.ts` |
| Ordering service | `apps/api/src/ordering/ordering.service.ts` |
| Order state machine | `apps/api/src/ordering/domain/order-state-machine.ts` |
| Auto-approval logic | `apps/api/src/ordering/domain/auto-approval.ts` |
| Cutoff logic | `apps/api/src/ordering/domain/cutoff.ts` |
| Standing generator | `apps/api/src/standing/standing-generator.service.ts` |
| Standing generation | `apps/api/src/standing/domain/standing-generation.ts` |
| Ledger service | `apps/api/src/ledger/ledger.service.ts` |
| Payment service | `apps/api/src/payment/payment.service.ts` |
| RBAC scope | `apps/api/src/common/authz/scope.ts` |
| Vitest config (api) | `apps/api/vitest.config.ts` |
| Backend tests | `apps/api/test/` (17 files) |
| Vitest config (web) | `apps/web/vitest.config.ts` |
| Admin panel tests | `apps/web/src/__tests__/` (30 files) |
| Prisma schema | `packages/database/prisma/schema.prisma` |
| Contracts | `packages/contracts/src/` |
| Seed script | `packages/database/src/seed.ts` |

## Users (seeded)
All users have password `Moderns@2026` (bcrypt-hashed). Phone numbers in seed script at `packages/database/src/seed.ts`.

## Key Decisions
- OTP replaced by password as primary auth; OTP kept as fallback
- All money = Prisma Decimal(12,2); all quantities = Decimal(12,3); no floats
- LedgerEntry is append-only (no updates in app code)
- AuditLog records every financial / approval / state transition
- Auto-approval tolerance: +20% over standing baseline before manual review
- Coverage threshold: 95% minimum across all metrics
- Switch to `feat/enterprise-testing` branch before starting new work
