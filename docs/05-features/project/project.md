# Project Management Feature Documentation

**Version:** 1.0  
**Last Updated:** August 8, 2026  
**Status:** Architectural Specification (Pre-Implementation)  
**Owner:** Product Architecture & Senior Engineering  
**Sprint:** Sprint 3  

---

## Document Purpose

This document is **Part 1 of 3** in the Project Domain Specification for Freelance-OS.

| Document | Contents |
|----------|----------|
| `project.md` (this file) | Product & Domain Specification: features, relationships, data model, business rules, user journeys, acceptance criteria |
| `project-design.md` | Authoritative UI/UX Specification: information architecture, component inventory, wireframes, design token mapping |
| `project-api.md` | Authoritative HTTP & API Specification: REST endpoints, Zod schemas, error models, TanStack Query architecture |

---

## Architectural Context

Project Management is the **third vertical slice** of Freelance OS, building directly upon the validated Sprint 1 (Workspace) and Sprint 2 (Client) slices.

```text
User
 └── Workspace (Sprint 1 — Validated & Production Ready)
      └── Client (Sprint 2 — Validated & Production Ready)
           └── Project (Sprint 3 — THIS SPECIFICATION)
                └── Invoice (Sprint 4 — Planned)
```

Project acts as the central operational hub in Freelance OS. All work deliverables, timelines, pricing structures, scope analyses, and eventual invoices anchor to a Project.

---

## 1. Project Overview

### What Is a Project?
A **Project** represents a bounded piece of work undertaken by a freelancer for a specific client (or internal initiative) within a workspace. It has defined objectives, a lifecycle status, a budget or pricing structure, and a timeline.

### Why It Exists
Before the Project domain, a freelancer can manage Workspaces and Clients, but has no container for tracking work agreements. Without Projects:
- Deliverables and scope cannot be tracked.
- Invoices cannot be mapped to milestone agreements.
- Revenue cannot be forecasted against active vs completed engagements.
- AI cannot perform scope analysis or detect scope creep.

### Who Uses It
- **Solo Freelancers**: To track active client work, deadlines, and project budgets.
- **Boutique Agencies / Collaborators**: To assign work items and monitor project progress per client.

### Role in the Freelance-OS Workflow
Project bridges client relationships and financial transactions:
```text
Client Inquiry ➔ Client Record ➔ PROJECT Created ➔ Scope Analyzed ➔ Work Executed ➔ Invoice Generated ➔ Payment Received
```

---

## 2. Project Responsibilities

To prevent scope creep, Project responsibilities are strictly split between **MVP (Sprint 3)** and **Future Sprints**.

### MVP Scope (Sprint 3)
- **Project Identity**: Name, unique URL slug, description.
- **Client Association**: Linking a project to a specific Client within the workspace (or unassigned internal project).
- **Lifecycle Management**: Explicit status workflow (`draft`, `active`, `completed`, `archived`).
- **Timeline Tracking**: Start date and target completion date.
- **Financial Metadata**: Budget currency, budget amount, and pricing model (`fixed`, `hourly`, `retainer`).
- **Soft Delete & Recovery**: Archiving and restoring projects with audit timestamps (`deletedAt`).
- **Multi-Tenant Security**: 100% workspace-isolated queries and role-based permissions.

### Future Scope (Sprint 3.5 / Sprint 4+)
- **Milestones & Deliverables**: Sub-components of a project (Sprint 3.5).
- **AI Scope Analysis & Scope Drift Detection**: Automated scope extraction and alert system (Sprint 3.5).
- **Invoice Auto-Generation**: Creating PDF invoices directly from project milestones (Sprint 4).
- **Time Tracking & Logs**: Hour logging per project (Sprint 5).
- **Client Portal Integration**: External client viewing link (Sprint 6).

---

## 3. Project Ownership & Relationships

### Core Relationship Matrix

