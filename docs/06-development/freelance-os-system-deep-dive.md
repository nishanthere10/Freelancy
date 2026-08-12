# Freelance OS — System Architecture Deep Dive & Developer Learning Guide

**Version:** 1.0  
**Target Audience:** Principal Architects, Senior Engineers, and Developers joining or returning to Freelance-OS  
**Scope:** Post-Sprint-5 Complete System Architecture (Workspace, Client, Project, Invoice Domains, Clerk Authentication & Design System Alignment)

---

## 1. System Overview

Freelance OS is an enterprise-grade monorepo web application designed for freelancers and independent contractors to manage business operations: multi-tenant workspaces, client relationships (CRM), project deliverables, and GST-compliant invoices.

### End-to-End System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     BROWSER (USER CLIENT)                                   │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ HTTP / HTTPS
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NEXT.JS 15 FRONTEND (apps/web)                              │
│  ┌─────────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────────┐  │
│  │   App Router Middleware │──>│  Clerk Auth Provider      │──>│  Axios HTTP Client      │  │
│  │   (clerkMiddleware)     │   │  (window.Clerk.session)   │   │  (Bearer Token Inject)  │  │
│  └─────────────────────────┘   └───────────────────────────┘   └────────────┬────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┼───────────────┘
                                                                              │ REST API Call
                                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                EXPRESS.JS REST API (apps/api)                               │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 1. clerkAuth Middleware (@clerk/express RSA JWT Verification)                         │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 2. userResolverMiddleware (JIT lookup clerk_id -> PostgreSQL users.id UUID)           │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                              ▼                                              │
│  ┌──────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────┐  │
│  │ 3. Express Controller    │─>│ 4. Domain Policy (RBAC)   │─>│ 5. Domain Service Layer  │  │
│  │    (Extracts actorId)    │  │    (owner/editor/viewer)  │  │    (Result<T> Pattern)   │  │
│  └──────────────────────────┘  └───────────────────────────┘  └────────────┬─────────────┘  │
│                                                                            ▼                │
│                                                               ┌──────────────────────────┐  │
│                                                               │ 6. Domain Repository     │  │
│                                                               │    (Workspace-scoped)    │  │
│                                                               └────────────┬─────────────┘  │
└────────────────────────────────────────────────────────────────────────────┼────────────────┘
                                                                             │ Drizzle ORM
                                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               NEON POSTGRESQL DATABASE (packages/database)                   │
│                                                                                             │
│     [users] ──< [workspace_members] >── [workspaces]                                        │
│                                                │                                            │
│                                                ├──< [clients] ──< [projects]                │
│                                                │                                            │
│                                                └──< [invoices] ──< [invoice_items]          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Domain Data Hierarchy

Data isolation and relationships follow a strict multi-tenant hierarchy anchored at the **Workspace** level:

```text
User (Clerk Account mapped to users.id UUID)
 └── Workspace (Multi-tenant container)
      ├── WorkspaceMember (Role: owner | editor | viewer)
      │
      ├── Client (CRM entity)
      │    └── Project (Linked to Client & Workspace)
      │
      ├── Project (Deliverable scope & budget)
      │
      └── Invoice (Financial engine)
           ├── InvoiceItem (Line items & pricing)
           └── InvoiceHistory (Audit trail)
```

---

## 2. Monorepo Architecture & Directory Structure

The project is structured as a pnpm monorepo:

```text
Freelance-OS/
├── apps/
│   ├── api/            # Express.js REST API server (Port 3001/5001)
│   └── web/            # Next.js 15 App Router frontend (Port 3000/5000)
├── packages/
│   ├── database/       # Drizzle ORM database schemas, migrations & db client
│   ├── shared/         # Shared domain contracts, utilities & response types
│   └── validation/     # Shared Zod validation schemas
├── docs/               # Architecture, Product, ADRs, Development & Quality guides
├── planning/           # Sprint plans & status update logs
└── pnpm-workspace.yaml # Monorepo workspace configuration
```

### Package Ownership Matrix

