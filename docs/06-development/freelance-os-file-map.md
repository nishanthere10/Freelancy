# Freelance OS — File Map & Codebase Navigation Guide

**Version:** 1.0  
**Target Audience:** Developers, Code Reviewers, and AI Reasoning Agents navigating Freelance-OS  
**Purpose:** A practical, file-by-file navigation map mapping every core source file, responsibility, call graph, and dependency.

---

## 1. Top-Level Repository Structure

```text
Freelance-OS/
├── apps/
│   ├── api/                          # Express.js REST API Server
│   │   ├── src/
│   │   │   ├── db/                   # Database client connection & auto-seed helper
│   │   │   ├── domains/              # Domain Slices (Workspace, Client, Project, Invoice)
│   │   │   ├── middleware/           # Express middleware (Clerk Auth, User Resolver)
│   │   │   ├── utils/                # Response helpers & error formatters
│   │   │   └── index.ts              # API server entry point
│   │   └── package.json
│   └── web/                          # Next.js 15 App Router Frontend
│       ├── app/                      # Next.js Routing Layer (Pages & Route Handlers)
│       ├── src/
│       │   ├── api/                  # Axios HTTP client & request/response interceptors
│       │   ├── config/               # App configuration & environment constants
│       │   ├── features/             # Modularized Feature UI Components, Hooks & APIs
│       │   ├── providers/            # React Context Providers (Clerk, Query, Toast)
│       │   ├── shared/               # Reusable UI primitives, hooks & utilities
│       │   └── styles/               # CSS global styles & Tailwind configuration
│       ├── middleware.ts             # Clerk Next.js App Router route protection middleware
│       └── package.json
├── packages/
│   ├── database/                     # Drizzle ORM Database Package
│   │   ├── src/
│   │   │   ├── db/                   # Neon PostgreSQL database connection client
│   │   │   ├── schema/               # PostgreSQL Table Schema Definitions
│   │   │   └── index.ts
│   │   └── package.json
│   ├── shared/                       # Monorepo Shared Types & Contracts
│   └── validation/                   # Shared Zod Validation Schemas
├── docs/                             # Architecture, Quality & Developer Guides
└── planning/                         # Sprint documentation & system updates
```

---

## 2. Backend Backend API File Map (`apps/api/src/`)

### Core Entry Point & Middleware

| File Path | Layer | Purpose | Called By | Calls / Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| `src/index.ts` | Entry Point | Express app setup, CORS, route mounting, server listener, auto-seed trigger. | Node process / pnpm dev | `auth.middleware.ts`, domain routes, `db/client.ts` |
| `src/middleware/auth.middleware.ts` | Middleware | Validates Clerk RSA JWT signature (`clerkAuth`) & executes JIT user resolution (`userResolverMiddleware`). | `index.ts` | `@clerk/express`, `usersTable`, `db/client.ts` |
| `src/db/client.ts` | Infrastructure | Instantiates Drizzle ORM client connected to Neon PostgreSQL. | Repositories, auth middleware | `@neondatabase/serverless`, `drizzle-orm` |
| `src/utils/response.ts` | Utility | Standardized API success/error JSON response constructors (`createSuccess`, `createError`). | Controllers | None |

---

### Workspace Domain (`apps/api/src/domains/workspace/`)

| File Path | Layer | Purpose | Called By | Calls |
| :--- | :--- | :--- | :--- | :--- |
| `workspace.routes.ts` | Router | Express router for `/api/v1/workspaces`. | `index.ts` | `workspace.controller.ts` |
| `workspace.controller.ts` | Controller | HTTP request handlers for workspace CRUD & restoration. | `workspace.routes.ts` | `workspace.service.ts`, `workspace.mapper.ts` |
| `workspace.service.ts` | Service | Business orchestration for workspaces, slug generation, owner assignment. | `workspace.controller.ts` | `workspace.repository.ts`, `workspace-member.repository.ts` |
| `workspace.policies.ts` | Policy | Pure RBAC functions evaluating workspace permissions. | `workspace.service.ts` | None |
| `repository/workspace.repository.ts` | Repository | SQL database persistence for `workspacesTable`. | `workspace.service.ts` | `workspacesTable`, `db/client.ts` |
| `repository/workspace-member.repository.ts` | Repository | SQL database persistence for `workspaceMembersTable`. | `workspace.service.ts`, other domain services | `workspaceMembersTable`, `db/client.ts` |

