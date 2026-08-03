# Freelance OS - Setup & Project Structure Guide

## Quick Overview
Freelance OS is a **monorepo** (single repo with multiple projects). We're building a freelance management platform with:
- **Frontend** (Next.js web app)
- **Backend** (Express API)
- **Database** (PostgreSQL with Drizzle ORM)

---

## Folder Structure

```
Freelance-OS/
├── apps/                    # User-facing applications
│   ├── web/                # Next.js frontend
│   │   ├── app/           # Pages, layouts, components
│   │   ├── public/        # Static files (images, SVGs)
│   │   └── package.json   # Next.js dependencies
│   └── api/               # Express backend API
│       ├── src/           # Source code
│       └── package.json   # API dependencies
│
├── packages/              # Shared code & tools
│   ├── database/         # Database schema & migrations
│   │   ├── src/schema/   # Drizzle ORM schemas
│   │   ├── drizzle.config.ts
│   │   ├── .env.local    # DB connection (ignored by git)
│   │   └── package.json
│   ├── biome-config/     # Linting rules (shared)
│   └── eslint-config/    # ESLint rules (shared)
│
├── services/             # ⚠️ DEAD - Remove this
│
├── docs/                 # Documentation
│   ├── 00-Foundation/   # Vision, problem, users
│   ├── 01-product/      # Features, roadmap
│   ├── 02-engineering/  # Architecture, database, API
│   ├── 03-ai/          # AI agent design
│   ├── 04-development/ # Coding standards, git workflow
│   ├── 05-features/    # Feature specs
│   ├── 06-ADRs/        # Architecture decisions
│   └── 07-quality/     # Testing, releases
│
├── context-for-ai/      # AI context files
├── biome.json           # Root linting config
├── turbo.json           # Monorepo task orchestration
├── pnpm-workspace.yaml  # Workspace config
└── package.json         # Root scripts & dependencies
```

---

## Where to Run Commands

### Root folder (`C:\Users\kirti\coding\Freelance-OS`)
Commands that run across the entire monorepo:
```bash
pnpm install          # Install all dependencies
pnpm typecheck        # Type-check all packages
pnpm lint             # Lint all packages
pnpm test             # Test all packages
pnpm build            # Build all packages
pnpm dev              # Start dev servers (web + api)
```

### Database (`packages/database`)
Commands for database migrations:
```bash
cd packages/database
pnpm run db:push      # Apply migrations to PostgreSQL
pnpm run db:pull      # Pull schema from database
pnpm run db:generate  # Generate migration files
```

### API (`apps/api`)
Commands for backend:
```bash
cd apps/api
pnpm run dev          # Start dev server (watch mode)
pnpm run build        # Build for production
pnpm run test         # Run tests
pnpm run lint         # Lint code
```

### Web (`apps/web`)
Commands for frontend:
```bash
cd apps/web
pnpm run dev          # Start Next.js dev server
pnpm run build        # Build for production
```

---

## What We've Done So Far (Phase 1: Database & Repository)

### ✅ Completed
1. **Fixed `pnpm-workspace.yaml`**
   - Issue: YAML syntax error (`@types/node` not quoted)
   - Fix: Added quotes around package names

2. **Removed broken Husky hook**
   - Issue: `pnpm install` ran `husky install` but husky wasn't installed
   - Fix: Removed from root `package.json` prepare script

3. **Fixed duplicate database folder**
   - Issue: Database existed in both `root/database/` and `packages/database/`
   - Fix: Kept `packages/database/` (monorepo standard), deleted root copy

4. **Fixed database schema**
   - Issue 1: `drizzle-kit` v0.20.18 doesn't support `relations()` function
   - Fix: Removed relation definitions
   - Issue 2: `isNull()` not available in drizzle-kit context
   - Fix: Removed `isNull()` from unique indexes

5. **Fixed Turbo config**
   - Issue: Used old v1 syntax `pipeline` (Turbo 2.x uses `tasks`)
   - Fix: Changed `"pipeline"` → `"tasks"` in `turbo.json`

6. **Removed `.env.example` files**
   - Deleted: `.env.example`, `apps/api/.env.example`, `packages/database/.env.example`
   - Reason: Each package needs its own `.env.local` (git-ignored)

7. **Identified dead code**
   - `services/api/` is duplicate/dead (remove)
   - Updated `package.json` to remove `services/*` from workspaces

---

## What Each File Does

### Root Configuration Files

**`package.json`**
- Root workspace config
- Defines root scripts (dev, build, typecheck, lint, test)
- Lists all packages in `workspaces`
- Dependencies: Turbo (task orchestration), Biome (linter)

