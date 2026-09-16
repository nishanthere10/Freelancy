# Sprint 17: Project Hub & Deliverables Execution Engine

**Version:** 1.0  
**Status:** COMPLETED & VERIFIED ✅  
**Date:** September 13, 2026  

---

## Executive Summary

Sprint 17 bridges the gap between AI Scope Confirmation and real-world project execution. It turns the converted AI scope into a living, operational **Project Hub**:

1. **Normalized Relational Deliverables**: AI-generated deliverables are materialized into `project_deliverables` with composite foreign keys `(workspace_id, project_id)`, position ordering, and status lifecycle tracking (`pending` → `in_progress` → `completed`).
2. **Deterministic Progress Engine**: Live completion percentage and hour balances (estimated vs. logged vs. remaining) calculated deterministically on both server and client.
3. **Itemized Progress Invoicing**: Completed deliverables can be billed directly into draft invoices with server-authoritative exact-penny math and an atomic concurrency lock preventing duplicate billing.
4. **In-Context Scope Intelligence**: Direct "Check Scope Drift" launch button inside the project workspace that automatically injects the linked confirmed scope baseline into the drift analysis modal.
5. **Atomic CAS Scope Claim & Compensating Rollbacks**: Distributed saga pattern ensuring zero orphaned projects, invoices, or deliverables under stateless database connections.

---

## System Workflow & Architecture

```mermaid
flowchart TD
    A[Confirmed AI Scope] -->|POST /ai/scope/:id/convert| B[Atomic CAS Scope Claim]
    B -->|Case A: Success| C[Materialize project_deliverables]
    B -->|Case A: Collision| D[HTTP 409: ALREADY_CONVERTED]
    C --> E{Deposit Invoice Requested?}
    E -->|Yes| F[Create Initial Deposit Invoice]
    E -->|No| G[Project Hub Active]
    F -->|Case B: Invoice Failure| H[Compensating Rollback: Delete Delivs + Project, Unlink Scope]
    F -->|Success| G

    subgraph "Project Hub Workspace"
        G --> I[Execution Checklist: Status Toggle, Quick Hours Logger]
        G --> J[Deterministic Progress Bar]
        G --> K[Financial Tracking: Budget vs Invoiced vs Paid]
        G --> L[Itemized Progress Invoicing Modal]
        G --> M[In-Context Scope Drift Analysis]
    end

    L -->|POST .../deliverables/progress-invoice| N[Atomic Claim Lock: billed_at = NOW()]
    N -->|Case C: Success| O[Itemized Invoice Created]
    N -->|Case C: Race Condition| P[Compensating Rollback: Delete Invoice, Unbill Items]
```

---

## Deliverables & Modules

### 1. Database Layer (`packages/database`)
- **`src/schema/enums.ts`**: Added `projectDeliverableStatusEnum` (`pending`, `in_progress`, `completed`).
- **`src/schema/project_deliverables.ts`**: Defined `projectDeliverablesTable` with composite foreign key `(workspace_id, project_id) REFERENCES projects(workspace_id, id)`, `source_scope_id`, `invoice_id`, `billed_at`, and `completed_at`.
- **`migrations/0008_add_project_deliverables.sql`**: Schema migration script with indexes on `(workspace_id, project_id)` and `invoice_id`.
- **`src/scripts/backfill-deliverables.ts`**: Idempotent CLI migration script for backfilling deliverables on legacy converted projects.

### 2. Core API Backend (`apps/api`)
- **`src/domains/project/project-deliverable.types.ts`**: DTOs, progress metrics, and service input interfaces.
- **`src/domains/project/project-deliverable.errors.ts`**: Domain error classes (`DELIVERABLE_NOT_FOUND`, `DELIVERABLE_VALIDATION_ERROR`, `PERMISSION_DENIED`).
- **`src/domains/project/project-deliverable.schema.ts`**: Zod validation schemas for deliverable CRUD, status transitions, hours logging, and progress billing.
- **`src/domains/project/repository/project-deliverable.repository.ts`**: Drizzle repository with `atomicClaimBilled`, `unbillByInvoiceId`, and tenant isolation.
- **`src/domains/project/project-deliverable.service.ts`**: Domain service with deterministic progress calculation, RBAC checks, itemized progress billing, and explicit backfill.
- **`src/domains/project/project-deliverable.controller.ts` & `project.routes.ts`**: REST endpoints mounted at `/api/v1/workspaces/:workspaceId/projects/:projectId/deliverables`.
- **`src/domains/ai/repository.ts` & `ai.service.ts`**: Concurrency-hardened `convertScopeToProject` with atomic CAS scope claim and Case A/B compensating rollbacks.

### 3. Frontend Web Studio (`apps/web`)
- **`src/features/project/api/deliverable.ts`**: Typed API client methods.
- **`src/features/project/hooks/useProjectDeliverables.ts`**: React Query hooks for deliverables, progress invoices, and backfill.
- **`src/features/project/components/ProjectProgressBar.tsx`**: Completion percentage, visual gradient progress track, and hours balance strip.
- **`src/features/project/components/ProjectDeliverablesCard.tsx`**: Milestone execution card with status toggles, quick hours logger, and add dialog.
- **`src/features/project/components/CreateProgressInvoiceModal.tsx`**: Multi-select milestone picker with live exact-penny calculation from project budget.
- **`src/features/project/components/ProjectFinancialsCard.tsx`**: Financial summary cards (Budget, Invoiced, Paid) and linked invoices table.
- **`src/features/project/components/ProjectDetail.tsx`**: Fully integrated Project Hub with "Check Scope Drift" button launching `DriftAnalysisModal`.

---

## Code Review Hardening & Bug Fixes

1. **`formatMoney` Export**: Exported `formatMoney` helper from `invoice.service.ts`, resolving runtime `TypeError` when calculating itemized deliverable pricing.
2. **`useInvoices` Mock Resilience**: Fixed `ProjectDetail.test.tsx` by setting mock return values in `beforeEach` and preserving `IntersectionObserver` across Vitest runner cycles.
3. **Flexible Text Matchers**: Updated DOM text matchers to handle composite element layouts in `ProjectProgressBar.tsx`.
4. **Type-Safe Query Invalidation**: Passed `workspaceId` to `invoiceKeys.all(workspaceId)` in `useProjectDeliverables.ts`, resolving compiler typecheck error.
5. **No-Explicit-Any Remediation**: Replaced `as any` casts with `as unknown as ReturnType<...>` in test suites and type-safe ternaries for deliverable complexity.
6. **ESLint Cleanliness**: Removed all unused icon imports and variables across all frontend components and hooks.

---

## Verification & Monorepo Test Gates

- **`apps/ai`**: Pytest suite passing (**42 / 42 tests**).
- **`apps/api`**: Vitest suite passing (**306 / 306 tests**, 34 suites).
- **`apps/web`**: Vitest suite passing (**38 / 38 tests**, 9 suites).
- **TypeScript**: `turbo run typecheck` passed with **0 errors** across all packages.
- **Linter**: `turbo run lint` (Biome + ESLint) passed with **0 errors and 0 warnings**.
- **Total Monorepo**: **386 / 386 tests passing (100%)**.