---

### Client Domain (`apps/api/src/domains/client/`)

| File Path | Layer | Purpose | Called By | Calls |
| :--- | :--- | :--- | :--- | :--- |
| `client.routes.ts` | Router | Express router for `/api/v1/workspaces/:workspaceId/clients`. | `index.ts` | `client.controller.ts` |
| `client.controller.ts` | Controller | Thin HTTP request handlers for client CRM endpoints. | `client.routes.ts` | `client.service.ts`, `client.mapper.ts` |
| `client.service.ts` | Service | Orchestrates client business rules, unique email per workspace, RBAC checks. | `client.controller.ts` | `client.repository.ts`, `workspace-member.repository.ts`, `client.policies.ts` |
| `client.policies.ts` | Policy | RBAC rules (`canCreateClient`, `canUpdateClient`, `canDeleteClient`). | `client.service.ts` | None |
| `repository/client.repository.ts` | Repository | SQL database persistence for `clientsTable`. | `client.service.ts` | `clientsTable`, `db/client.ts` |
| `client.schema.ts` | Validation | Zod schemas for client HTTP body inputs. | `client.controller.ts` | `zod` |

---

### Project Domain (`apps/api/src/domains/project/`)

| File Path | Layer | Purpose | Called By | Calls |
| :--- | :--- | :--- | :--- | :--- |
| `project.routes.ts` | Router | Express router for `/api/v1/workspaces/:workspaceId/projects`. | `index.ts` | `project.controller.ts` |
| `project.controller.ts` | Controller | Thin HTTP request handlers for project endpoints. | `project.routes.ts` | `project.service.ts`, `project.mapper.ts` |
| `project.service.ts` | Service | Orchestrates project deliverables, pricing models, client workspace validation. | `project.controller.ts` | `project.repository.ts`, `client.repository.ts`, `workspace-member.repository.ts` |
| `project.policies.ts` | Policy | RBAC rules (`canCreateProject`, `canUpdateProject`, `canDeleteProject`). | `project.service.ts` | None |
| `repository/project.repository.ts` | Repository | SQL database persistence for `projectsTable`. | `project.service.ts` | `projectsTable`, `db/client.ts` |

---

### Invoice Domain (`apps/api/src/domains/invoice/`)

| File Path | Layer | Purpose | Called By | Calls |
| :--- | :--- | :--- | :--- | :--- |
| `invoice.routes.ts` | Router | Express router for `/api/v1/workspaces/:workspaceId/invoices`. | `index.ts` | `invoice.controller.ts` |
| `invoice.controller.ts` | Controller | Thin HTTP request handlers for invoice drafting, sending, payment logging, and voiding. | `invoice.routes.ts` | `invoice.service.ts`, `invoice.mapper.ts` |
| `invoice.service.ts` | Service | Central financial calculation engine (Subtotal, Discount, Taxable, GST, Total, Due), state machine transitions, serial numbering. | `invoice.controller.ts` | `invoice.repository.ts`, `workspace-member.repository.ts`, `invoice.policies.ts` |
| `invoice.policies.ts` | Policy | RBAC rules (`canCreateInvoice`, `canSendInvoice`, `canRecordPayment`, `canCancelInvoice`). | `invoice.service.ts` | None |
| `repository/invoice.repository.ts` | Repository | SQL database persistence for `invoicesTable`, `invoiceItemsTable`, `invoiceHistoryTable`. | `invoice.service.ts` | Drizzle ORM, `db/client.ts` |

---

## 3. Frontend Web App File Map (`apps/web/`)

### Routing Layer (`apps/web/app/`)

| Route File | Type | Purpose | Rendered Component |
| :--- | :--- | :--- | :--- |
| `app/layout.tsx` | Root Layout | Global HTML structure, font loading (`Pacifico`), global CSS imports. | `AppProviders` wrapper |
| `app/page.tsx` | Landing Page | Public marketing landing page. | `MarketingNav`, Hero section |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Auth Page | Clerk Sign In page. | Clerk `<SignIn />` |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Auth Page | Clerk Sign Up page. | Clerk `<SignUp />` |
| `app/workspaces/page.tsx` | Application Page | Workspaces landing directory. | `WorkspacePage` |
| `app/workspaces/[workspaceId]/clients/page.tsx` | Application Page | Workspace Clients directory. | `ClientPage` |
| `app/workspaces/[workspaceId]/projects/page.tsx` | Application Page | Workspace Projects directory. | `ProjectPage` |
| `app/workspaces/[workspaceId]/invoices/page.tsx` | Application Page | Workspace Invoices dashboard. | `InvoicePage` |
| `app/onboarding/workspace/page.tsx` | Onboarding | Initial workspace creation flow after sign-up. | Workspace creation form |
| `middleware.ts` | Middleware | `@clerk/nextjs` `clerkMiddleware()` protecting routes. | Next.js Engine |

