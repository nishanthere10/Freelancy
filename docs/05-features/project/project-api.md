# Project API & Engineering Specification

**Version:** 1.0  
**Last Updated:** August 8, 2026  
**Status:** Architectural Specification (Pre-Implementation)  
**Owner:** Backend Engineering & Architecture  
**Sprint:** Sprint 3  

---

## Document Purpose

This document is **Part 3 of 3** in the Project Domain Specification for Freelance-OS. It defines the REST API contracts, backend domain layer architecture, security policies, database query integrity rules, and TanStack Query state architecture for the Project vertical slice.

| Document | Contents |
|----------|----------|
| `project.md` | Product & Domain Specification: features, relationships, data model, business rules, acceptance criteria |
| `project-design.md` | Authoritative UI/UX Specification: information architecture, component inventory, wireframes, design token mapping |
| `project-api.md` (this file) | Authoritative HTTP & API Specification: REST endpoints, Zod schemas, error models, TanStack Query architecture |

---

## 1. Base Path & Routing

All Project endpoints are nested under the Workspace context because projects are strictly workspace-scoped.

**Base Path:** `/api/v1/workspaces/:workspaceId/projects`

### Endpoint Summary

| Method | Endpoint Path | Description | Required Role |
|---|---|---|---|
| `GET` | `/` | List projects in workspace (supports filters) | Viewer / Editor / Owner |
| `POST` | `/` | Create a new project | Editor / Owner |
| `GET` | `/:projectId` | Get detailed project by ID | Viewer / Editor / Owner |
| `PATCH` | `/:projectId` | Update project metadata | Editor / Owner |
| `PATCH` | `/:projectId/status` | Change project status | Editor / Owner |
| `DELETE` | `/:projectId` | Soft-delete / Archive project | Owner |
| `POST` | `/:projectId/restore` | Restore archived project | Owner |

---

## 2. Request & Response Contracts

### Common Response Envelope
All HTTP responses follow the standard Freelance-OS JSON response envelope:

```typescript
// Success Response
{
  "success": true,
  "data": T
}

// Error Response
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project with ID 'p123' was not found in this workspace.",
    "details": null
  }
}
```

---

### Endpoints Detail

#### 1. List Projects (`GET /api/v1/workspaces/:workspaceId/projects`)

**Query Parameters:**
- `status`: Optional. Filter by status (`draft`, `active`, `completed`, `archived`, `all`). Default: `active`.
- `clientId`: Optional. Filter projects for a specific client UUID.
- `search`: Optional. Search text against project `name` or `description`.
- `excludeDeleted`: Optional boolean string (`true`/`false`). Default: `true`.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "clientId": "660e8400-e29b-41d4-a716-446655440000",
      "clientName": "Acme Corp Pvt Ltd",
      "name": "E-Commerce Mobile App",
      "slug": "e-commerce-mobile-app",
      "description": "Cross-platform Flutter application",
      "status": "active",
      "pricingModel": "fixed",
      "budgetCurrency": "INR",
      "budgetAmount": "150000.00",
      "startDate": "2026-09-01",
      "targetDate": "2026-10-31",
      "completedAt": null,
      "createdAt": "2026-08-08T10:00:00.000Z",
      "updatedAt": "2026-08-08T10:00:00.000Z"
    }
  ]
}
```

---

#### 2. Create Project (`POST /api/v1/workspaces/:workspaceId/projects`)

**Request Body:**
```json
{
  "name": "E-Commerce Mobile App",
  "clientId": "660e8400-e29b-41d4-a716-446655440000",
  "description": "Cross-platform Flutter application",
  "pricingModel": "fixed",
  "budgetCurrency": "INR",
  "budgetAmount": 150000,
  "startDate": "2026-09-01",
  "targetDate": "2026-10-31"
}
```

**Response (201 Created):** Returns created project object in `data`.

---

#### 3. Update Project (`PATCH /api/v1/workspaces/:workspaceId/projects/:projectId`)

**Request Body:** Partial project updates (all fields optional).

---

#### 4. Change Status (`PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/status`)

**Request Body:**
```json
{
  "status": "completed"
}
```

---

## 3. Zod Validation Schemas (`apps/api/src/domains/project/project.schema.ts`)

```typescript
import { z } from "zod";