| Workspace Package | Core Responsibility | Technologies Used |
| :--- | :--- | :--- |
| **`apps/api`** | REST API endpoints, JWT authentication, JIT user provisioning, domain services, RBAC enforcement, database repositories, error mappers. | Express.js, `@clerk/express`, Vitest |
| **`apps/web`** | User Interface, routing, client state caching, forms, interactive dialogs, invoice PDF rendering. | Next.js 15, React 19, Tailwind CSS v4, `@clerk/nextjs`, TanStack Query v5, Lucide / Phosphor Icons |
| **`packages/database`** | PostgreSQL schema definitions, relational constraints, indices, migration scripts, Drizzle client connection. | Drizzle ORM, `@neondatabase/serverless`, PostgreSQL |
| **`packages/shared`** | Standardized `Result<T>` types, HTTP error payload wrappers, shared utility functions. | TypeScript |

---

## 3. Frontend Architecture (`apps/web`)

The frontend follows a strict 6-layer unidirectional data flow:

```text
Next.js Route Entry Point (app/workspaces/[workspaceId]/clients/page.tsx)
    ↓
Feature Page Component (src/features/client/components/ClientPage.tsx)
    ↓
Feature Component Tree (ClientList -> ClientCard -> ClientDetail)
    ↓
Feature Custom Hooks (useClients, useCreateClient, useDeleteClient)
    ↓
Typed API Functions (src/features/client/api/client.api.ts)
    ↓
Shared Axios Client with Token Interceptor (src/api/client.ts & interceptors.ts)
    ↓
Express API Server Endpoint
```

### Layer Boundary Rules

1. **Route Entry Points (`app/`)**: Thin server/client wrappers. Responsible ONLY for reading URL params (`workspaceId`), invoking feature pages, and fallback loading states.
2. **Feature Components (`src/features/*/components/`)**: Responsible for UI layout, state presentation, and user interactions. Components NEVER call Axios directly; they use custom feature query/mutation hooks.
3. **Feature Hooks (`src/features/*/hooks/`)**: Wraps TanStack Query (`useQuery`, `useMutation`). Handles query key generation, cache invalidation, and toast notifications.
4. **Feature API (`src/features/*/api/`)**: Pure async fetcher functions returning typed DTOs.
5. **Shared Components (`src/shared/components/`)**: Reusable visual building blocks (`Button`, `Card`, `Dialog`, `Input`, `Skeleton`). Contain ZERO domain business logic.

---

## 4. Next.js App Router vs Feature Modularization

### Separation of Concerns

```text
apps/web/
├── app/                        # Next.js App Router Page Routes (Routing Layer)
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── clients/page.tsx        # Dynamic route resolver for clients
│   ├── projects/page.tsx       # Dynamic route resolver for projects
│   ├── invoices/page.tsx       # Dynamic route resolver for invoices
│   ├── onboarding/workspace/page.tsx
│   └── workspaces/
│       ├── page.tsx            # Workspaces directory page
│       └── [workspaceId]/
│           ├── clients/page.tsx
│           ├── projects/page.tsx
│           └── invoices/page.tsx
└── src/                        # Feature Implementation Codebase
    ├── api/                    # Axios setup & request/response interceptors
    ├── config/                 # Environment variables & constants
    ├── features/               # Modularized Domain Features
    │   ├── client/             # Client CRM feature module
    │   ├── invoice/            # Invoice feature module
    │   ├── project/            # Project feature module
    │   └── workspace/          # Workspace feature module
    ├── providers/              # React Context Providers
    └── shared/                 # Reusable UI primitives, hooks & utilities
```

### Why Separation Exists
- `app/` is owned by Next.js file-system routing constraints.
- `src/features/` is owned by domain logic and reusable React architecture, making components easily testable, modular, and reusable without routing lock-in.

---

## 5. Frontend React Providers (`apps/web/src/providers/`)

Application state providers are encapsulated in `AppProviders.tsx` (`src/providers/AppProviders.tsx`):

```tsx
<ClerkProvider publishableKey={publishableKey}>
  <QueryProvider>
    {children}
    <Toaster position="top-right" />
  </QueryProvider>
</ClerkProvider>
```

