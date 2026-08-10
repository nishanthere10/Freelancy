# Sprint 2: Client Management Domain

**Version:** 1.0  
**Status:** Phase 2 COMPLETE - Client Domain & UI Layer Implemented  
**Date:** August 4-5, 2026

---

## Executive Summary

Sprint 2 implements the **Client Management Domain** for Freelance OS. This covers:

1. **Database Schema**: `clients` table with composite unique constraint `(workspace_id, email)` on non-deleted records and foreign key to `workspaces`.
2. **Repository Layer**: `ClientRepository` with CRUD operations, search, pagination, and soft delete support.
3. **Domain Layer**: Client business logic, RBAC policies (`canCreateClient`, `canUpdateClient`, `canDeleteClient`), domain events, and typed errors (`ClientNotFoundError`, `ClientEmailAlreadyExistsError`).
4. **Service & HTTP Controller**: `ClientService` with Result<T> pattern, Express router mounted at `/api/v1/workspaces/:workspaceId/clients`.
5. **Frontend Web Integration**: `ClientPage`, `CreateClientForm`, `CreateClientDialog`, and TanStack Query hooks (`useClients`, `useCreateClient`, `useUpdateClient`).
6. **Testing**: Unit tests for repository/service and Vitest route integration tests.

---

## What Was Built

### Phase 2a: Database & Repository (COMPLETE ✅)

**Database Schema (`packages/database/src/schema/clients.ts`)**
- `clients` table with fields: `id`, `workspaceId`, `name`, `email`, `phone`, `website`, `companyName`, `gstNumber`, `contactPerson`, `department`, `address`, `city`, `state`, `postalCode`, `country`, `status` (`active` | `inactive` | `archived`), audit timestamps.
- Partial unique index `idx_clients_workspace_email` enforcing unique email per workspace for non-deleted records.
- Foreign key cascade reference to `workspaces.id`.

**Repository Layer (`apps/api/src/domains/client/repository/client.repository.ts`)**
- `create`, `getById`, `getByEmail`, `list` (with search and status filters), `update`, `softDelete`, `restore`.
- Explicit handling of PostgreSQL duplicate email constraint (`23505`) and foreign key violation (`23503`).

---

### Phase 2b: Domain & Service Layer (COMPLETE ✅)

**Schemas & Types (`client.schema.ts`, `client.types.ts`)**
- Zod schemas: `createClientSchema`, `updateClientSchema`, `clientParamsSchema`.
- Input validation: email format, phone format, GST number format, length bounds.

**Policies & Errors (`client.policies.ts`, `client.errors.ts`)**
- `canCreateClient`, `canViewClient`, `canUpdateClient`, `canDeleteClient`, `canRestoreClient`.
- Requires `editor` or `owner` role for write operations; `owner` only for hard deletion/restoration.
- Domain errors: `ClientEmailAlreadyExistsError`, `ClientPermissionDeniedError`, `ClientNotFoundError`, `ClientDeletedError`.

**Service & Controller (`client.service.ts`, `client.controller.ts`, `client.routes.ts`)**
- `ClientService` implementing business rules and emitting domain events (`client.created`, `client.updated`, `client.deleted`).
- REST endpoints:
  - `POST /api/v1/workspaces/:workspaceId/clients`
  - `GET /api/v1/workspaces/:workspaceId/clients`
  - `GET /api/v1/workspaces/:workspaceId/clients/:clientId`
  - `PATCH /api/v1/workspaces/:workspaceId/clients/:clientId`
  - `DELETE /api/v1/workspaces/:workspaceId/clients/:clientId`

---

### Phase 2c: Web UI Integration (COMPLETE ✅)

**Frontend Components (`apps/web/src/features/client/`)**
- `ClientPage.tsx`: Client list overview with search, status filtering, and create modal trigger.
- `CreateClientForm.tsx`: React Hook Form with Zod validation (`clientFormSchema`).
- `CreateClientDialog.tsx`: Modal wrapper with error handling and toast notifications.
- `client.api.ts` & `hooks/`: TanStack Query hooks (`useClients`, `useCreateClient`, `useDeleteClient`).

---

## Verification & Testing

- ✅ **Unit Tests**: `client.service.test.ts` & `client.repository.test.ts` passing 100%.
- ✅ **Typecheck**: `@repo/api` & `web` clean build with zero TypeScript errors.
- ✅ **Biome Linting**: Cleared non-null assertions and unneeded type casts.
