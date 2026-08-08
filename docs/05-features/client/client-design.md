# Client Domain Design

**Version:** 1.0
**Last Updated:** August 8, 2026
**Status:** Pre-Implementation Specification
**Owner:** Engineering Team
**Sprint:** Sprint 2

---

## Document Purpose

This document is **Part 2 of 3** in the Client Domain Specification. It outlines the backend and frontend architecture for the Client vertical slice.

| Document | Contents |
|----------|----------|
| `client.md` | Product spec: features, UX flows, personas, acceptance criteria |
| `client-design.md` (this file)| Engineering design: architecture, domain model, file structure |
| `client-api.md` | API specification: endpoints, request/response schemas, error codes |

---

## Architectural Principles

The Client domain MUST strictly follow the exact same thin-controller, thick-service architecture established in Sprint 1 by the Workspace domain.

### 1. Transport Layer (Controller)
- Framework-aware (Express)
- Handles HTTP request/response
- Extracts actor context (user ID, workspace ID)
- Validates payload with Zod
- Maps domain results to HTTP responses

### 2. Domain Layer (Service, Policies, Errors)
- Framework-agnostic (pure TypeScript)
- Orchestrates business logic
- Checks policies (authorization)
- Emits domain events
- Interacts with repositories
- Returns `Result<T>` — success or typed error (NEVER throws domain exceptions)

### 3. Persistence Layer (Repository)
- Hides ORM (Drizzle) details from the service
- Operates on primitive types and models
- Throws specific persistence exceptions caught by the service

---

## Directory Structure Specification

The code will be organized in a feature-sliced modular architecture exactly mirroring Workspace.

### Backend (apps/api)

```
apps/api/src/domains/client/
├── index.ts                # Public API barrel file
├── client.routes.ts        # Express router registration
├── client.controller.ts    # HTTP request/response handling
├── client.service.ts       # Core business logic
├── client.policies.ts      # Pure functions for authorization rules
├── client.schema.ts        # Zod validation schemas
├── client.types.ts         # TypeScript interfaces (DTOs, inputs)
├── client.mapper.ts        # Transforms internal representations to external DTOs
├── client.errors.ts        # Typed domain errors extending ClientDomainError
├── client.events.ts        # Domain event payloads and interfaces
└── repository/
    ├── index.ts            # Repository barrel file
    └── client.repository.ts # Drizzle ORM operations
```

### Database Package (packages/database)

```
packages/database/src/schema/
├── enums.ts                # Add clientStatusEnum
├── clients.ts              # New table definition (clientTable)
└── index.ts                # Export new tables and relations

packages/database/migrations/
└── 00X_add_clients.sql     # Drizzle migration
```

### Frontend (apps/web)

```
apps/web/src/features/client/
├── index.ts                # Public feature barrel file
├── api/
│   ├── index.ts            # Export API client & keys
│   ├── client.api.ts       # Axios wrapper for Client endpoints
│   ├── client.keys.ts      # TanStack query keys (e.g. ['clients', workspaceId])
│   └── client.types.ts     # Frontend types matching backend DTOs
├── components/
│   ├── ClientList.tsx
│   ├── ClientCard.tsx
│   ├── ClientDetail.tsx
│   ├── CreateClientDialog.tsx
│   └── EditClientDialog.tsx
└── hooks/
    ├── useClients.ts
    ├── useClient.ts
    ├── useCreateClient.ts
    ├── useUpdateClient.ts
    ├── useDeleteClient.ts
    └── useRestoreClient.ts
```

---

## Domain Policies (client.policies.ts)

Policies dictate *who* can do *what*. They are pure functions that evaluate context and return a `PolicyResult` (`{ allowed: true }` or `{ allowed: false, code, reason }`).

Since Clients belong to a Workspace, all client policies derive from Workspace membership roles.

| Operation | Required Role | Pure Function Signature |
|-----------|---------------|-------------------------|
| Create Client | `editor` or `owner` | `canCreateClient(membership: WorkspaceMember \| null): PolicyResult` |
| View Client | `viewer`, `editor`, or `owner` | `canViewClient(membership: WorkspaceMember \| null): PolicyResult` |
| Update Client | `editor` or `owner` | `canUpdateClient(membership: WorkspaceMember \| null): PolicyResult` |
| Delete Client | `owner` | `canDeleteClient(membership: WorkspaceMember \| null): PolicyResult` |
| Restore Client | `owner` | `canRestoreClient(membership: WorkspaceMember \| null): PolicyResult` |