1. **`ClerkProvider`** (`@clerk/nextjs`): Initializes Clerk client SDK, maintains user session token in memory, provides `<UserButton />` and `useAuth()` context.
2. **`QueryProvider`** (`src/providers/QueryProvider.tsx`): Instantiates TanStack `QueryClient` with standard defaults (`staleTime: 5 mins`, `gcTime: 10 mins`, `refetchOnWindowFocus: false`, `retry: 1`). Mounts `ReactQueryDevtools` in development mode.
3. **`Toaster`** (`sonner`): Renders toast notifications triggered by mutation hooks.

---

## 6. Design System Tokens & Design Language (`docs/01-product/design-language.md`)

The UI visual language adheres strictly to the tokens defined in `design-language.md`:

```css
/* Selected Core Tokens in apps/web/src/styles/globals.css */
:root {
  --color-brand-yellow: #ffd000;         /* Miro-style canary yellow brand accent */
  --color-brand-yellow-deep: #e6bc00;    /* Darker variant for yellow hover states */
  --color-canvas: #f8fafc;               /* Page background surface */
  --color-ink-deep: #0f172a;             /* Dark ink headlines & text */
  --color-slate-text: #64748b;           /* Secondary body & metadata text */
  --color-hairline: #e2e8f0;             /* 1px border dividers */

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;                     /* Standard card radius */
  --radius-2xl: 20px;                    /* Feature card radius */
  --radius-full: 9999px;                 /* Pill buttons & status badges */
}
```

### Component Style Conventions
- **Black-Pill Primary Buttons**: `rounded-full bg-black text-white hover:bg-gray-900 px-6 py-2.5 text-sm font-medium`.
- **Canary Yellow Brand Badges**: `rounded-full bg-amber-500/10 text-amber-900 px-3 py-1 font-bold text-xs`.
- **Widescreen Containers**: `max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12`.
- **Brand Wordmark**: Google Font **Pacifico** applied to `Freelancy` logo in `Navbar.tsx` and printable Invoice headers.

---

## 7. Authentication Architecture & Security Lifecycle

Authentication is decoupled from application authorization:

```text
Browser User
   ↓
Sign In via Clerk (<SignIn /> component)
   ↓
Clerk IdP issues session JWT
   ↓
Axios Interceptor reads window.Clerk.session.getToken()
   ↓
HTTP Request with Authorization: Bearer <jwt>
   ↓
Express clerkAuth (@clerk/express verifies RSA signature)
   ↓
userResolverMiddleware extracts clerkId ("user_2bX...")
   ↓
Query usersTable WHERE clerk_id = clerkId
   ┌───────────────────────┴───────────────────────┐
   ▼ (User Found)                                  ▼ (First Login)
Return existing UUID                           JIT Insert into usersTable (.onConflictDoNothing())
   │                                               │
   └───────────────────────┬───────────────────────┘
                           ▼
Attach req.user = { id: internalUuid, clerkId, email }
                           ▼
Express Controller receives verified internal UUID actorId
```

### Identity Resolution Rule
Freelance OS **NEVER** stores raw Clerk string IDs (`user_2bX...`) inside database foreign key columns.  
All relational foreign keys (`workspaces.owner_id`, `workspace_members.user_id`, `clients.created_by`, `projects.created_by`, `invoices.created_by`) strictly enforce PostgreSQL `UUID` column types referencing `users.id`.

---

## 8. Authorization Architecture & RBAC Policy Engine

While Authentication verifies *who the user is*, Authorization determines *what the user can do within a specific workspace*.

### Workspace Roles
- **`owner`**: Creator/Administrator of the workspace. Full authority to edit/delete workspace, manage members, create/edit/delete clients, projects, and invoices.
- **`editor`**: Contributor. Can create and edit clients, projects, and invoices. Cannot delete workspaces or delete clients.
- **`viewer`**: Read-only member. Can inspect data; all mutation attempts return HTTP 403 Forbidden.

### Policy Evaluation Layer (`apps/api/src/domains/*/policies/`)

Policies are pure functions that evaluate membership and role permissions:

```ts
// Example Policy Evaluation: apps/api/src/domains/client/client.policies.ts
export function canCreateClient(member: WorkspaceMember | null): boolean {
  if (!member || member.deletedAt) return false;
  return member.role === 'owner' || member.role === 'editor';
}

export function canDeleteClient(member: WorkspaceMember | null): boolean {
  if (!member || member.deletedAt) return false;
  return member.role === 'owner'; // Owner-only mutation
}
```

---

## 9. End-to-End Request & Data Transformation Trace

Let's trace a real mutation request: **`POST /api/v1/workspaces/:workspaceId/clients`**

```text
1. USER ACTION
   • User clicks "Create Client" button in CreateClientDialog.tsx.

2. FORM & VALIDATION
   • React Hook Form validates inputs against createClientSchema (Zod).

3. MUTATION HOOK
   • useCreateClient(workspaceId) hook executes mutate(data).

4. API FETCHER
   • createClient(workspaceId, data) in client.api.ts calls apiPost('/workspaces/:id/clients', data).

5. AXIOS INTERCEPTOR
   • setupRequestInterceptor fetches Clerk session JWT via window.Clerk.session.getToken().
   • Appends header: Authorization: Bearer <jwt>.

6. EXPRESS ROUTER
   • API receives POST /api/v1/workspaces/:workspaceId/clients.
   • Handled by middleware stack: clerkAuth -> userResolverMiddleware -> createClient controller.

7. JWT & USER RESOLUTION
   • clerkAuth validates RSA token signature.
   • userResolverMiddleware queries usersTable for clerkId, resolves internal UUID, and sets req.user.id.

8. CONTROLLER
   • client.controller.ts extracts workspaceId from req.params and actorId from req.user.id.
   • Calls ClientService.createClient(input, workspaceId, actorId).

9. DOMAIN SERVICE & POLICY
   • ClientService queries WorkspaceMemberRepository for (workspaceId, actorId).
   • Evaluates canCreateClient(member). If false, returns Result.fail(PERMISSION_DENIED).
   • Validates unique email constraint within workspace via ClientRepository.findByEmail(workspaceId, email).

10. DATABASE PERSISTENCE
    • ClientRepository.create() executes INSERT INTO clients via Drizzle ORM.
    • Audit fields set: createdBy = actorId, updatedBy = actorId.

11. RESPONSE MAPPING
    • Controller receives Result.ok(clientRow).
    • mapClientToResponse converts snake_case database fields to camelCase DTO response.
    • Sends HTTP 201 Created JSON payload.

12. UI & QUERY CACHE UPDATE
    • useCreateClient onSuccess callback executes:
      queryClient.invalidateQueries({ queryKey: clientKeys.list(workspaceId) });
    • Sonner renders toast: "Client created successfully".
    • TanStack Query automatically refetches client list and updates UI.
```

---

## 10. Backend Domain Layer Pattern

Every backend feature domain in `apps/api/src/domains/` follows the standard enterprise architecture:

```text
apps/api/src/domains/client/
├── __tests__/                  # Unit & integration Vitest suites
├── client.controller.ts        # Express HTTP handlers (Thin layer)
├── client.events.ts            # Domain event emitter interface & null implementation
├── client.mapper.ts            # DTO <-> Domain model transformations
├── client.policies.ts          # Pure RBAC permission functions
├── client.routes.ts            # Express router definitions
├── client.schema.ts            # Zod HTTP input validation schemas
├── client.service.ts           # Central business orchestration & Result<T> pattern
├── client.types.ts             # Domain interfaces & service input DTOs
└── repository/
    ├── client.repository.ts    # Drizzle ORM database persistence
    └── index.ts
```

### Layer Responsibilities
- **Controller**: Parses HTTP request, extracts `actorId` from `req.user.id`, calls service, maps response. Contains zero business logic.
- **Service**: Orchestrates business rules, queries membership, evaluates RBAC policies, enforces domain invariants, calls repository, returns `Result<T>`.
- **Policy**: Pure boolean functions evaluating whether a member role can perform an action.
- **Repository**: Executes SQL queries via Drizzle ORM. Scopes every query by `workspaceId`.
- **Mapper**: Transforms raw database rows into clean, client-facing JSON DTOs.

---

## 11. Database Entity-Relationship Architecture

