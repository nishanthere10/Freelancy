# Sprint 10 RC-1 Release Report: Activity & Audit Trail

## 1. Product Scope

Sprint 10 introduces a first-class, workspace-scoped **Activity & Audit Trail** capability into Freelance OS. It converts our internal domain events into an immutable, user-facing chronological activity feed on the executive dashboard and API.

---

## 2. Event Inventory

All 19 core domain events are fully mapped and handled:
- **Workspace (8)**: `created`, `updated`, `deleted`, `restored`, `ownership_transferred`, `member_added`, `member_removed`, `member_role_changed`.
- **Client (4)**: `created`, `updated`, `deleted`, `restored`.
- **Project (5)**: `created`, `updated`, `status_changed`, `deleted`, `restored`.
- **Invoice (6)**: `created`, `updated`, `sent`, `paid`, `cancelled`, `deleted`.

---

## 3. Database Changes

- Created `packages/database/src/schema/activity.ts` defining `activity_events` with composite indexes and foreign keys.
- Generated SQL migration `packages/database/migrations/0005_add_activity_events.sql`.
- Re-exported schema in `packages/database/src/schema/index.ts`.

---

## 4. Backend Architecture

- **`ActivityRepository`**: Workspace-scoped queries with actor joins, sorting, and cursor pagination.
- **`ActivityEventConsumer`**: Ingests domain events and writes to database fail-safely without impacting core transactions.
- **`ActivityService`**: Authorizes workspace membership, applies query filters, generates human-readable descriptions, and formats DTOs.
- **`ActivityController` & Route**: `GET /api/v1/workspaces/:workspaceId/activity` with Zod query validation.
- Wired into `ClientController`, `ProjectController`, `InvoiceController`, `WorkspaceController`, and `app.ts`.

---

## 5. Frontend & Dashboard Integration

- Built `apps/web/src/features/activity`:
  - `ActivityFeed.tsx`
  - `ActivityItem.tsx` with Phosphor icons & domain color badges (Teal, Amber, Rose, Indigo)
  - `ActivitySkeleton.tsx`
  - `ActivityEmptyState.tsx`
  - `useActivity.ts` with factory query keys
- Integrated `ActivityFeed` into `DashboardPage.tsx` next to `RecentInvoicesList`.

---

## 6. Verification Results

- **Unit & Integration Tests**: All unit tests passing across Service, Consumer, Repository, and HTTP layers.
- **Security & Tenant Isolation**: Verified non-members receive `403 Forbidden`.
- **Typecheck & Linting**: 100% clean type compilation and Biome formatting.

---

## Final Decision

```text
🟢 ACTIVITY RC-1 PASS
```