**Rule:** The service layer must fetch the actor's workspace membership and pass it to these policy functions *before* executing business logic.

---

## Error Handling (client.errors.ts)

Domain errors must subclass `ClientDomainError` (which extends `Error`). The controller layer translates these into HTTP status codes.

| Domain Error | Error Kind | HTTP Status (Controller mapping) |
|--------------|------------|----------------------------------|
| `ClientValidationError` | `validation` | 400 Bad Request |
| `ClientPermissionDeniedError` | `permission_denied` | 403 Forbidden |
| `ClientNotFoundError` | `not_found` | 404 Not Found |
| `ClientEmailAlreadyExistsError` | `conflict` | 409 Conflict |
| `ClientDeletedError` | `conflict` | 410 Gone |
| `ClientNotDeletedError` | `conflict` | 400 Bad Request |
| `ClientInternalError` | `internal` | 500 Internal Server Error |

---

## Domain Events (client.events.ts)

The domain must emit events for any state mutation. This decouples logic (e.g., triggering notifications or analytics) from the core service.

1. `client.created`
2. `client.updated`
3. `client.deleted` (soft-delete)
4. `client.restored`

**Event Shape:**
```typescript
interface ClientDomainEventBase {
  readonly type: string;
  readonly clientId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly occurredAt: string;
}
```

---

## Database Schema Design (packages/database)

The client schema must be created since it does not currently exist.

**1. Enum Definition (`enums.ts`)**
```typescript
export const clientStatusEnum = pgEnum('client_status', ['active', 'inactive', 'archived']);
```

**2. Client Table (`clients.ts`)**
```typescript
import {
  pgTable, uuid, varchar, text, timestamp, index, foreignKey
} from 'drizzle-orm/pg-core';
import { workspacesTable } from './workspaces';
import { clientStatusEnum } from './enums';

export const clientsTable = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),

  // Identity
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),

  // Company
  companyName: varchar('company_name', { length: 255 }),
  gstNumber: varchar('gst_number', { length: 50 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  department: varchar('department', { length: 255 }),

  // Address
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('IN'),

  // Status
  status: clientStatusEnum('status').notNull().default('active'),

  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  workspaceIdx: index('idx_clients_workspace_id').on(table.workspaceId),
  emailIdx: index('idx_clients_email').on(table.email),
  workspaceEmailUnique: uniqueIndex('idx_clients_workspace_email')
    .on(table.workspaceId, table.email)
    .where(isNull(table.deletedAt)), // Prevent duplicate emails in same workspace, allowing reuse if deleted
  fkWorkspace: foreignKey({
    columns: [table.workspaceId],
    foreignColumns: [workspacesTable.id],
    onDelete: 'cascade'
  })
}));
```

---

## Service Implementation Pattern

The `ClientService` will inject the `ClientRepository`, `WorkspaceMemberRepository`, and `IClientEventEmitter`.

```typescript
// Skeleton example for createClient
async createClient(
  input: CreateClientServiceInput,
  workspaceId: string,
  actorId: string,
): Promise<Result<Client>> {
  // 1. Validate input via Zod schema
  // 2. Fetch actor's workspace membership
  // 3. Evaluate policy: canCreateClient(membership)
  // 4. Try-catch repository operation
  // 5. Emit 'client.created' event
  // 6. Return ok(client) or err(WorkspaceInternalError)
}
```

---

## Frontend Integration

The frontend will use TanStack Query wrapper hooks inside `apps/web/src/features/client/hooks/`.

1. **`useClients(workspaceId: string)`**
   - Query Key: `['clients', workspaceId, 'list']`
   - Fetches all clients for the active workspace.
2. **`useCreateClient()`**
   - Mutation that invalidates `['clients', workspaceId, 'list']` on success.
3. **`useUpdateClient(clientId)`**
   - Mutation that optimistically updates the cache and invalidates `['clients', workspaceId, 'detail', clientId]`.

UI components must be built using the `shadcn/ui` components located in `packages/ui`. Do not reinvent forms, use `react-hook-form` + `zod` schema resolvers sharing the same Zod schemas defined in the API if possible, or replicating them precisely.

---

**End of Client Feature Design (Part 2 of 3)**