| Question | Decision | Rationale |
|---|---|---|
| **Does Project belong to Workspace?** | **YES (Mandatory)** | Workspace is the primary multi-tenant security isolation boundary. Every project MUST store `workspace_id`. |
| **Does Project belong to Client?** | **YES (Optional `client_id`)** | Most projects belong to a Client. However, `client_id` is nullable to allow freelancers to create internal projects or draft proposals before a client record is finalized. |
| **Can a Project exist without a Client?** | **YES** | Nullable `client_id` allows internal projects (e.g., "Agency Website Redesign"). |
| **Can a Project change Client?** | **YES** | An editor/owner can re-assign a project to a different client within the same workspace. |
| **Can a Project move between Workspaces?** | **NO** | Cross-workspace movement violates multi-tenant security boundaries. Workspaces are strictly isolated. |
| **Can a Client have multiple Projects?** | **YES (1 : N)** | A single Client can have many past, active, and draft projects. |
| **Can a Project belong to multiple Clients?** | **NO (1 : 1)** | A project is executed for exactly one client (or unassigned/internal). |

---

## 4. Workspace / Client / Project Integrity Strategy

### The Architectural Challenge
If `projects` stores both `workspace_id` AND `client_id`:
```text
Project:
  workspace_id = Workspace A
  client_id    = Client B (which belongs to Workspace B)
```
Without strict constraints, a cross-tenant data corruption vulnerability exists where a project references a client from a different workspace.

### Evaluated Options

#### Option A: Project stores `client_id` ONLY (`workspace_id` derived via JOIN)
- *Pros*: Eliminates data duplication.
- *Cons*: Breaks the core Freelance-OS security principle where EVERY SQL query executes `WHERE workspace_id = :workspaceId`. Every project lookup would require a SQL `JOIN clients`. Disallows clientless internal projects.

#### Option B (RECOMMENDED): Project stores BOTH `workspace_id` AND `client_id` with Composite Foreign Key
- *Pros*:
  1. Direct `workspace_id` filtering on single-table queries for maximum performance and multi-tenant security.
  2. Allows clientless internal projects (`client_id IS NULL`).
  3. Database-level referential integrity guarantees that `(workspace_id, client_id)` MUST match an existing `clients(workspace_id, id)` row!

### Database Integrity Strategy
In PostgreSQL / Drizzle ORM, `clients` table maintains a composite candidate key on `(workspace_id, id)`.

The `projects` table enforces a **Composite Foreign Key**:
```sql
CONSTRAINT fk_projects_workspace_client
FOREIGN KEY (workspace_id, client_id)
REFERENCES clients (workspace_id, id)
ON DELETE SET NULL
```

If a developer or API request attempts to insert `workspace_id = Workspace A` with `client_id = Client B` (belonging to Workspace B), **PostgreSQL rejects the INSERT with a foreign key violation**.

Additionally, the backend service layer (`ProjectService`) validates `client.workspaceId === workspaceId` before executing mutations.

---

## 5. Project Lifecycle

Projects transition through four explicit states governed by `projectStatusEnum`:

```text
 ┌────────┐      Activate      ┌────────┐      Complete      ┌───────────┐
 │ DRAFT  │ ─────────────────> │ ACTIVE │ ─────────────────> │ COMPLETED │
 └───┬────┘                    └───┬────┘                    └─────┬─────┘
     │                             │                               │
     │ Archive                     │ Archive                       │ Archive
     v                             v                               v
 ┌───────────────────────────────────────────────────────────────────────┐
 │                               ARCHIVED                                │
 └───────────────────────────────────────────────────────────────────────┘
```

### Lifecycle Status Definitions

| Status | Meaning | Allowed Transitions | Can Edit? | Can Invoice? |
|---|---|---|---|---|
| `draft` | Proposal or unconfirmed lead. Work has not started. | `active`, `archived` | Yes | No |
| `active` | Confirmed project in progress. | `completed`, `draft`, `archived` | Yes | Yes |
| `completed` | All work delivered and signed off. | `active`, `archived` | Yes (Metadata) | Yes |
| `archived` | Cancelled, old, or soft-deleted project. | `active`, `draft` (Restore) | Read-only | No |