export const projectPricingModelEnum = z.enum(["fixed", "hourly", "retainer"]);
export const projectStatusEnum = z.enum(["draft", "active", "completed", "archived"]);

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(255, "Project name must not exceed 255 characters"),
  clientId: z.string().uuid("Invalid client ID").nullable().optional(),
  description: z.string().trim().max(5000, "Description must not exceed 5000 characters").nullable().optional(),
  pricingModel: projectPricingModelEnum.default("fixed"),
  budgetCurrency: z.string().trim().length(3, "Currency code must be 3 letters").default("INR"),
  budgetAmount: z.number().min(0, "Budget amount must be positive").nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD").nullable().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be YYYY-MM-DD").nullable().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.targetDate) {
      return new Date(data.targetDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: "Target completion date cannot be before start date",
    path: ["targetDate"],
  }
);
```

---

## 4. Backend Architecture & Type Boundaries

The Project backend strictly replicates the established thin-controller, thick-service architecture:

```text
HTTP Request Body
     ↓
createProjectSchema.parse()
     ↓
CreateProjectRequest (HTTP DTO)
     ↓
Controller maps to CreateProjectServiceInput
     ↓
ProjectService (evaluates Policy, calls Repo)
     ↓
ProjectRepository maps to CreateProjectRepositoryInput
     ↓
Drizzle ORM INSERT into projectsTable
     ↓
ProjectModel (Database Entity)
     ↓
ProjectMapper.toDTO() ➔ HTTP Response JSON
```

---

## 5. Security & Isolation Matrix

| Threat Vector | Mitigation Strategy |
|---|---|
| **Cross-Tenant Project Access** | Every SQL query in `ProjectRepository` includes `eq(projectsTable.workspaceId, workspaceId)`. |
| **Cross-Tenant Client Linkage** | Composite foreign key `FOREIGN KEY (workspace_id, client_id) REFERENCES clients (workspace_id, id)` prevents linking to a client in another workspace. Service validates client workspace scope. |
| **Unauthorized Project Mutation** | Policy `canUpdateProject` checks user membership and verifies `editor` or `owner` role. |
| **Unauthorized Archive/Delete** | Policy `canDeleteProject` enforces `owner` role requirement. |
| **Actor Spoofing** | `actorId` is extracted strictly from `req.user.id` authenticated context; body claims are ignored. |

---

## 6. Frontend Query & State Architecture (`apps/web/src/features/project`)

### Query Key Factory (`project.keys.ts`)
```typescript
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...projectKeys.lists(), workspaceId, filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (workspaceId: string, projectId: string) =>
    [...projectKeys.details(), workspaceId, projectId] as const,
};
```

### Custom Hooks (`apps/web/src/features/project/hooks/`)
- `useProjects(workspaceId, filters)` — Queries project list with staleTime 5 mins.
- `useProject(workspaceId, projectId)` — Queries single project detail.
- `useCreateProject(workspaceId)` — Mutation for creation; invalidates `projectKeys.lists()`.
- `useUpdateProject(workspaceId)` — Mutation for updates; invalidates `projectKeys.lists()` and updates `projectKeys.detail()`.
- `useUpdateProjectStatus(workspaceId)` — Quick mutation for status changes.
- `useDeleteProject(workspaceId)` — Mutation for archiving project.
- `useRestoreProject(workspaceId)` — Mutation for restoring project.

---

## 7. Testing Strategy

1. **Repository Integration Tests** (`apps/api/src/domains/project/__tests__/project.repository.test.ts`):
   - Direct database CRUD testing, foreign key checks, and workspace isolation filtering.
2. **Service Unit Tests** (`apps/api/src/domains/project/__tests__/project.service.test.ts`):
   - Tests business logic, date rules, status transitions, and role-based policies.
3. **HTTP Integration Tests** (`apps/api/src/domains/project/__tests__/project.http.test.ts`):
   - Express router and controller testing with Zod payload validation.
4. **Frontend Component Tests** (`apps/web/src/features/project/components/__tests__/ProjectPage.test.tsx`):
   - Vitest component rendering, user interactions, and hook mocking.
5. **Playwright E2E Tests** (`apps/web/e2e/project.spec.ts`):
   - End-to-end browser test covering full flow: Create ➔ List ➔ View Detail ➔ Edit ➔ Change Status ➔ Archive ➔ Restore.
