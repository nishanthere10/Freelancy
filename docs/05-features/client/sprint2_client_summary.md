# Sprint 2 Client Management — Reasoning Agent Summary

**Version:** 1.0  
**Date:** August 8, 2026  
**Status:** Completed & Validated (RC-1 & RC-2 Pass)  
**Target Audience:** AI Reasoning Agents & Senior Engineers  

---

## 1. Domain Context & Hierarchy

Client Management is the **second vertical slice** of Freelance OS, following the reference Workspace slice.

```text
User
 └── Workspace (Sprint 1 — complete)
      └── Client (Sprint 2 — THIS SLICE)
           └── Project (Sprint 3)
                └── Invoice (Sprint 4)
```

Clients are workspace-scoped entities representing persistent contact records across multiple projects and invoices.

---

## 2. Database Layer (`packages/database`)

- **Schema File:** [`packages/database/src/schema/clients.ts`](file:///packages/database/src/schema/clients.ts)
- **Enum File:** [`packages/database/src/schema/enums.ts`](file:///packages/database/src/schema/enums.ts) -> `clientStatusEnum` (`'active'`, `'inactive'`, `'archived'`)
- **Migration:** [`packages/database/migrations/0002_add_clients.sql`](file:///packages/database/migrations/0002_add_clients.sql)

### Table Structure (`clients`)
- `id`: `uuid` (Primary Key, default `gen_random_uuid()`)
- `workspace_id`: `uuid` (Foreign Key -> `workspaces.id` `ON DELETE CASCADE`)
- `name`: `varchar(255)` (Required)
- `email`: `varchar(255)` (Required)
- `phone`, `website`, `company_name`, `gst_number`, `contact_person`, `department`: `varchar` (Optional)
- `address`: `text`, `city`: `varchar(100)`, `state`: `varchar(100)`, `postal_code`: `varchar(20)`, `country`: `varchar(100)` (Default `'IN'`)
- `status`: `client_status` (Default `'active'`)
- `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`: Audit timestamps & actors.

### Indexes & Constraints
- Index: `idx_clients_workspace_id` on `workspace_id`
- Index: `idx_clients_email` on `email`
- Partial Unique Index: `idx_clients_workspace_email` on `(workspace_id, email) WHERE deleted_at IS NULL` (allows re-creating same email after soft delete).

---

## 3. Backend Architecture (`apps/api/src/domains/client`)

Mounted at: `/api/v1/workspaces/:workspaceId/clients`

### RC-1 Type Boundaries
```text
CreateClientRequest (HTTP Body DTO)
      ↓
CreateClientServiceInput (Service Input)
      ↓
CreateClientRepositoryInput (Repository Input)
      ↓
clientsTable (Database Model)
```

### Endpoints (`client.routes.ts`)
1. `GET /` — List clients (Filters: `status`, `search`, `excludeDeleted`).
2. `POST /` — Create client (Requires Zod `createClientSchema`, validates India GST format `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).
3. `GET /:clientId` — Get client detail.
4. `PATCH /:clientId` — Update client.
5. `DELETE /:clientId` — Soft-delete client (`status = 'archived'`, `deletedAt = now()`).
6. `POST /:clientId/restore` — Restore archived client (`status = 'active'`, `deletedAt = null`).

### Service Layer (`client.service.ts`)
- Returns `Result<T>` discriminated union (`{ success: true, data: T } | { success: false, error: ClientDomainError }`).
- Evaluates policy functions in `client.policies.ts`:
  - `canViewClient`: Requires active workspace membership.
  - `canCreateClient`, `canUpdateClient`: Requires `editor` or `owner` workspace role.
  - `canDeleteClient`, `canRestoreClient`: Requires `owner` workspace role.
- Emits events (`client.created`, `client.updated`, `client.deleted`, `client.restored`) to `NullClientEventEmitter`.

---

## 4. Frontend Architecture (`apps/web/src/features/client`)

```text
Page (app/workspaces/[workspaceId]/clients/page.tsx)
  ↓
ClientPage Component (src/features/client/components/ClientPage.tsx)
  ↓
TanStack Query Hooks (src/features/client/hooks/)
  ↓
API Client Functions (src/features/client/api/client.api.ts)
  ↓
Shared Axios Client (@api/client)
```

### Core Modules
- `api/`: Centralized Axios functions (`client.api.ts`), query key factory (`client.keys.ts`), and DTO types (`client.types.ts`).
- `hooks/`: `useClients`, `useClient`, `useCreateClient`, `useUpdateClient`, `useDeleteClient`, `useRestoreClient`. Mutations automatically invalidate query cache `clientKeys.lists()`.
- `schemas/`: Zod form validation schema (`clientFormSchema`).
- `components/`: `ClientPage`, `ClientList`, `ClientCard`, `ClientDetail`, `CreateClientDialog`, `CreateClientForm`, `EditClientDialog`, `ClientEmptyState`.
- `shared/components/`: Uses design system tokens (`Button`, `Card`, `Dialog`, `FormField`, `Input`, `Skeleton`) and `@phosphor-icons/react`.

---

## 5. Development Seeding & Mock Auth

- Mock Auth Middleware in `apps/api/src/index.ts` assigns `req.user = { id: "550e8400-e29b-41d4-a716-446655440000" }`.
- Auto-seed helper `ensureDefaultWorkspace()` in `apps/api/src/index.ts` automatically creates default workspace `550e8400-e29b-41d4-a716-446655440000` with owner membership on API startup if `process.env.NODE_ENV !== "production"`.

---

## 6. Testing & Quality Verification

- **Backend Unit Tests:** `apps/api/src/domains/client/__tests__/client.service.test.ts` (105 total API tests pass).
- **Frontend Component Tests:** `apps/web/src/features/client/components/__tests__/ClientPage.test.tsx`.
- **E2E Integration Test:** `apps/web/e2e/client.spec.ts`.
- **TypeScript:** 100% clean typecheck across all 6 monorepo packages (`pnpm typecheck`).