Neon PostgreSQL tables defined in `packages/database/src/schema/`:

```text
                        ┌────────────────────────┐
                        │         users          │
                        │────────────────────────│
                        │ id (UUID PK)           │
                        │ clerk_id (VARCHAR UNQ) │
                        │ email (VARCHAR UNQ)    │
                        └───────────┬────────────┘
                                    │
                                    │ 1:N
                                    ▼
                        ┌────────────────────────┐
                        │   workspace_members    │
                        │────────────────────────│
                        │ id (UUID PK)           │
                        │ workspace_id (UUID FK) │
                        │ user_id (UUID FK)      │
                        │ role (owner/edit/view) │
                        └───────────▲────────────┘
                                    │
                                    │ N:1
                        ┌───────────┴────────────┐
                        │       workspaces       │
                        │────────────────────────│
                        │ id (UUID PK)           │
                        │ name (VARCHAR)         │
                        │ slug (VARCHAR UNQ)     │
                        │ owner_id (UUID FK)     │
                        └───────────┬────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │ 1:N                     │ 1:N                     │ 1:N
          ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│     clients      │      │     projects     │      │     invoices     │
│──────────────────│      │──────────────────│      │──────────────────│
│ id (UUID PK)     │      │ id (UUID PK)     │      │ id (UUID PK)     │
│ workspace_id (FK)│      │ workspace_id (FK)│      │ workspace_id (FK)│
│ name (VARCHAR)   │<─────│ client_id (FK)   │<─────│ client_id (FK)   │
│ email (VARCHAR)  │  1:N │ name (VARCHAR)   │  1:N │ project_id (FK)  │
└──────────────────┘      └──────────────────┘      │ invoice_number   │
                                                    └─────────┬────────┘
                                                              │ 1:N
                                                              ▼
                                                    ┌──────────────────┐
                                                    │  invoice_items   │
                                                    │──────────────────│
                                                    │ id (UUID PK)     │
                                                    │ invoice_id (FK)  │
                                                    │ description      │
                                                    │ unit_price       │
                                                    └──────────────────┘
```

---

## 12. Domain Overview & Specifications

### 1. Workspace Domain (`apps/api/src/domains/workspace`)
- Multi-tenant isolation boundary for all records.
- Actions: Create Workspace, List User Workspaces, Get Workspace, Update Workspace, Soft Delete Workspace, Restore Workspace.
- Auto-assigns creator as `owner` in `workspace_members`.

### 2. Client Domain (`apps/api/src/domains/client`)
- Client CRM managing business profiles, GST details, primary contacts, and billing addresses.
- Unique constraint: Client email must be unique *within the same workspace* (`WHERE workspace_id = $1 AND email = $2`).
- Integrated UI: `ClientDetail` dynamically fetches linked projects using `useProjects(workspaceId, { clientId })`.

### 3. Project Domain (`apps/api/src/domains/project`)
- Project scope management tracking deliverables, pricing models (`fixed`, `hourly`, `retainer`), status lifecycle (`planning`, `in_progress`, `on_hold`, `completed`, `cancelled`), and target completion dates.
- Composite Validation: Verifies `clientId` belongs to the same `workspaceId` before linking.

### 4. Invoice Domain (`apps/api/src/domains/invoice`)
- Financial calculation and payment engine.
- 5-stage lifecycle state machine: `draft` → `sent` → `paid` / `overdue` / `cancelled`.
- Serial Number Generator: Generates sequential invoice identifiers (`INV-YYYY-0001`, `INV-YYYY-0002`) upon transition to `sent`.
- Financial Math: Calculates `Subtotal`, `DiscountAmount`, `TaxableAmount`, `CGST` (half tax rate), `SGST` (half tax rate), `TotalAmount`, `AmountPaid`, and `AmountDue`.
- Immutability Locks: Sent and paid invoices cannot be edited or deleted.
- Printable PDF Document: Rendered according to `design-language.md` with GST tax summary box.

---

## 13. TanStack Query Cache & State Management (`apps/web`)

Query keys are strictly scoped by `workspaceId` to ensure multi-tenant cache isolation:

```ts
// Example Query Keys
export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
};

export const clientKeys = {
  all: ['clients'] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...clientKeys.all, workspaceId, 'list', filters] as const,
  detail: (workspaceId: string, id: string) =>
    [...clientKeys.all, workspaceId, 'detail', id] as const,
};
```

### Cache Invalidation Strategy
When a mutation succeeds (e.g. `useCreateClient`), the hook invalidates the exact query key prefix:
`queryClient.invalidateQueries({ queryKey: clientKeys.list(workspaceId) })`.

---

## 14. Error Handling & Unified Error Codes

Errors are passed through standardized status codes and normalized payload formats:

```ts
// Standardized API Error Response Payload
{
  "success": false,
  "error": {
    "code": "CLIENT_EMAIL_ALREADY_EXISTS",
    "message": "A client with this email already exists in this workspace"
  }
}
```

### HTTP Status Code Mapping

| Status Code | Error Code | Trigger Condition |
| :--- | :--- | :--- |
| **`400 Bad Request`** | `VALIDATION_ERROR` | Zod input schema validation failure or invalid state transition |
| **`401 Unauthorized`** | `UNAUTHORIZED` | Missing, malformed, or expired Clerk JWT session token |
| **`403 Forbidden`** | `FORBIDDEN` | Authenticated user is not a workspace member or role lacks policy permission |
| **`404 Not Found`** | `NOT_FOUND` | Target record does not exist or has been soft-deleted |
| **`409 Conflict`** | `CONFLICT` | Unique database constraint violation (e.g. duplicate client email or workspace slug) |
| **`410 Gone`** | `GONE` | Attempting to access soft-deleted entity |
| **`500 Internal Error`** | `INTERNAL_ERROR` | Unhandled database or server exception |

---

## 15. "Where Should I Make This Change?" Quick Reference

| I Want To... | File / Directory Location |
| :--- | :--- |
| **Add a new database table or column** | `packages/database/src/schema/`, then run `pnpm --filter @repo/database db:push` |
| **Add or modify HTTP validation rules** | `apps/api/src/domains/<domain>/<domain>.schema.ts` |
| **Change domain business rules / math** | `apps/api/src/domains/<domain>/<domain>.service.ts` |
| **Modify user permission / RBAC rules** | `apps/api/src/domains/<domain>/<domain>.policies.ts` |
| **Add a backend API route** | `apps/api/src/domains/<domain>/<domain>.routes.ts` & `controller.ts` |
| **Add a frontend API fetcher function** | `apps/web/src/features/<domain>/api/<domain>.api.ts` |
| **Add a frontend query/mutation hook** | `apps/web/src/features/<domain>/hooks/use<Feature>.ts` |
| **Update UI feature layout or modal** | `apps/web/src/features/<domain>/components/` |
| **Modify shared UI buttons / cards** | `apps/web/src/shared/components/` |
| **Update design system colors or tokens** | `apps/web/src/styles/globals.css` & `docs/01-product/design-language.md` |
| **Modify authentication or JWT middleware** | `apps/api/src/middleware/auth.middleware.ts` & `apps/web/middleware.ts` |

---

## 16. Architectural Anti-Patterns ("What NOT To Do")

1. ❌ **NEVER bypass the Service or Policy layer in Controllers**: Controllers must NEVER query database repositories or execute business logic directly.
2. ❌ **NEVER trust `req.body.userId` for Actor Identity**: Always extract actor identity from `req.user.id` set by `userResolverMiddleware`.
3. ❌ **NEVER call Axios directly in React Components**: Components must invoke feature hooks (`useClients`, `useCreateProject`), keeping UI presentation decoupled from HTTP transport.
4. ❌ **NEVER mix feature UI into `shared/components`**: Shared components (`Button`, `Card`, `Dialog`) must remain domain-agnostic UI primitives.
5. ❌ **NEVER store raw Clerk string IDs in UUID database columns**: Always resolve Clerk string IDs to PostgreSQL `users.id` UUIDs via `userResolverMiddleware`.
6. ❌ **NEVER omit `workspaceId` from database queries**: All repository queries must explicitly filter by `workspace_id` to maintain multi-tenant data isolation.