**`turbo.json`**
- Task runner config for monorepo
- Defines which tasks depend on others
- Example: `typecheck` depends on `^typecheck` (runs in all packages first)
- `tasks` = tasks to orchestrate (build, typecheck, lint, test, dev)

**`pnpm-workspace.yaml`**
- Tells pnpm this is a workspace
- Lists workspace folders: `apps/*`, `packages/*`
- pnpm uses this to link packages together

**`biome.json`**
- Root linting & formatting config
- Applies to all packages (unless overridden)
- Defines coding standards

### Database Files

**`packages/database/package.json`**
- Name: `@repo/database` (used by other packages)
- Scripts:
  - `db:push` = Apply migrations to PostgreSQL
  - `db:pull` = Sync schema from database
  - `db:generate` = Create migration files
- Dependencies: `drizzle-orm` (ORM), `drizzle-kit` (migrations)

**`packages/database/drizzle.config.ts`**
- Database connection details
- Uses `DATABASE_URL` from `.env.local`
- Output folder for migrations

**`packages/database/.env.local`** (git-ignored)
```
DATABASE_URL=postgresql://user:password@localhost:5432/freelance_os
```
- Where to find PostgreSQL
- Each package has its own `.env.local`

**`packages/database/src/schema/`**
- Drizzle ORM schema definitions
- Example: `workspaces.ts`, `projects.ts` (define database tables)
- Auto-generated migration files here

### API Files

**`apps/api/package.json`**
- Name: `@repo/api`
- Depends on `@repo/database` (uses database package)
- Scripts:
  - `dev` = Start Express server with hot reload (tsx watch)
  - `build` = Compile TypeScript to JavaScript
  - `test` = Run tests with Vitest
- Dependencies: Express (HTTP framework), Zod (validation), Drizzle ORM

**`apps/api/src/index.ts`**
- Entry point for backend
- Starts Express server on a port (usually 3001)

### Web Files

**`apps/web/package.json`**
- Name: `@repo/web`
- Next.js frontend
- Scripts:
  - `dev` = Start Next.js dev server (usually port 3000)
  - `build` = Optimize for production
  - `start` = Run production build

**`apps/web/app/layout.tsx`**
- Root layout (wraps all pages)
- Global styles, providers

**`apps/web/app/page.tsx`**
- Home page (`/` route)

**`apps/web/app/globals.css`**
- Global CSS

---

## Tools We Use

| Tool | Purpose | Install |
|------|---------|---------|
| **pnpm** | Package manager (faster than npm) | Already installed |
| **Node.js** | JavaScript runtime | Required (v20+) |
| **Turbo** | Monorepo task orchestration | In root devDependencies |
| **TypeScript** | Type-safe JavaScript | In each package |
| **Biome** | Linter & formatter | In root devDependencies |
| **Express** | HTTP framework (backend) | In apps/api |
| **Next.js** | React framework (frontend) | In apps/web |
| **Drizzle ORM** | Database ORM | In packages/database |
| **PostgreSQL** | Database | Must be installed & running |
| **tsx** | TypeScript runner | In each package |
| **Vitest** | Test runner | In apps/api |

---

## How We're Proceeding

### Phase 1: Database & Repository ✅ (Current)
- [x] Fix workspace configuration
- [x] Fix database schema
- [x] Remove dead code
- [ ] Run `pnpm typecheck` (verify types)
- [ ] Run `pnpm lint` (verify code style)
- [ ] Create PostgreSQL database
- [ ] Run `pnpm run db:push` (apply migrations)

### Phase 2: Services & Routes (Next)
- Set up API routes in Express
- Set up database queries
- Test endpoints

### Phase 3: Frontend
- Build UI components
- Connect to API

### Phase 4: Auth & Payments
- User authentication
- Stripe integration

---

## Quick Start (Once Phase 1 Done)

```bash
# 1. Install everything
pnpm install

# 2. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE freelance_os;"

# 3. Apply database migrations
cd packages/database
pnpm run db:push

# 4. Start development
cd ../..
pnpm dev
# Opens: http://localhost:3000 (frontend), http://localhost:3001 (api)
```

---

## Important Notes

- **Workspace scoping**: `@repo/database`, `@repo/api` = package names for monorepo linking
- **`.env.local` files**: Each package has its own, never commit them (in .gitignore)
- **Turbo caching**: Speeds up builds by caching task outputs
- **Monorepo benefits**: Share code, unified linting, consistent versions
- **Command locations**: Run from root with `pnpm`, or `cd` into package for specific tasks

---

## Next Steps

1. Fix `services/api/` folder (remove it)
2. Run `pnpm typecheck` from root
3. Run `pnpm lint` from root
4. Create PostgreSQL database
5. Run `pnpm run db:push` from `packages/database/`
6. Start Phase 2

