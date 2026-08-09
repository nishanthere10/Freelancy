# Sprint 3 Project Management — Reasoning Agent Summary

**Version:** 1.0  
**Date:** August 9, 2026  
**Status:** Implemented & Validated (RC-1 Architecture Pass)  
**Target Audience:** AI Reasoning Agents & Senior Engineers  

---

## 1. Domain Context & Hierarchy

Project Management is the **third vertical slice** of Freelance OS, building upon Workspace (Sprint 1) and Client (Sprint 2).

```text
User
 └── Workspace (Sprint 1 — Production Ready)
      └── Client (Sprint 2 — Production Ready)
           └── Project (Sprint 3 — THIS SLICE)
                └── Invoice (Sprint 4 — Planned)
```

Projects represent bounded work agreements between freelancers and clients (or unassigned internal initiatives) within a workspace.

---

## 2. Database Layer (`packages/database`)

- **Schema File:** [`packages/database/src/schema/projects.ts`](file:///packages/database/src/schema/projects.ts)
- **Enum File:** [`packages/database/src/schema/enums.ts`](file:///packages/database/src/schema/enums.ts) ➔ `projectStatusEnum` (`'draft'`, `'active'`, `'completed'`, `'archived'`), `pricingModelEnum` (`'fixed'`, `'hourly'`, `'retainer'`)
- **Migration:** [`packages/database/migrations/0003_add_projects.sql`](file:///packages/database/migrations/0003_add_projects.sql)

### Table Structure (`projects`)
- `id`: `uuid` (Primary Key, default `gen_random_uuid()`)
- `workspace_id`: `uuid` (Foreign Key ➔ `workspaces.id` `ON DELETE CASCADE`)
- `client_id`: `uuid` (Nullable, Composite Foreign Key ➔ `clients(workspace_id, id)` `ON DELETE SET NULL`)
- `name`: `varchar(255)` (Required)
- `slug`: `varchar(255)` (Required, URL-safe)
- `description`: `text` (Optional scope details)
- `status`: `project_status` (Default `'draft'`)
- `pricing_model`: `pricing_model` (Default `'fixed'`)
- `budget_currency`: `varchar(3)` (Default `'INR'`)
- `budget_amount`: `numeric(12, 2)` (Optional budget)
- `start_date`, `target_date`: `date` (Optional timeline)
- `completed_at`: `timestamp with time zone` (Set when status ➔ `'completed'`)
- `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`: Audit & soft-delete timestamps.

### Database Integrity & Tenant Constraints
- Index: `idx_projects_workspace_id` on `workspace_id`
- Index: `idx_projects_client_id` on `client_id`
- Index: `idx_projects_status` on `status`
- Partial Unique Index: `idx_projects_workspace_slug` on `(workspace_id, slug) WHERE deleted_at IS NULL`
- Composite Foreign Key Constraint: `CONSTRAINT fk_projects_workspace_client FOREIGN KEY (workspace_id, client_id) REFERENCES clients (workspace_id, id) ON DELETE SET NULL` — Enforces database-level isolation so projects cannot reference a client belonging to a different workspace.

---

## 3. Backend Architecture (`apps/api/src/domains/project`)

Mounted at: `/api/v1/workspaces/:workspaceId/projects`

### Type Boundaries
```text
CreateProjectRequest (HTTP Body DTO)
      ↓
CreateProjectServiceInput (Service Input)
      ↓
CreateProjectRepositoryInput (Repository Input)
      ↓
projectsTable (Database Entity)
      ↓
ProjectResponse (HTTP Response DTO)
```

### Endpoints (`project.routes.ts`)
1. `GET /` — List projects in workspace (Filters: `status`, `clientId`, `search`, `excludeDeleted`).
2. `POST /` — Create project (Zod payload validation, date sequence check `targetDate >= startDate`).
3. `GET /:projectId` — Get detailed project view.
4. `PATCH /:projectId` — Update project metadata.
5. `PATCH /:projectId/status` — Change project status (`draft`, `active`, `completed`, `archived`).
6. `DELETE /:projectId` — Soft-delete / archive project.
7. `POST /:projectId/restore` — Restore archived project.

### Service Layer (`project.service.ts`)
- Returns `Result<T>` discriminated union (`{ success: true; data: T } | { success: false; error: ProjectDomainError }`).
- Evaluates workspace membership policy functions in `project.policies.ts`:
  - `canViewProject`: Requires active workspace membership (`viewer`, `editor`, `owner`).
  - `canCreateProject`, `canUpdateProject`, `canChangeProjectStatus`: Requires `editor` or `owner` workspace role.
  - `canDeleteProject`, `canRestoreProject`: Requires `owner` workspace role.
- Validates client workspace scope: returns `CLIENT_WORKSPACE_MISMATCH` if `clientId` does not belong to `workspaceId`.
- Emits events (`project.created`, `project.updated`, `project.status_changed`, `project.deleted`, `project.restored`) to `NullProjectEventEmitter`.

---

## 4. Frontend Architecture (`apps/web/src/features/project`)

```text
Page (app/workspaces/[workspaceId]/projects/page.tsx)
  ↓
ProjectPage Component (src/features/project/components/ProjectPage.tsx)
  ↓
TanStack Query Hooks (src/features/project/hooks/)
  ↓
API Client Functions (src/features/project/api/project.api.ts)
  ↓
Shared Fetcher Client (@api/client)
```

### Core Modules
- `api/`: Centralized functions (`project.api.ts`), query key factory (`project.keys.ts`), and DTO interfaces (`project.types.ts`).
- `hooks/`: `useProjects`, `useProject`, `useCreateProject`, `useUpdateProject`, `useUpdateProjectStatus`, `useDeleteProject`, `useRestoreProject`. Mutations automatically invalidate query cache `projectKeys.lists()`.
- `schemas/`: Zod form validation schema (`projectFormSchema`).
- `components/`: `ProjectPage`, `ProjectList`, `ProjectCard`, `ProjectDetail`, `ProjectStatusControl`, `CreateProjectDialog`, `CreateProjectForm`, `EditProjectDialog`, `ProjectEmptyState`.
- `shared/components/`: Integrates shared UI components (`Button`, `Card`, `Dialog`, `FormField`, `Input`, `Skeleton`) and `@phosphor-icons/react`.

---

## 5. Security & Multi-Tenant Isolation
1. **Tenant Isolation**: Every SQL query contains `eq(projectsTable.workspaceId, workspaceId)`.
2. **Cross-Tenant Client Safeguard**: Service layer validates `client.workspaceId === workspaceId`. Database enforces composite FK `(workspace_id, client_id)`.
3. **Actor Integrity**: User ID is extracted from authenticated context (`req.user.id`).

---

## 6. Verification Status & Next Steps
- **RC-1 Architecture Review**: PASSED ✅
- Domain layer, database schema, type boundaries, RBAC policies, and frontend state architecture verified.
- **Next Stage**: RC-2 Full Verification (Ready for human review and RC-2 command verification).