---

### Feature Modules (`apps/web/src/features/`)

#### Client Feature (`src/features/client/`)
- `components/ClientPage.tsx` — Main Client CRM dashboard container.
- `components/ClientList.tsx` — Responsive grid list of client cards.
- `components/ClientCard.tsx` — Individual client card (`rounded-2xl`).
- `components/ClientDetail.tsx` — Detailed client profile view featuring live linked project fetching via `useProjects`.
- `hooks/useClients.ts` — Query hook wrapped around `getClients`.
- `hooks/useCreateClient.ts` — Mutation hook for creating clients.
- `api/client.api.ts` — Typed fetchers executing REST calls (`/api/v1/workspaces/:id/clients`).

#### Project Feature (`src/features/project/`)
- `components/ProjectPage.tsx` — Projects directory container.
- `components/ProjectList.tsx` — Project grid with `gap-6 lg:gap-8` breathing space.
- `components/ProjectCard.tsx` — Project card with status badges and financial metrics.
- `components/ProjectDetail.tsx` — Detailed project scope view with metric cards (Financials, Timeline, Status).
- `hooks/useProjects.ts` — Query hook fetching projects.
- `api/project.api.ts` — Typed REST API fetchers.

#### Invoice Feature (`src/features/invoice/`)
- `components/InvoicePage.tsx` — Invoice dashboard with 3 metrics cards (`Total Invoiced`, `Total Collected`, `Outstanding Balance`).
- `components/InvoiceDetailView.tsx` — Printable invoice document / PDF view with GST breakdown (`CGST` + `SGST`).
- `components/CreateInvoiceDialog.tsx` & `CreateInvoiceForm.tsx` — Invoice creation modal with date preset chips.
- `components/RecordPaymentDialog.tsx` — Payment logging modal.
- `hooks/useInvoices.ts` — Query hook fetching invoices.
- `api/invoice.api.ts` — Typed REST API fetchers.

---

## 4. Database Schema Package File Map (`packages/database/src/schema/`)

| Schema File | Defined Tables | Primary Keys & Core Columns | Foreign Keys |
| :--- | :--- | :--- | :--- |
| `users.ts` | `usersTable` | `id` (UUID PK), `clerkId` (Unique String), `email` (Unique String), `status`. | None |
| `workspaces.ts` | `workspacesTable`, `workspaceMembersTable` | `workspaces.id` (UUID PK), `slug` (Unique), `ownerId` (UUID FK). `workspace_members.id` (UUID PK). | `workspaces.ownerId` → `users.id`<br>`workspace_members.userId` → `users.id`<br>`workspace_members.workspaceId` → `workspaces.id` |
| `clients.ts` | `clientsTable` | `id` (UUID PK), `name`, `email`, `workspaceId` (UUID FK). | `workspaceId` → `workspaces.id`<br>`createdBy` → `users.id` |
| `projects.ts` | `projectsTable` | `id` (UUID PK), `name`, `workspaceId` (UUID FK), `clientId` (UUID FK). | `workspaceId` → `workspaces.id`<br>`clientId` → `clients.id`<br>`createdBy` → `users.id` |
| `invoices.ts` | `invoicesTable`, `invoiceItemsTable`, `invoiceHistoryTable` | `invoices.id` (UUID PK), `invoiceNumber`, `totalAmount`, `amountDue`, `status`. | `workspaceId` → `workspaces.id`<br>`clientId` → `clients.id`<br>`projectId` → `projects.id`<br>`invoice_items.invoiceId` → `invoices.id` |

---

## 5. Domain Call & Dependency Hierarchy