### State Transition Rules
1. **Draft ➔ Active**: Requires project name and start date.
2. **Active ➔ Completed**: Sets `completed_at = NOW()`.
3. **Completed ➔ Active**: Clears `completed_at = NULL`.
4. **Any State ➔ Archived**: Soft-deletes project (`deleted_at = NOW()`, `status = 'archived'`).
5. **Archived ➔ Active / Draft (Restore)**: Clears `deleted_at = NULL`, sets status to `active` or `draft`.

---

## 6. Project Data Model

### Table: `projects` (`packages/database/src/schema/projects.ts`)

| Field Name | DB Column | Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `workspaceId` | `workspace_id` | `uuid` | No | - | Foreign Key -> `workspaces.id` (CASCADE) |
| `clientId` | `client_id` | `uuid` | Yes | `null` | Foreign Key -> `clients.id` (SET NULL) |
| `name` | `name` | `varchar(255)` | No | - | Project title |
| `slug` | `slug` | `varchar(255)` | No | - | URL-safe slug (unique per workspace) |
| `description` | `description` | `text` | Yes | `null` | Project scope overview |
| `status` | `status` | `project_status` | No | `'draft'` | Enum: `draft`, `active`, `completed`, `archived` |
| `pricingModel` | `pricing_model` | `pricing_model` | No | `'fixed'` | Enum: `fixed`, `hourly`, `retainer` |
| `budgetCurrency` | `budget_currency` | `varchar(3)` | No | `'INR'` | ISO currency code (e.g. INR, USD) |
| `budgetAmount` | `budget_amount` | `numeric(12,2)` | Yes | `null` | Target budget / total value |
| `startDate` | `start_date` | `date` | Yes | `null` | Planned start date |
| `targetDate` | `target_date` | `date` | Yes | `null` | Target completion deadline |
| `completedAt` | `completed_at` | `timestamp` | Yes | `null` | Timestamp when marked completed |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | Audit record creation |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | Audit record update |
| `createdBy` | `created_by` | `uuid` | No | - | User ID who created project |
| `updatedBy` | `updated_by` | `uuid` | No | - | User ID who last updated project |
| `deletedAt` | `deleted_at` | `timestamp` | Yes | `null` | Soft delete timestamp |

---

## 7. Business Rules

1. **Name Requirement**: Project name must be 1 to 255 characters.
2. **Slug Uniqueness**: Project `slug` must be unique per workspace (partial unique index `(workspace_id, slug) WHERE deleted_at IS NULL`).
3. **Date Validation**: If both `startDate` and `targetDate` are provided, `targetDate` MUST be greater than or equal to `startDate`.
4. **Budget Validation**: `budgetAmount` must be a non-negative number (`>= 0`).
5. **Client Scoping**: If `clientId` is provided, the Client MUST exist within the same `workspaceId` and MUST NOT be hard-deleted.
6. **Archived Client Rule**: Linking to an archived client is permitted, but triggers a UI warning badge ("Client Archived").
7. **Client Soft-Delete Rule**: If a Client is archived/soft-deleted, existing projects remain intact; `client_id` remains unchanged.
8. **Client Hard-Delete Rule**: If a Client is hard-deleted, `projects.client_id` is set to `NULL` via `ON DELETE SET NULL` (preventing project loss).
9. **Workspace Soft-Delete Rule**: If a Workspace is deleted, all projects cascade delete (`ON DELETE CASCADE`).

---

## 8. Permissions (RBAC)

Project authorization reuses the validated Workspace membership roles (`owner`, `editor`, `viewer`):

| Action | Viewer | Editor | Owner |
|---|:---:|:---:|:---:|
| `canViewProjects` / `canGetProject` | ✅ | ✅ | ✅ |
| `canCreateProject` | ❌ | ✅ | ✅ |
| `canUpdateProject` | ❌ | ✅ | ✅ |
| `canChangeProjectStatus` | ❌ | ✅ | ✅ |
| `canDeleteProject` (Archive) | ❌ | ❌ | ✅ |
| `canRestoreProject` | ❌ | ❌ | ✅ |

---

## 9. User Journeys

