# Freelance OS — Current System Update & Reasoning Agent Context

**Date:** August 10, 2026  
**Status:** Sprints 1, 2, 3, and 4 COMPLETE (Workspace, Client, Project, Invoice Domains fully implemented & integrated)

---

## 1. Executive Summary for Reasoning Agent

Freelance OS is a modern monorepo application for managing freelance work, clients, projects, and invoices. All core backend domain models, database schemas, REST APIs, and Next.js App Router UI features are fully implemented, verified, and passing 100% green tests.

### Monorepo Structure
- **`apps/api`**: Express.js REST API (`http://localhost:5001/api/v1`). Architecture: Schema → Repository → Domain Policies → Service Layer → Express Controller.
- **`apps/web`**: Next.js 15 App Router (`http://localhost:5000`). Tech Stack: React 19, Tailwind CSS v4, TanStack Query, React Hook Form, Zod.
- **`packages/database`**: Drizzle ORM schemas (`workspaces`, `workspace_members`, `clients`, `projects`, `invoices`, `invoice_items`, `invoice_history`) targeting Neon PostgreSQL.

---

## 2. Completed Domain Feature Map

| Domain | Status | Key Features & Endpoints | UI Component Location |
| :--- | :--- | :--- | :--- |
| **Workspace** | COMPLETE ✅ | Multi-tenant isolation, RBAC (`owner`, `editor`, `viewer`), membership management. | `/workspaces` |
| **Client** | COMPLETE ✅ | Client CRM, unique email constraint per workspace, contact info. | `apps/web/src/features/client` |
| **Project** | COMPLETE ✅ | Project lifecycle (`planning`, `in_progress`, `on_hold`, `completed`), budgets, billing types. | `apps/web/src/features/project` |
| **Invoice** | COMPLETE ✅ | Invoice draft creation, live financial math, serial generator (`INV-2026-XXXX`), payment recording, immutability locks. | `apps/web/src/features/invoice` |

---

## 3. Crucial Development Context & Database Seeding

1. **Development Environment Mock Auth**:
   - Mock User ID: `550e8400-e29b-41d4-a716-446655440000`
   - Mock Workspace ID: `550e8400-e29b-41d4-a716-446655440000`
2. **Auto-Seeding Helper (`apps/api/src/db/seed.ts`)**:
   - On `@repo/api` startup, `ensureDefaultWorkspace()` seeds default workspace `550e8400-e29b-41d4-a716-446655440000` and owner membership in PostgreSQL.
   - Prevents foreign key constraint violations (`23503`) when creating clients/projects/invoices locally.
3. **Database Schema Sync**:
   - Run `pnpm --filter @repo/database db:push` to apply schema changes to PostgreSQL database.

---

## 4. Key UI & Design Refinements Implemented

- **Date Selection Presets**: Quick-preset badges (`Today`, `Net 7`, `Net 15`, `Net 30`) on `CreateInvoiceForm` and `RecordPaymentDialog` for 1-click date calculation.
- **Modal Dialog Layout**: Upgraded `Dialog` component to support `max-w-4xl` containers with generous breathing room (`p-6 sm:p-8`, `space-y-6`, `rounded-2xl`).
- **Hidden Scrollbars**: Added cross-browser `.no-scrollbar` utility in `apps/web/app/globals.css`.

---

## 5. Standard Verification & Test Commands

```bash
# Push database schemas to Neon PostgreSQL
pnpm --filter @repo/database db:push

# Run API Vitest test suite (10/10 files passing)
pnpm --filter @repo/api test

# Typecheck web app
pnpm --filter web typecheck

# Run dev servers
pnpm dev
```
