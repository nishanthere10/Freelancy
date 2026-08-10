# Freelance-OS — System Walkthrough & Engineering Mental Model

**Authoritative Re-orientation & Architectural Stitching Guide**  
**Target Audience:** Human Developers, Technical Mentors, & AI Coding Agents  
**Last Updated:** August 9, 2026  
**System Status:** Sprint 1 (Workspace) 🟢 PASS | Sprint 2 (Client) 🟢 PASS | Sprint 3 (Project) 🟢 PASS  

---

## Table of Contents
1. [The 10-Minute Mental Model](#1-the-10-minute-mental-model)
2. [The Monorepo Mental Model](#2-the-monorepo-mental-model)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Frontend Request Flow](#4-frontend-request-flow)
5. [Backend Architecture](#5-backend-architecture)
6. [Controller vs Service vs Repository](#6-controller-vs-service-vs-repository)
7. [Database Architecture](#7-database-architecture)
8. [The Most Important Relationship Model (Multi-Tenancy)](#8-the-most-important-relationship-model-multi-tenancy)
9. [Authentication Architecture](#9-authentication-architecture)
10. [Authorization & RBAC Policies](#10-authorization--rbac-policies)
11. [Result\<T\> Error Model](#11-resultt-error-model)
12. [Validation Pipeline](#12-validation-pipeline)
13. [Data Transformation Matrix](#13-data-transformation-matrix)
14. [TanStack Query Mental Model](#14-tanstack-query-mental-model)
15. [Full Create Project Trace](#15-full-create-project-trace)
16. [Full Update Project Trace](#16-full-update-project-trace)
17. [Full Status Change Trace](#17-full-status-change-trace)
18. [Full Archive & Restore Trace](#18-full-archive--restore-trace)
19. [Domain Events Architecture](#19-domain-events-architecture)
20. [What Happens When Something Fails? (Failure Map)](#20-what-happens-when-something-fails-failure-map)
21. [What Happens When a User Crosses Tenant Boundaries?](#21-what-happens-when-a-user-crosses-tenant-boundaries)
22. [Request/Response Payload Contract Reference](#22-requestresponse-payload-contract-reference)
23. [File-to-File Matrix](#23-file-to-file-matrix)
24. [Where Do I Go When Something Breaks? (Debugging Decision Trees)](#24-where-do-i-go-when-something-breaks-debugging-decision-trees)
25. [Common Development & Debugging Commands](#25-common-development--debugging-commands)
26. [Development Workflow & Feature Lifecycle](#26-development-workflow--feature-lifecycle)
27. [How to Add a New Domain (Sprint 4 Invoice Blueprint)](#27-how-to-add-a-new-domain-sprint-4-invoice-blueprint)
28. [Architectural Invariants](#28-architectural-invariants)
29. [Things AI Coding Agents Must NOT Do](#29-things-ai-coding-agents-must-not-do)
30. [Architectural Tradeoffs](#30-architectural-tradeoffs)
31. [Current Technical Debt](#31-current-technical-debt)
32. [Future Architecture](#32-future-architecture)
33. [Learning Guide: If You Only Remember 20 Things](#33-learning-guide-if-you-only-remember-20-things)
34. [Build Your Mental Model (Complete Diagram)](#34-build-your-mental-model-complete-diagram)

---

## 1. The 10-Minute Mental Model

If you forget everything about Freelance-OS and need to reconstruct the application in 10 minutes, remember these core structural blocks:

```text
Freelance-OS Monorepo
│
├── apps/web (Next.js 15 App Router — React 19 UI)
│    └── OWNS: User interactions, client-side route rendering, form presentation, TanStack Query cache.
│    └── DOES NOT OWN: Database queries, business rule enforcement, actor identity verification.
│
├── apps/api (Express REST Backend Server)
│    └── OWNS: HTTP routing, Zod input validation, authorization policies, domain business logic, Result<T> wrapping.
│    └── DOES NOT OWN: UI rendering, Direct browser state management.
│
├── packages/database (Drizzle ORM & PostgreSQL Schema)
│    └── OWNS: PostgreSQL table definitions, Drizzle migrations, composite foreign keys, enum declarations, schema types.
│    └── DOES NOT OWN: Express middleware or HTTP controllers.
│
└── packages/tsconfig & biome-config (Shared Tooling)
     └── OWNS: Shared TypeScript compiler settings and Biome linting/formatting rules.
```

### Communication Protocol
- **`apps/web` ➔ `apps/api`**: Pure REST API over JSON via a centralized, typed Axios HTTP client (`apps/web/src/api/client.ts`).
- **`apps/api` ➔ `packages/database`**: Direct TypeScript object queries via Drizzle ORM (`db.select()`, `db.insert()`, `db.update()`).
- **`packages/database` ➔ PostgreSQL**: Native PostgreSQL connection pool managed via standard database URL environment configuration (`DATABASE_URL`).

---

## 2. The Monorepo Mental Model

Freelance-OS uses pnpm workspaces and Turbo Repo to maintain strict dependency isolation:

```text
               apps/web (Next.js)                 apps/api (Express)
                      │                                  │
                      ├─────────────────┐                │
                      ▼                 ▼                ▼
              packages/database  packages/tsconfig  packages/biome-config
                      │
                      ▼
                 PostgreSQL
```

### Package Ownership Boundaries
1. **`apps/web`**: Consumes `@shared/components`, feature hooks, and API functions. Imports types from `@repo/database` or internal feature DTOs.
2. **`apps/api`**: Consumes `@repo/database` for DB table definitions and types. Hosts all domain logic (`workspace`, `client`, `project`).
3. **`packages/database`**: Houses schema exports (`workspacesTable`, `clientsTable`, `projectsTable`). No application dependencies allowed.

---

## 3. Frontend Architecture

The frontend follows a **Feature-Sliced Architecture** inside Next.js App Router:

```text
apps/web/
├── app/                              # Next.js App Router (File-based Routing)
│   └── workspaces/
│       └── [workspaceId]/
│           ├── clients/page.tsx       # Route entrypoint -> renders ClientPage
│           └── projects/page.tsx      # Route entrypoint -> renders ProjectPage
│
└── src/
    ├── api/                          # Central Axios Client & Interceptors
    │   ├── client.ts                 # apiGet, apiPost, apiPatch, apiDelete
    │   └── interceptors.ts           # Error normalization
    │
    ├── features/                     # Domain Vertical Slices
    │   ├── workspace/
    │   ├── client/
    │   └── project/                  # Project Feature Slice
    │       ├── api/                  # REST endpoints & Query Keys (project.api.ts, project.keys.ts)
    │       ├── components/           # React Components (ProjectPage, ProjectCard, ProjectDetail, etc.)
    │       ├── hooks/                # TanStack Query Hooks (useProjects, useCreateProject, etc.)
    │       └── schemas/              # React Hook Form Zod validation schemas (project.schema.ts)
    │
    └── shared/                       # Cross-Feature UI Primitives
        └── components/               # Button, Card, Dialog, FormField, Input, Skeleton
```

---

## 4. Frontend Request Flow

When a user clicks **"+ Add Project"** and submits the form, data flows through these exact frontend files:

```text
1. User clicks "+ Add Project" in ProjectPage
   File: apps/web/src/features/project/components/ProjectPage.tsx
   Action: Sets `createDialogOpen = true`.

2. CreateProjectDialog renders modal
   File: apps/web/src/features/project/components/CreateProjectDialog.tsx
   Action: Renders `Dialog` containing `CreateProjectForm`.

3. User types input & clicks "Create Project"
   File: apps/web/src/features/project/components/CreateProjectForm.tsx
   Action: React Hook Form intercepts submit -> runs Zod validation `projectFormSchema`.

4. Form executes submission handler
   File: apps/web/src/features/project/components/CreateProjectForm.tsx (`onSubmit`)
   Action: Cleans form inputs into `CreateProjectInput` DTO, invokes `createMutation.mutate()`.

5. TanStack Query Hook executes mutation
   File: apps/web/src/features/project/hooks/useCreateProject.ts
   Action: Calls `createProject(workspaceId, data)`.

6. Feature API function prepares HTTP payload
   File: apps/web/src/features/project/api/project.api.ts
   Action: Calls `apiPost<ProjectResponse>(`/workspaces/${workspaceId}/projects`, data)`.

7. Central Axios Client fires HTTP POST
   File: apps/web/src/api/client.ts
   Action: Sends POST request to `http://localhost:5001/api/v1/workspaces/:workspaceId/projects`.
```

---

## 5. Backend Architecture

The backend implements a **Thin Controller, Thick Service, Policy-Governed, Repository-Isolated** architecture:

```text
HTTP Request
     │
     ▼
project.routes.ts              # Route definitions & express router mounting
     │
     ▼
Mock Auth Middleware           # Attaches req.user = { id: '...' }
     │
     ▼
project.controller.ts          # Unpacks params/body, maps Result<T> to HTTP status codes
     │
     ▼
project.service.ts             # Orchestrates domain logic, calls policies & repos, returns Result<T>
     │
     ├─────────────► project.policies.ts      # Checks WorkspaceRole permissions (owner/editor/viewer)
     │
     ▼
project.repository.ts          # Executes Drizzle ORM queries with MANDATORY workspaceId filter
     │
     ▼
Drizzle ORM / Postgres DB      # Executes SQL query with foreign key enforcement
```

---

## 6. Controller vs Service vs Repository

To maintain clean separation of concerns, each layer has explicit, strict boundaries:

| Layer | OWNS / ANSWERS | MUST NOT OWN | What Enters | What Leaves |
|---|---|---|---|---|
| **Controller** | "How do I map HTTP to a service invocation and return a JSON envelope?" | Business logic, direct database calls, SQL queries. | Express `Request`, `Response` | JSON Response Envelope (`{ success: true, data }` or error status) |
| **Service** | "Is this action valid according to business rules and actor permissions?" | HTTP status codes (`200`, `404`, `500`), Express `req`/`res` objects. | DTOs, `workspaceId`, `actorId` | `Result<T>` (`{ success: true, data }` or `{ success: false, error }`) |
| **Policy** | "Does this actor's workspace role allow this operation?" | Database queries, HTTP responses. | `WorkspaceMember` entity | `PolicyResult` (`{ allowed: boolean, reason?: string }`) |
| **Repository**| "How do I persist or retrieve this entity from PostgreSQL using Drizzle?" | Role permissions, HTTP DTO mapping, express request logic. | Filter objects, Repository Input DTOs | Drizzle DB Entities / Joined Entity objects |

### Concrete Example: Creating a Project
- **Controller (`project.controller.ts`)**: Checks `req.user.id`, calls `projectService.createProject()`, converts `PROJECT_SLUG_ALREADY_EXISTS` error code into HTTP `409 Conflict`.
- **Service (`project.service.ts`)**: Checks `canCreateProject(membership)`, validates target date >= start date, checks if client belongs to workspace, generates URL slug.
- **Policy (`project.policies.ts`)**: Evaluates `membership.role === 'owner' || membership.role === 'editor'`.
- **Repository (`project.repository.ts`)**: Executes `db.insert(projectsTable).values({...})` with PostgreSQL foreign key protection.

---

## 7. Database Architecture

Database schema definitions live in `packages/database/src/schema/`:

```text
packages/database/src/schema/
├── enums.ts          # workspaceRoleEnum, clientStatusEnum, projectStatusEnum, pricingModelEnum
├── workspaces.ts     # workspacesTable & workspaceMembersTable
├── clients.ts        # clientsTable
└── projects.ts       # projectsTable
```

### Table Schema Highlights (`projectsTable`)
```typescript
export const projectsTable = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    clientId: uuid('client_id'), // Nullable for internal projects
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    status: projectStatusEnum('status').notNull().default('draft'),
    pricingModel: pricingModelEnum('pricing_model').notNull().default('fixed'),
    budgetAmount: numeric('budget_amount', { precision: 12, scale: 2 }),
    startDate: date('start_date'),
    targetDate: date('target_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft deletion audit
  },
  (table) => ({
    workspaceIdx: index('idx_projects_workspace_id').on(table.workspaceId),
    clientIdx: index('idx_projects_client_id').on(table.clientId),
    statusIdx: index('idx_projects_status').on(table.status),
    workspaceSlugUnique: uniqueIndex('idx_projects_workspace_slug')
      .on(table.workspaceId, table.slug)
      .where(isNull(table.deletedAt)),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: 'projects_workspace_id_workspaces_id_fk',
    }).onDelete('cascade'),
    fkWorkspaceClient: foreignKey({
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clientsTable.workspaceId, clientsTable.id],
      name: 'fk_projects_workspace_client',
    }).onDelete('set null'),
  })
);
```

---

## 8. The Most Important Relationship Model (Multi-Tenancy)

Multi-tenant security in Freelance-OS is enforced at **three distinct layers**:

```text
                                  Tenant Isolation Boundary
                                  ┌────────────────────────┐
                                  │ Workspace (workspaceId)│
                                  └───────────┬────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
             Client (workspaceId, id)                    Project (workspaceId, id)
```

### Composite Foreign Key Guarantee
To prevent a critical cross-tenant data leak (e.g., attaching a Project in Workspace A to a Client in Workspace B), the PostgreSQL database enforces a **Composite Foreign Key**:

```sql
CONSTRAINT fk_projects_workspace_client
FOREIGN KEY (workspace_id, client_id)
REFERENCES clients (workspace_id, id)
ON DELETE SET NULL
```

#### The 3 Protection Layers:
1. **Database Layer**: Postgres rejects any `INSERT` or `UPDATE` where `(projects.workspace_id, projects.client_id)` does not match an existing `clients(workspace_id, id)` row.
2. **Service Layer (`ProjectService`)**: Queries `clientRepo.getById(clientId, workspaceId)` and verifies `client.workspaceId === workspaceId` before mutation.
3. **Repository Layer (`ProjectRepository`)**: Appends `eq(projectsTable.workspaceId, workspaceId)` to EVERY SQL query.

---

## 9. Authentication Architecture

Current authentication implementation in MVP (Sprint 1-3):

```text
HTTP Request
     │
     ▼
Express Mock Auth Middleware (apps/api/src/index.ts)
     │
     ▼
req.user = { id: "550e8400-e29b-41d4-a716-446655440000" }  // Fixed UUID for local dev
     │
     ▼
Controller extracts userId via getUserId(req)
     │
     ▼
Passed into Service as actorId
```

### Dev Auto-Seeding (`apps/api/src/index.ts`)
On backend startup, `ensureDefaultWorkspace()` checks if `550e8400-e29b-41d4-a716-446655440000` exists in `workspacesTable` and `workspaceMembersTable` with `role = 'owner'`. If missing, it auto-creates the record to ensure seamless local developer workflow.

---

## 10. Authorization & RBAC Policies

Authorization uses Workspace Roles (`owner`, `editor`, `viewer`):

```text
Actor ID + Workspace ID
          │
          ▼
memberRepo.getByWorkspaceAndUser(workspaceId, actorId)
          │
          ▼
WorkspaceMember entity (role: 'owner' | 'editor' | 'viewer')
          │
          ▼
Policy Check (canCreateProject / canUpdateProject / canDeleteProject)
          │
     ┌────┴────┐
     ▼         ▼
  Allowed   Denied ➔ Returns ProjectPermissionDeniedError (HTTP 403)
```

### Permission Matrix

| Action | Viewer | Editor | Owner | Policy Function |
|---|:---:|:---:|:---:|---|
| `listProjects` / `getProject` | ✅ | ✅ | ✅ | `canViewProject` |
| `createProject` | ❌ | ✅ | ✅ | `canCreateProject` |
| `updateProject` | ❌ | ✅ | ✅ | `canUpdateProject` |
| `changeProjectStatus` | ❌ | ✅ | ✅ | `canChangeProjectStatus` |
| `deleteProject` (Archive) | ❌ | ❌ | ✅ | `canDeleteProject` |
| `restoreProject` | ❌ | ❌ | ✅ | `canRestoreProject` |

---

## 11. Result<T> Error Model

Domain services **never throw unhandled exceptions** for business failures. They return a typed `Result<T>` union:

```typescript
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ProjectDomainError };
```

### Controller Translation Mapping

```text
Domain Error Class                    -> HTTP Status Code  -> API Error Code
-------------------------------------------------------------------------------------
ProjectValidationError                -> 400 Bad Request   -> VALIDATION_ERROR
ProjectClientWorkspaceMismatchError  -> 400 Bad Request   -> CLIENT_WORKSPACE_MISMATCH
ProjectInvalidStatusTransitionError   -> 400 Bad Request   -> INVALID_TRANSITION
ProjectPermissionDeniedError         -> 403 Forbidden     -> FORBIDDEN
ProjectNotFoundError                  -> 404 Not Found     -> NOT_FOUND
ProjectSlugAlreadyExistsError         -> 409 Conflict      -> CONFLICT
ProjectDeletedError                   -> 410 Gone          -> GONE
ProjectInternalError                  -> 500 Internal Err  -> INTERNAL_ERROR
```

---

## 12. Validation Pipeline

Validation is applied progressively across 4 distinct boundaries:

```text
1. Frontend Form Validation (UX Level)
   React Hook Form + Zod (`projectFormSchema`) -> Blocks invalid submission in browser before network request.

2. API Route Body Parsing (Transport Level)
   Zod Schemas in API domain -> Returns 400 Bad Request if JSON structure or types fail.

3. Service Domain Rules (Business Level)
   `ProjectService` date checks (targetDate >= startDate), client workspace verification, slug collision checks.

4. Database Constraint Rules (Integrity Boundary)
   PostgreSQL Foreign Keys, Unique Indexes (`idx_projects_workspace_slug`), Not Null constraints.
```

---

## 13. Data Transformation Matrix

As data flows through the application, it changes shape across architectural boundaries:

```text
User Form Inputs (Strings)
   │  { name: "App V1", budgetAmount: "150000", clientId: "c1" }
   ▼
Frontend DTO (`CreateProjectInput`)
   │  { name: "App V1", budgetAmount: 150000, clientId: "c1" }
   ▼
HTTP POST Payload (JSON)
   │  JSON.stringify(cleanedInput)
   ▼
Express Request Body (`CreateProjectRequest`)
   │  Parsed JSON
   ▼
Service Input DTO (`CreateProjectServiceInput`)
   │  Includes default currency "INR", generated slug "app-v1"
   ▼
Repository Input DTO (`CreateProjectRepositoryInput`)
   │  Includes createdBy/updatedBy actorId, stringified budget "150000.00"
   ▼
PostgreSQL Row (`Project`)
   │  DB Entity (snake_case columns: workspace_id, client_id, budget_amount)
   ▼
Domain Entity (`Project & { clientName?: string }`)
   │  Joined Drizzle object
   ▼
Mapped HTTP Response DTO (`ProjectResponse`)
   │  mapProjectToResponse() -> camelCase JSON envelope
   ▼
React State / Rendered UI Model
```

---

## 14. TanStack Query Mental Model

Client state management relies on **TanStack Query (v5)** for server state caching and invalidation:

### Query Keys Factory (`apps/web/src/features/project/api/project.keys.ts`)
```typescript
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...projectKeys.lists(), workspaceId, filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (workspaceId: string, projectId: string) =>
    [...projectKeys.details(), workspaceId, projectId] as const,
} as const;
```

### Mutation Invalidation Strategy
When `useCreateProject`, `useUpdateProject`, `useDeleteProject`, or `useRestoreProject` succeeds:
1. `queryClient.invalidateQueries({ queryKey: projectKeys.lists() })` triggers a background refetch for active project lists.
2. `queryClient.setQueryData(projectKeys.detail(workspaceId, id), project)` instantly updates the individual project detail cache.

---

## 15. Full Create Project Trace

Here is the exact step-by-step trace for creating a project:

```text
[Browser] User clicks "Create Project" in CreateProjectForm.tsx
  │
  ▼
[Validation] React Hook Form executes `projectFormSchema.parse(values)`
  │  File: apps/web/src/features/project/schemas/project.schema.ts
  │
  ▼
[Hook] `useCreateProject(workspaceId).mutate(cleanedInput)` called
  │  File: apps/web/src/features/project/hooks/useCreateProject.ts
  │
  ▼
[API Function] `createProject(workspaceId, data)` executes
  │  File: apps/web/src/features/project/api/project.api.ts
  │
  ▼
[HTTP Client] `apiPost<ProjectResponse>(`/workspaces/${workspaceId}/projects`, data)`
  │  File: apps/web/src/api/client.ts
  │
  ▼
[Network] POST http://localhost:5001/api/v1/workspaces/:workspaceId/projects
  │
  ▼
[Express Router] Router matches POST `/`
  │  File: apps/api/src/domains/project/project.routes.ts
  │
  ▼
[Auth Middleware] Attaches req.user = { id: "550e..." }
  │  File: apps/api/src/index.ts
  │
  ▼
[Controller] `createProject(req, res, next)` invoked
  │  File: apps/api/src/domains/project/project.controller.ts
  │
  ▼
[Service] `projectService.createProject(input, workspaceId, actorId)`
  │  File: apps/api/src/domains/project/project.service.ts
  │
  ├─► [Policy Check] `canCreateProject(membership)` -> verifies 'owner' or 'editor'
  │     File: apps/api/src/domains/project/project.policies.ts
  │
  ├─► [Client Check] `clientRepo.getById(clientId, workspaceId)` -> verifies client workspace scope
  │     File: apps/api/src/domains/client/repository/client.repository.ts
  │
  ├─► [Slug Check] `projectRepo.getBySlug(slug, workspaceId)` -> checks slug uniqueness
  │     File: apps/api/src/domains/project/repository/project.repository.ts
  │
  ▼
[Repository] `projectRepo.create(repositoryInput)`
  │  File: apps/api/src/domains/project/repository/project.repository.ts
  │
  ▼
[Database] Drizzle executes SQL `INSERT INTO projects (...) VALUES (...) RETURNING *`
  │  FK constraint `fk_projects_workspace_client` verified by Postgres
  │
  ▼
[Domain Event] `NullProjectEventEmitter.emit('project.created', ...)`
  │  File: apps/api/src/domains/project/project.events.ts
  │
  ▼
[Service Return] Returns `ok(project)`
  │
  ▼
[Controller Mapper] `mapProjectToResponse(result.data)` -> JSON response `res.status(201).json(createSuccess(mapped))`
  │  File: apps/api/src/domains/project/project.mapper.ts
  │
  ▼
[HTTP Response] `{ success: true, data: { id: "p1", name: "App V1", ... } }`
  │
  ▼
[Axios Client] Interceptor resolves `response.data.data`
  │  File: apps/web/src/api/client.ts
  │
  ▼
[TanStack Query] `useCreateProject.onSuccess` fires -> invalidates `projectKeys.lists()`, shows toast
  │  File: apps/web/src/features/project/hooks/useCreateProject.ts
  │
  ▼
[React UI] `ProjectPage` automatically re-renders with new ProjectCard in grid.
```

---

## 16. Full Update Project Trace

1. User clicks **"Edit Project"** in `ProjectCard.tsx` or `ProjectDetail.tsx`.
2. `EditProjectDialog.tsx` opens with `project` pre-populated into `CreateProjectForm.tsx`.
3. User modifies title/dates and clicks **"Update Project"**.
4. Form calls `updateMutation.mutate()` -> `useUpdateProject(workspaceId, projectId)`.
5. API function `updateProject(workspaceId, projectId, data)` sends PATCH HTTP request.
6. Express controller `updateProject` receives request -> calls `projectService.updateProject()`.
7. `ProjectService` checks `canUpdateProject(membership)`, verifies project is not deleted (`deletedAt IS NULL`), re-evaluates date rules and slug updates.
8. `ProjectRepository.update()` executes Drizzle `UPDATE projects SET ... WHERE id = :id AND workspace_id = :workspaceId AND deleted_at IS NULL`.
9. Controller maps result -> returns `200 OK`.
10. TanStack Query `useUpdateProject` invalidates project lists and updates detail cache -> toast success displayed.

---

## 17. Full Status Change Trace

1. User clicks status badge in `ProjectStatusControl.tsx` (e.g., transition `draft` ➔ `active` or `active` ➔ `completed`).
2. Dropdown handler calls `updateStatus(newStatus)`.
3. Hook `useUpdateProjectStatus` calls API function `updateProjectStatus(workspaceId, projectId, status)`.
4. Endpoint `PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/status` routes to `changeProjectStatus` controller.
5. `ProjectService.changeProjectStatus()` checks `canChangeProjectStatus(membership)`.
6. **Lifecycle Logic**: If transitioning to `completed`, sets `completedAt = new Date()`. If moving back from `completed` to `active` or `draft`, clears `completedAt = null`.
7. `ProjectRepository.update()` persists status change. Emits `project.status_changed` domain event.
8. Frontend query cache updates -> status badge turns green (`active`) or blue (`completed`).

---

## 18. Full Archive & Restore Trace

### Archive Flow:
1. User clicks **"Archive"** button on `ProjectCard` or `ProjectDetail`.
2. UI displays non-blocking inline prompt (`"Archive? [Yes] [No]"`). User clicks **"Yes"**.
3. Hook `useDeleteProject` calls DELETE HTTP endpoint `/api/v1/workspaces/:workspaceId/projects/:projectId`.
4. `projectService.deleteProject()` checks `canDeleteProject(membership)` (Owner role required).
5. `ProjectRepository.softDelete()` updates `deleted_at = NOW()`, `status = 'archived'`.
6. Query cache invalidates -> Card removed from active view list.

### Restore Flow:
1. User filters list to **"Archived"** or views archived project card.
2. User clicks **"Restore"**.
3. Hook `useRestoreProject` calls POST HTTP endpoint `/api/v1/workspaces/:workspaceId/projects/:projectId/restore`.
4. `projectService.restoreProject()` checks `canRestoreProject(membership)` (Owner role required).
5. `ProjectRepository.restore()` clears `deleted_at = NULL`, resets `status = 'active'`.
6. Query cache invalidates -> Project restored to active list.

---

## 19. Domain Events Architecture

Backend events decouple domain state mutations from external side effects:

```typescript
// Event Definition (apps/api/src/domains/project/project.events.ts)
export type ProjectEvent =
  | { type: "project.created"; projectId: string; workspaceId: string; actorId: string; project: Project }
  | { type: "project.updated"; projectId: string; workspaceId: string; actorId: string; project: Project; changes: Record<string, unknown> }
  | { type: "project.status_changed"; projectId: string; workspaceId: string; actorId: string; fromStatus: string; toStatus: string; project: Project }
  | { type: "project.deleted"; projectId: string; workspaceId: string; actorId: string; project: Project }
  | { type: "project.restored"; projectId: string; workspaceId: string; actorId: string; project: Project };
```

Currently, `NullProjectEventEmitter` logs events to console in dev mode. In future sprints, real consumers (Audit Logging, Activity Feed, Webhooks) will subscribe without modifying core domain services.

---

## 20. What Happens When Something Fails? (Failure Map)

```text
[Failure Mode 1: Invalid Form Input]
  User enters invalid date range (targetDate < startDate)
  ├── Caught by: React Hook Form + Zod (`projectFormSchema`)
  ├── Action: Form submission blocked before network request.
  └── UI Display: Red error message below date field.

[Failure Mode 2: Client/Workspace Mismatch]
  Request attempts to attach client from Workspace B to project in Workspace A
  ├── Caught by: `ProjectService` + PostgreSQL Composite FK (`fk_projects_workspace_client`)
  ├── Action: Controller catches `CLIENT_WORKSPACE_MISMATCH` domain error.
  └── UI Display: Returns HTTP 400 Bad Request; Toast displays "Client does not belong to this workspace".

[Failure Mode 3: Unauthorized Action]
  Viewer role attempts to archive a project
  ├── Caught by: `canDeleteProject(membership)` policy check
  ├── Action: Service returns `ProjectPermissionDeniedError`.
  └── UI Display: Returns HTTP 403 Forbidden; Toast displays "Only workspace owners can archive projects".

[Failure Mode 4: Record Not Found]
  User requests non-existent project UUID
  ├── Caught by: `ProjectRepository.getById()` -> returns `null`
  ├── Action: Service returns `ProjectNotFoundError`.
  └── UI Display: Returns HTTP 404 Not Found; UI renders error boundary container.
```

---

## 21. What Happens When a User Crosses Tenant Boundaries?

If an attacker attempts to exploit cross-tenant data access by modifying the URL parameters:

```text
Attacker sends: GET /api/v1/workspaces/Workspace-B/projects/Project-A
```

```text
1. API receives request for Workspace-B & Project-A.
2. `projectService.getProject(Project-A, Workspace-B, actorId)` invoked.
3. `memberRepo.getByWorkspaceAndUser(Workspace-B, actorId)` checks attacker's membership in Workspace-B.
   ├── If attacker is NOT a member of Workspace-B -> Policy returns `allowed: false` -> HTTP 403 FORBIDDEN.
4. If attacker IS a member of Workspace-B, `projectRepo.getById(Project-A, Workspace-B)` executes:
   `SELECT * FROM projects WHERE id = 'Project-A' AND workspace_id = 'Workspace-B'`
5. Because Project-A belongs to Workspace-A, SQL query returns 0 rows.
6. Service returns `ProjectNotFoundError` -> HTTP 404 NOT FOUND.
```

Data leak is **100% prevented** even if attacker knows the target UUID.

---

## 22. Request/Response Payload Contract Reference

### 1. Create Project (`POST /api/v1/workspaces/:workspaceId/projects`)

#### Request Payload:
```json
{
  "name": "E-Commerce Mobile App",
  "clientId": "660e8400-e29b-41d4-a716-446655440000",
  "description": "Cross-platform Flutter mobile application",
  "pricingModel": "fixed",
  "budgetCurrency": "INR",
  "budgetAmount": 150000,
  "startDate": "2026-09-01",
  "targetDate": "2026-10-31"
}
```

#### Success Response (HTTP 201 Created):
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "660e8400-e29b-41d4-a716-446655440000",
    "clientName": "Acme Corp Pvt Ltd",
    "name": "E-Commerce Mobile App",
    "slug": "e-commerce-mobile-app",
    "description": "Cross-platform Flutter mobile application",
    "status": "draft",
    "pricingModel": "fixed",
    "budgetCurrency": "INR",
    "budgetAmount": "150000.00",
    "startDate": "2026-09-01",
    "targetDate": "2026-10-31",
    "completedAt": null,
    "createdAt": "2026-08-09T14:30:00.000Z",
    "updatedAt": "2026-08-09T14:30:00.000Z"
  }
}
```

---

## 23. File-to-File Matrix

| Developer Concern | Primary Files Involved |
|---|---|
| Database Schema & FKs | `packages/database/src/schema/projects.ts` |
| Backend Routes & Middleware | `apps/api/src/domains/project/project.routes.ts` |
| Express Controller & Error Mapping | `apps/api/src/domains/project/project.controller.ts` |
| Business Logic & Rules | `apps/api/src/domains/project/project.service.ts` |
| RBAC Role Authorization | `apps/api/src/domains/project/project.policies.ts` |
| SQL Persistence Queries | `apps/api/src/domains/project/repository/project.repository.ts` |
| Frontend Route Entrypoint | `apps/web/app/workspaces/[workspaceId]/projects/page.tsx` |
| Main Page Layout & Filters | `apps/web/src/features/project/components/ProjectPage.tsx` |
| Card Grid Rendering | `apps/web/src/features/project/components/ProjectList.tsx` & `ProjectCard.tsx` |
| Interactive Status Controls | `apps/web/src/features/project/components/ProjectStatusControl.tsx` |
| Forms & Client Validation | `apps/web/src/features/project/components/CreateProjectForm.tsx` & `schemas/project.schema.ts` |
| TanStack Query Cache & Hooks | `apps/web/src/features/project/hooks/` & `api/project.keys.ts` |

---

## 24. Where Do I Go When Something Breaks? (Debugging Decision Trees)

### Decision Tree 1: UI Does Not Update After Mutation
```text
Does backend API return 200/201 OK with updated data?
  ├── NO ➔ Inspect Backend Logs (`apps/api/src/domains/project/project.controller.ts`).
  └── YES
       │
       ▼
  Does TanStack Query hook execute onSuccess invalidation?
    ├── NO ➔ Inspect Mutation Hook (`apps/web/src/features/project/hooks/useUpdateProject.ts`).
    └── YES
         │
         ▼
    Are query keys matching between list hook and mutation invalidation?
      ├── NO ➔ Align keys in `apps/web/src/features/project/api/project.keys.ts`.
      └── YES ➔ Verify React Component prop drilling or state overrides.
```

### Decision Tree 2: Database Rejects Foreign Key / Insert
```text
Is PostgreSQL error code 23503 (Foreign Key Violation)?
  ├── YES ➔ Client ID does not exist in target Workspace ID. Inspect composite key `fk_projects_workspace_client`.
  └── NO
       │
       ▼
Is PostgreSQL error code 23505 (Unique Constraint Violation)?
  └── YES ➔ Project slug collision in workspace (`idx_projects_workspace_slug`). Check slug generation in `ProjectRepository`.
```

---

## 25. Common Development & Debugging Commands

Run these standard repository commands from the workspace root:

```bash
# Run all applications in development mode (Web on :5000, API on :3000)
pnpm dev

# Execute TypeScript typechecking across all apps and packages
pnpm typecheck

# Run Biome linter and formatter checks
pnpm lint

# Execute unit and integration test suite via Vitest
pnpm test

# Build production artifacts for Web and API
pnpm build
```

---

## 26. Development Workflow & Feature Lifecycle

Every feature slice in Freelance-OS must follow this strict 6-stage lifecycle:

```text
1. Product & Domain Specification (docs/05-features/[feature]/feature.md)
2. UI/UX Design & Token Mapping (docs/05-features/[feature]/feature-design.md)
3. API Contract & Query Architecture (docs/05-features/[feature]/feature-api.md)
4. Database Schema & Migration (packages/database/src/schema/)
5. Backend Implementation (apps/api/src/domains/[feature]/)
6. Frontend Implementation & Quality Gates (apps/web/src/features/[feature]/)
```

---

## 27. How to Add a New Domain (Sprint 4 Invoice Blueprint)

When implementing the upcoming **Sprint 4 Invoice** vertical slice, follow this exact step-by-step blueprint:

```text
Step 1: Create Database Schema (`packages/database/src/schema/invoices.ts`)
        - Define `invoicesTable` with `workspace_id`, `client_id`, `project_id`.
        - Add Composite Foreign Key referencing `projects(workspace_id, id)`.

Step 2: Generate & Apply Migration
        - Run `pnpm --filter @repo/database db:generate`

Step 3: Build Backend Domain (`apps/api/src/domains/invoice/`)
        - Create `invoice.types.ts`, `invoice.errors.ts`, `invoice.policies.ts`
        - Create `InvoiceRepository` with `workspace_id` filtering on all queries
        - Create `InvoiceService` returning `Result<Invoice>`
        - Create `invoice.controller.ts` and `invoice.routes.ts`

Step 4: Build Frontend Feature (`apps/web/src/features/invoice/`)
        - Create `api/invoice.api.ts` & `api/invoice.keys.ts`
        - Create query hooks (`useInvoices`, `useCreateInvoice`)
        - Create components (`InvoicePage`, `InvoiceCard`, `CreateInvoiceForm`)
        - Create route page `apps/web/app/workspaces/[workspaceId]/invoices/page.tsx`
```

---

## 28. Architectural Invariants

These rules MUST NEVER be broken in Freelance-OS:

1. **Workspace Multi-Tenancy**: Every database table representing user data MUST include a `workspace_id` column.
2. **Mandatory Filtering**: Every SQL query in a repository MUST append `.where(eq(table.workspaceId, workspaceId))`.
3. **Thin Controllers**: Controllers MUST NOT execute SQL queries or contain domain business logic.
4. **Result\<T\> Wrapping**: Services MUST return `Result<T>` and MUST NOT throw HTTP error exceptions.
5. **No Actor Spoofing**: User identity (`actorId`) MUST be extracted strictly from authenticated context (`req.user.id`).
6. **Feature Isolation**: Frontend components MUST NOT call Axios directly; all requests must flow through feature API modules.

---

## 29. Things AI Coding Agents Must NOT Do

> [!CAUTION]
> AI Coding Agents modifying this repository MUST strictly follow these prohibitions:

- ❌ DO NOT place business logic or database queries inside Express controllers.
- ❌ DO NOT bypass workspace isolation by writing queries without `workspaceId` filters.
- ❌ DO NOT use TypeScript `any` or `@ts-ignore` to suppress compilation errors.
- ❌ DO NOT import raw database clients or Drizzle schema directly inside React components.
- ❌ DO NOT introduce new global state management libraries (e.g., Redux, Zustand); TanStack Query owns server state.
- ❌ DO NOT introduce hardcoded custom CSS colors (`#1a2b3c`); use established design tokens (`var(--color-...)`).

---

## 30. Architectural Tradeoffs

| Decision | Why It Exists | Benefit | Cost / Tradeoff | When To Change |
|---|---|---|---|---|
| **Mock Auth Middleware** | Allows rapid MVP development of domain vertical slices without waiting for auth provider integration. | Zero auth friction during initial feature development. | No password verification or token expiry in local dev. | Sprint 5 (Production Auth Integration). |
| **Null Event Emitter** | Decouples domain event emission from side effect handlers. | Zero external infrastructure requirements for MVP. | Events are currently logged to console rather than queued. | When real background job workers (e.g., Redis/BullMQ) are added. |
| **Soft Deletion (`deleted_at`)** | Retains audit history and allows instant recovery of deleted records. | Prevents accidental data destruction. | Every SELECT query must append `isNull(table.deletedAt)`. | Permanent architectural invariant. |

---

## 31. Current Technical Debt

### Non-blocking / Intentional MVP Debt
- **Mock Auth Context**: `req.user.id` is hardcoded to `"550e8400-e29b-41d4-a716-446655440000"` in local dev.
- **Null Event Emitter**: `NullProjectEventEmitter` logs events to console rather than emitting to a message broker.

---

## 32. Future Architecture

Documented roadmap for upcoming development sprints:

```text
Sprint 1: Workspace Slice ──► 🟢 COMPLETE & PRODUCTION-READY
Sprint 2: Client Slice    ──► 🟢 COMPLETE & PRODUCTION-READY
Sprint 3: Project Slice   ──► 🟢 COMPLETE & PRODUCTION-READY (RC-1, RC-2, RC-3 PASS)
Sprint 4: Invoice Slice   ──► 🟡 PLANNED (Auto-invoicing from Project metadata & milestones)
Sprint 5: Real Auth       ──► 🟡 PLANNED (Clerk / NextAuth production integration)
Sprint 6: AI Scope Agent  ──► 🟡 PLANNED (Automated scope extraction & creep detection)
```

---

## 33. Learning Guide: If You Only Remember 20 Things

1. **Workspace is the security boundary** — Everything belongs to a Workspace.
2. **Monorepo division is strict** — `apps/web` (UI), `apps/api` (Backend), `packages/database` (ORM).
3. **Database composite foreign keys prevent leaks** — `(workspace_id, client_id)` ensures cross-tenant isolation.
4. **Controllers stay thin** — They map HTTP requests to services and JSON responses.
5. **Services own domain logic** — Business rules and validation live here.
6. **Services return Result\<T\>** — Success or typed domain error; no unhandled HTTP exceptions.
7. **Policies govern authorization** — Checks `owner`, `editor`, or `viewer` roles.
8. **Repositories own SQL** — Pure Drizzle ORM persistence with mandatory `workspaceId` filters.
9. **Soft deletion is standard** — Records set `deleted_at = NOW()` instead of hard DELETE.
10. **Zod validates everywhere** — React Hook Form (UI), API body parsing (HTTP), Service dates (Domain).
11. **TanStack Query manages server state** — Centralized caching, automatic query key invalidation.
12. **Query keys are standardized** — Factory pattern in `feature.keys.ts`.
13. **Data changes shape across boundaries** — Form Values ➔ Request DTO ➔ Service Input ➔ DB Entity ➔ Response DTO.
14. **Events decouple side effects** — `project.created`, `project.updated`, `project.status_changed`.
15. **Mock auth auto-seeds dev data** — Default workspace auto-created on API boot.
16. **Shared components live in `@shared/components`** — Reusable primitives (`Button`, `Card`, `Dialog`, `FormField`).
17. **Icons come from `@phosphor-icons/react`** — Consistent visual language.
18. **Design tokens govern styling** — CSS variables (`var(--color-brand-yellow)`), no arbitrary hex codes.
19. **Features are sliced vertically** — `api/`, `components/`, `hooks/`, `schemas/`.
20. **Add new domains systematically** — Follow the 4-tier pattern (Database ➔ Backend ➔ API ➔ Frontend UI).

---

## 34. Build Your Mental Model (Complete Diagram)

```text
                               ┌───────────────────────────────────┐
                               │             USER                  │
                               └─────────────────┬─────────────────┘
                                                 │
                                                 ▼
                               ┌───────────────────────────────────┐
                               │      NEXT.JS 15 WEB APP           │
                               │  (apps/web/app/workspaces/...)    │
                               └─────────────────┬─────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
             React Component / Form                             TanStack Query Hook
          (CreateProjectForm.tsx)                              (useCreateProject.ts)
                        │                                                 │
                        └────────────────────────┬────────────────────────┘
                                                 │
                                                 ▼
                                     Feature API Function
                                   (api/project.api.ts)
                                                 │
                                                 ▼
                                       Typed Axios Client
                                      (src/api/client.ts)
                                                 │
                                                 ▼  HTTP POST (REST JSON)
                                                 │
                               ┌─────────────────┴─────────────────┐
                               │       EXPRESS API SERVER          │
                               │           (apps/api)              │
                               └─────────────────┬─────────────────┘
                                                 │
                                                 ▼
                                        Express Router
                                      (project.routes.ts)
                                                 │
                                                 ▼
                                      Mock Auth Middleware
                                   (req.user = { id: '...' })
                                                 │
                                                 ▼
                                       Project Controller
                                     (project.controller.ts)
                                                 │
                                                 ▼
                                         Project Service
                                      (project.service.ts)
                                                 │
                        ┌────────────────────────┼────────────────────────┐
                        ▼                        ▼                        ▼
                 Project Policy          Client Repository         Project Repository
              (project.policies.ts)    (client.repository.ts)    (project.repository.ts)
                        │                        │                        │
                        └────────────────────────┼────────────────────────┘
                                                 │
                                                 ▼
                                        Drizzle ORM Engine
                                          (db.insert)
                                                 │
                                                 ▼  SQL INSERT
                                                 │
                               ┌─────────────────┴─────────────────┐
                               │        POSTGRESQL DATABASE        │
                               │        (packages/database)        │
                               └───────────────────────────────────┘
```

---
*End of System Walkthrough & Engineering Mental Model Guide.*