```text
Workspace Domain (Root Isolation Boundary)
   │
   ├──> Client Domain (Requires Workspace Membership)
   │     │
   │     └──> Project Domain (Requires Workspace & Client Validation)
   │
   └──> Invoice Domain (Requires Workspace, Client & optional Project Validation)
```

---

## 6. "I Need to Debug X" Troubleshooting Map

| Problem | Primary File to Inspect | Secondary File to Inspect |
| :--- | :--- | :--- |
| **Authentication fails or 401 redirect loop** | `apps/web/src/api/interceptors.ts` | `apps/api/src/middleware/auth.middleware.ts` |
| **User identity / JIT resolution issues** | `apps/api/src/middleware/auth.middleware.ts` | `packages/database/src/schema/users.ts` |
| **Workspace creation or slug error** | `apps/api/src/domains/workspace/workspace.service.ts` | `apps/api/src/domains/workspace/repository/workspace.repository.ts` |
| **Client creation or duplicate email error** | `apps/api/src/domains/client/client.service.ts` | `apps/api/src/domains/client/repository/client.repository.ts` |
| **Project budget or invalid client linkage** | `apps/api/src/domains/project/project.service.ts` | `apps/api/src/domains/project/repository/project.repository.ts` |
| **Invoice tax math or payment calculation wrong** | `apps/api/src/domains/invoice/invoice.service.ts` | `apps/web/src/features/invoice/components/InvoiceDetailView.tsx` |
| **UI components not refetching after mutation** | `apps/web/src/features/<domain>/hooks/use<Feature>.ts` | `apps/web/src/features/<domain>/api/<domain>.keys.ts` |
| **Database migration or schema mismatch** | `packages/database/src/schema/` | Run `pnpm --filter @repo/database db:push` |

---

## 7. "Add a New Domain Feature" Step-by-Step Implementation Sequence

When introducing a new domain feature slice to Freelance-OS, follow this established pattern:

```text
 1. Define Database Schema         --> packages/database/src/schema/<feature>.ts
 2. Apply Migration                --> Run pnpm --filter @repo/database db:push
 3. Define Zod Schemas             --> apps/api/src/domains/<feature>/<feature>.schema.ts
 4. Define RBAC Policies           --> apps/api/src/domains/<feature>/<feature>.policies.ts
 5. Implement Repository           --> apps/api/src/domains/<feature>/repository/<feature>.repository.ts
 6. Implement Service & Math       --> apps/api/src/domains/<feature>/<feature>.service.ts
 7. Implement Mapper & Controller  --> apps/api/src/domains/<feature>/<feature>.mapper.ts & controller.ts
 8. Register Express Routes        --> apps/api/src/domains/<feature>/<feature>.routes.ts & mount in index.ts
 9. Write API Unit & HTTP Tests    --> apps/api/src/domains/<feature>/__tests__/
10. Add Frontend API Fetchers      --> apps/web/src/features/<feature>/api/<feature>.api.ts
11. Add Query & Mutation Hooks     --> apps/web/src/features/<feature>/hooks/
12. Create UI Components           --> apps/web/src/features/<feature>/components/
13. Mount App Router Pages        --> apps/web/app/workspaces/[workspaceId]/<feature>/page.tsx
```

---

## 8. Code Ownership Map

| System Concern | Responsible Code Module |
| :--- | :--- |
| **Authentication (Identity)** | Clerk SaaS + `@clerk/express` + `@clerk/nextjs` |
| **User Identity Translation** | `apps/api/src/middleware/auth.middleware.ts` (`userResolverMiddleware`) |
| **Authorization & RBAC Rules** | `apps/api/src/domains/*/policies/*.policies.ts` |
| **Business Logic Orchestration** | `apps/api/src/domains/*/*.service.ts` |
| **Database Persistence & SQL** | `apps/api/src/domains/*/repository/` & `packages/database` |
| **HTTP Routing & Status Codes** | `apps/api/src/domains/*/*.controller.ts` & `routes.ts` |
| **Frontend State & Caching** | TanStack Query v5 (`apps/web/src/features/*/hooks/`) |
| **HTTP Transport & JWT Injection** | Axios Client + Interceptors (`apps/web/src/api/interceptors.ts`) |
| **UI Primitives & Design Tokens** | Shared Components (`apps/web/src/shared/components/`) & `globals.css` |
| **Route Protection & Navigation** | Next.js App Router Middleware (`apps/web/middleware.ts`) |
