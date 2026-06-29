# Running Moderns Milk locally

Two repos:

| Repo | Path | Contains |
|---|---|---|
| **MilkAdmin** (this repo) | `…/Agentic/App/Milk` | NestJS API (`apps/api`), Next.js admin web (`apps/web`), Prisma DB (`packages/database`) |
| **MilkApp** | `…/Agentic/App/MilkApp` | Expo / React Native distributor app |

Prerequisites: **Docker Desktop** running, **Node ≥ 20**.

---

## Quick start (4 terminals)

### 1. Infra — Postgres + Redis + MinIO
```bash
cd <…>/Agentic/App/Milk
npm install              # first time only
npm run infra:up
```

### 2. Database — first time, or after a reset
```bash
cd <…>/Agentic/App/Milk
set -a; . ./.env; set +a        # ⚠️ load env first (see note below)
npm run db:migrate
npx tsx packages/database/src/seed.ts
```

### 3. API — Terminal 1 (keep open: OTP codes print here)
```bash
cd <…>/Agentic/App/Milk
set -a; . ./.env; set +a        # ⚠️ API reads the root .env
npm run dev --workspace @moderns-milk/api
```
Serves `http://localhost:4000/api/v1` (health: `/api/v1/health`).
**Run only ONE API instance** — a second collides on port 4000.

### 4. Admin web — Terminal 2
```bash
cd <…>/Agentic/App/Milk
npm run dev --workspace @moderns-milk/web
```
Open **http://localhost:3000** → log in as **Admin `9000000001`**.
(The browser talks to the API through a same-origin `/bff` → `/api/v1` proxy.)

### 5. Mobile app — Terminal 3
```bash
cd <…>/Agentic/App/MilkApp
printf 'EXPO_PUBLIC_USE_MOCKS=false\nEXPO_PUBLIC_API_URL=http://localhost:4000/api/v1\n' > .env
npx expo start --clear
```
Press **`i`** (iOS sim) · **`a`** (Android emulator) · **`w`** (web). Log in as
**distributor `9000000002`** or a sales rep.

Stop everything: Ctrl-C each terminal, then `npm run infra:down`.

---

## Logins & OTP

Type only the 10 digits — `+91` is a fixed prefix.

| Role | Number | Used in |
|---|---|---|
| Admin | `9000000001` | admin web (company-wide visibility) |
| Distributor | `9000000002` | the app |
| Sales reps | `9000000010`, `9000000011` | the app |
| Retailer (data) | `9000000003` | seeded outlet |

**OTP**: in dev (`SMS_PROVIDER=console`) the code is printed to the **API log**
(Terminal 1): `[OtpService] [DEV] OTP for +91… is ######`. In the app's mock mode
(`EXPO_PUBLIC_USE_MOCKS=true`) the OTP is always `123456`.

---

## Connecting to the local database

Postgres runs in Docker (`mm_postgres`) on **localhost:5432**. Dev credentials
(from `.env` / `.env.example`):

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `moderns_milk` |
| User | `moderns` |
| Password | `moderns_dev` |

Connection string:
```
postgresql://moderns:moderns_dev@localhost:5432/moderns_milk?schema=public
```

**Option A — Prisma Studio (easiest, browse/edit in browser):**
```bash
cd <…>/Agentic/App/Milk
set -a; . ./.env; set +a
npm run db:studio --workspace @moderns-milk/database   # opens http://localhost:5555
```

**Option B — psql inside the container:**
```bash
docker exec -it mm_postgres psql -U moderns -d moderns_milk
# e.g.  \dt          list tables
#       select phone, role from "User";
```

**Option C — a GUI client** (TablePlus, DBeaver, pgAdmin): use the host/port/db/
user/password above.

**Redis** (OTP store, rate limits) is on **localhost:6379**:
```bash
docker exec -it mm_redis redis-cli       # then: keys *
```

---

## Gotchas

- **Load the root `.env` before the API or seed**: `set -a; . ./.env; set +a`.
  The workspace scripts (`nest start`, `tsx seed.ts`) don't auto-load it, so you'll
  otherwise get `Invalid environment configuration` / `Can't reach database server`.
- **One watcher per server.** Two `nest`/`next` dev processes fight over the build
  dir (`EPERM`). Reset with `lsof -ti:4000 | xargs kill` (API) / `lsof -ti:3000 | xargs kill` (web).
- **Web app build needs dev CORS** (already enabled in `apps/api/src/main.ts` for
  `localhost`); native (iOS/Android) needs none. **Android emulator** API URL is
  `http://10.0.2.2:4000/api/v1`; a physical device uses your machine's LAN IP.
- **Run the Expo app from the normal `MilkApp` checkout, not a git worktree** —
  Metro can't resolve the web bundle from a deeply-nested `.claude/worktrees/…` path.
- If `db:migrate`/`db:seed` can't connect, Docker probably stopped — `npm run infra:up`.