### Journey 1: Create Project
```text
User ➔ UI "+ New Project" Button ➔ Fill Form (Name, Client, Budget, Dates) ➔ Submit
 ➔ POST /api/v1/workspaces/:workspaceId/projects
 ➔ Zod Validation ➔ Service Policy Check (editor/owner)
 ➔ Verify Client Workspace Scope ➔ Insert DB Record ➔ Return 201 Created
 ➔ Cache Invalidated ➔ UI Updates with New Project Card
```

### Journey 2: Change Project Status (Draft ➔ Active)
```text
User ➔ Project Detail ➔ Click "Mark as Active"
 ➔ PATCH /api/v1/workspaces/:workspaceId/projects/:projectId/status { status: "active" }
 ➔ Service checks transition validity ➔ DB Update ➔ Return 200 OK
 ➔ Cache Invalidated ➔ Status Badge turns Green ("Active")
```

---

## 10. MVP Scope Matrix

| Capability | MVP (Sprint 3) | Future (Sprint 3.5+) | Rationale |
|---|:---:|:---:|---|
| CRUD Operations | ✅ | | Core foundation required for all work. |
| Client Linking | ✅ | | Essential to connect clients to projects. |
| Status Workflow | ✅ | | Tracks project progress (`draft`, `active`, `completed`, `archived`). |
| Budget & Timeline Metadata | ✅ | | Basic financial and deadline tracking. |
| Milestones / Sub-tasks | | ✅ | Deferred to Sprint 3.5 to keep Sprint 3 focused. |
| AI Scope Extraction | | ✅ | Requires completed project foundation. |
| Invoice Generation | | ✅ | Belongs to Sprint 4 Invoicing slice. |
| Time Tracker | | ✅ | Planned for Sprint 5. |

---

## 11. Acceptance Criteria (Gherkin)

```gherkin
Feature: Project Management

  Scenario: Successfully create a project linked to a client
    Given I am an "editor" in workspace "w1"
    And a client "c1" exists in workspace "w1"
    When I submit a POST request to "/api/v1/workspaces/w1/projects" with:
      | name         | Mobile App V1 |
      | clientId     | c1            |
      | pricingModel | fixed         |
      | budgetAmount | 150000        |
    Then the response status should be 201
    And the project status should be "draft"
    And the project should be linked to client "c1"

  Scenario: Prevent linking project to client from another workspace
    Given I am an "editor" in workspace "w1"
    And a client "c2" exists in workspace "w2"
    When I submit a POST request to "/api/v1/workspaces/w1/projects" with:
      | name     | Rogue Project |
      | clientId | c2            |
    Then the response status should be 400 or 403
    And the error code should be "CLIENT_WORKSPACE_MISMATCH"
```

---

## 12. Architectural Decision Report

### 1. Validated Patterns Reused
- Multi-tenant architecture (`workspace_id` isolation).
- Thin-controller, thick-service pattern returning `Result<T>`.
- Workspace role-based authorization policies (`canCreateProject`, etc.).
- Soft deletion with `deleted_at` audit timestamps.
- Feature-sliced frontend design (`api/`, `hooks/`, `schemas/`, `components/`).

### 2. Workspace & Client Relationship Decisions
- **`workspaceId`**: Stored explicitly on `projectsTable` for fast single-table tenant isolation queries.
- **`clientId`**: Stored on `projectsTable` as a nullable Foreign Key.
- **Integrity Guarantee**: Enforced via PostgreSQL composite foreign key `FOREIGN KEY (workspace_id, client_id) REFERENCES clients (workspace_id, id) ON DELETE SET NULL`.

### 3. Open Decisions for Human Review
1. Should `pricingModel` defaults be `'fixed'` or `'hourly'`? (Current recommendation: `'fixed'`).
2. Should `budgetCurrency` default to `'INR'` or be derived from Workspace settings? (Current recommendation: default `'INR'`).

### 4. Risk Analysis
- **Risk**: User creates a project without a client, then later attempts to generate an invoice in Sprint 4.
- **Mitigation**: Sprint 4 Invoicing slice will require selecting or creating a Client if the project lacks one.
