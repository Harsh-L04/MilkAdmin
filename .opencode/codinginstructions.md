# Milk Admin — Coding Instructions

## Current Epic: Epic 5 — MilkApp Polish (backend sync)

### Completed (Epic 5)
- Added `resetPassword()` method to `apps/api/src/auth/auth.service.ts` (verifies OTP, updates bcrypt hash, revokes all tokens)
- Added `POST /auth/reset-password` route to `apps/api/src/auth/auth.controller.ts` (public endpoint)

### Setup
- Branch: `main` (pushed to `origin`)
- All seeded users: password `Moderns@2026` (bcrypt)

### Next Session
1. Verify `POST /auth/reset-password` works with the MilkApp forgot-password flow
2. Push code + update this file when done
