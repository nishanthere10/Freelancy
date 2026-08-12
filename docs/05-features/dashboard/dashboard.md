# Sprint 6 — Business Dashboard Product & Technical Specification (`dashboard.md`)

**Version:** 1.0  
**Status:** Phase 6A APPROVED SPECIFICATION — Ready for Implementation  
**Date:** August 11, 2026  
**Target Domain:** `apps/api/src/domains/dashboard` & `apps/web/src/features/dashboard`

---

## 1. Product Purpose & Executive Summary

The Freelance OS **Business Dashboard** serves as the central command center for independent freelancers and contractors. It turns scattered domain data (clients, active projects, pending invoices, cleared payments) into an actionable, real-time operational dashboard.

### Core Questions Answered
1. **Financial Health**: How much revenue have I billed, collected, and what is currently outstanding?
2. **Active Operations**: How many client projects are currently in progress, on hold, or near completion?
3. **Action & Attention**: Which invoices are overdue? Which projects have target completion dates coming up soon?
4. **Client Distribution**: Who are my active clients and what is their current financial/project engagement?

### Key Product Principles
- **Operational Focus**: Strictly focused on actionable freelance business metrics (cash flow, project deadlines, invoice status).
- **Workspace Scoped**: Data is strictly isolated within the active workspace context (`workspace_id`).
- **No Decorative Slop**: Zero unverified metrics, fake AI forecasts, or complex drag-and-drop widgets.
- **Derived Real Data**: Every single metric is 100% derived from live database entities (`clients`, `projects`, `invoices`, `invoice_items`).

---

## 2. Current Domain Data Audit

This audit evaluates all database schemas in `packages/database/src/schema/` to map existing data fields directly to Dashboard metrics.

| Domain Table | Key Data Fields | Dashboard Metric / Feature Usage |
| :--- | :--- | :--- |
| **`workspaces`** | `id`, `name`, `slug`, `ownerId` | Workspace context identification & security scoping boundary. |
| **`clients`** | `id`, `workspaceId`, `name`, `email`, `companyName`, `status` (`active`, `inactive`, `archived`) | Total Clients count, Active Clients count, Client profile links. |
| **`projects`** | `id`, `workspaceId`, `clientId`, `name`, `status` (`planning`, `in_progress`, `on_hold`, `completed`, `cancelled`, `archived`), `pricingModel` (`fixed`, `hourly`, `retainer`), `budgetAmount`, `budgetCurrency`, `targetDate` | Active Projects count, Upcoming Project Deadlines, Project Status Distribution, Budget aggregation. |
| **`invoices`** | `id`, `workspaceId`, `clientId`, `projectId`, `invoiceNumber`, `status` (`draft`, `sent`, `paid`, `overdue`, `cancelled`), `totalAmount`, `amountPaid`, `amountDue`, `issueDate`, `dueDate` | Total Invoiced (Gross), Total Collected, Balance Outstanding, Overdue Invoices count & amount, Recent Invoices list. |
| **`invoice_items`** | `id`, `invoiceId`, `description`, `quantity`, `unitPrice`, `amount` | Detailed line item breakdowns (if itemized detail is expanded). |
| **`invoice_history`** | `id`, `invoiceId`, `fromStatus`, `toStatus`, `actorId`, `notes`, `createdAt` | Invoice status audit trail & recent invoice activity timestamps (`sentAt`, `paidAt`). |

---

## 3. Dashboard Information Architecture

The Dashboard presents information in a structured, top-to-bottom hierarchy optimized for desktop and mobile viewports:

```text
Dashboard Header
└── Workspace Greeting + Quick Actions ("Create Invoice", "Add Project")
     │
     ├── 1. KPI Summary Cards Row (Top Tier Metrics)
     │    ├── Gross Invoiced Amount
     │    ├── Total Revenue Collected
     │    ├── Outstanding Balance
     │    └── Active Projects Count
     │
     ├── 2. Action & Attention Banner (Conditional Urgent Alert)
     │    └── Overdue Invoices Alert (Count + Total Overdue Balance)
     │
     ├── 3. Operations & Deliverables Grid (2-Column Desktop Layout)
     │    ├── Left: Active Projects & Upcoming Deadlines List
     │    └── Right: Invoice Status & Outstanding Receivables Breakdown
     │
     └── 4. Recent Activity & Client Overview (2-Column Desktop Layout)
          ├── Left: Recent Invoices & Payment Logs
          └── Right: Active Client Quick Summary
```

---

## 4. MVP Dashboard Scope

### MUST HAVE (V1 Scope)
1. **Financial KPI Cards**: Total Invoiced, Total Collected, Balance Outstanding.
2. **Project KPI & Overview**: Active Projects count (`in_progress` + `planning`), Upcoming Deadlines list (sorted by `targetDate` ascending).
3. **Invoice Status Breakdown**: Counts & totals for `draft`, `sent`, `paid`, and `overdue` invoices.
4. **Attention Alert**: Overdue Invoices alert card with direct navigation links.
5. **Recent Invoices Table**: Top 5 most recently created/updated invoices with status badges.
6. **Workspace Isolation**: 100% database query scoping by `workspaceId`.

### SHOULD HAVE (V1.1 Scope)
- Project Budget vs Actual Billed aggregation.
- Quick Client engagement summary widget.

### FUTURE (Out of Scope for Sprint 6)
- ❌ Custom drag-and-drop widget layout engine.
- ❌ Export engine (CSV/PDF reporting).
- ❌ Multi-currency cross-conversion rate forecasting.
- ❌ WebSocket real-time pushes.

---

## 5. Metric Specifications & Aggregation Formulas

### Metric 1: Total Invoiced (Gross Billed Revenue)
- **Purpose**: Tracks cumulative value of all non-cancelled invoices issued in the workspace.
- **Source Table**: `invoices`
- **Filters**: `workspace_id = $workspaceId AND status != 'cancelled' AND deleted_at IS NULL`
- **Formula**: `SUM(total_amount)`
- **Null / Zero-State**: Returns `0.00` if no invoices exist.

### Metric 2: Total Collected (Cleared Payments)
- **Purpose**: Tracks actual cash received from clients.
- **Source Table**: `invoices`
- **Filters**: `workspace_id = $workspaceId AND deleted_at IS NULL`
- **Formula**: `SUM(amount_paid)`
- **Null / Zero-State**: Returns `0.00` if no payments recorded.

### Metric 3: Balance Outstanding (Receivables)
- **Purpose**: Tracks unpaid invoice balances awaiting collection.
- **Source Table**: `invoices`
- **Filters**: `workspace_id = $workspaceId AND status IN ('sent', 'overdue') AND deleted_at IS NULL`
- **Formula**: `SUM(amount_due)`
- **Null / Zero-State**: Returns `0.00` when all invoices are paid.

### Metric 4: Active Projects Count
- **Purpose**: Quantifies current workload in progress.
- **Source Table**: `projects`
- **Filters**: `workspace_id = $workspaceId AND status IN ('planning', 'in_progress') AND deleted_at IS NULL`
- **Formula**: `COUNT(id)`
- **Null / Zero-State**: Returns `0`.

### Metric 5: Upcoming Deadlines List
- **Purpose**: Displays the next 5 projects requiring completion.
- **Source Table**: `projects` LEFT JOIN `clients`
- **Filters**: `workspace_id = $workspaceId AND status IN ('planning', 'in_progress') AND target_date IS NOT NULL AND deleted_at IS NULL`
- **Ordering**: `target_date ASC`
- **Limit**: 5 records.

---

## 6. Financial & Currency Semantics

1. **Tax Inclusivity**: All `totalAmount`, `amountPaid`, and `amountDue` fields in Freelance OS include GST tax calculations (`Subtotal - Discount + GST = TotalAmount`). Financial metrics represent **gross tax-inclusive figures**.
2. **Currency Model**: Freelance OS defaults to `INR` (`₹`) or `USD` (`$`) per invoice/project.
3. **Multi-Currency Aggregation Safety**:
   - The Dashboard queries will aggregate totals per currency group or default to the primary workspace currency (`INR` default).
   - If a workspace contains mixed currency records (e.g. some `USD` and some `INR`), the API response will return currency-grouped totals:
     `totalInvoiced: { currency: 'INR', amount: 150000 }`.

---

## 7. Date & Timezone Semantics

- **Database Timestamp Storage**: All database timestamps (`created_at`, `issue_date`, `due_date`, `target_date`) are stored as `TIMESTAMP WITH TIME ZONE` in UTC.
- **Overdue Definition**: An invoice is classified as **Overdue** if:
  `status = 'sent' AND due_date < CURRENT_DATE` (evaluated relative to UTC server date).
- **Date Formatting in UI**: Displayed in browser local format (e.g. `MMM DD, YYYY`).

---

## 8. API Architecture Choice & Endpoint Contract

### Architecture Decision: **Option A — Single Aggregated Read-Model Endpoint**
Instead of forcing the client to fire 5 separate REST calls (`GET /clients`, `GET /projects`, `GET /invoices`, etc.), the API will expose a dedicated, optimized Read-Model endpoint:

```text
GET /api/v1/workspaces/:workspaceId/dashboard
```

#### Why Option A Was Chosen:
- **Performance**: Single HTTP roundtrip.
- **Atomic Transaction/Query**: Executes optimized database aggregate queries in parallel on PostgreSQL.
- **Cache Efficiency**: TanStack Query caches the entire dashboard payload under a single key (`['dashboard', workspaceId]`).

### API Endpoint Contract

`GET /api/v1/workspaces/:workspaceId/dashboard`

#### Headers:
`Authorization: Bearer <clerk_jwt>`

#### Success Response JSON (`200 OK`):

```json
{
  "success": true,
  "data": {
    "workspaceId": "763d73eb-4697-46c4-b484-713c8a642a96",
    "overview": {
      "totalInvoiced": { "amount": 250000.00, "currency": "INR" },
      "totalCollected": { "amount": 180000.00, "currency": "INR" },
      "totalOutstanding": { "amount": 70000.00, "currency": "INR" },
      "totalOverdue": { "amount": 25000.00, "currency": "INR" },
      "activeProjectsCount": 4,
      "totalClientsCount": 8
    },
    "invoiceSummary": {
      "draftCount": 2,
      "sentCount": 3,
      "paidCount": 12,
      "overdueCount": 1,
      "cancelledCount": 0
    },
    "overdueAlerts": [
      {
        "id": "inv_123",
        "invoiceNumber": "INV-2026-0004",
        "clientName": "Acme Corp",
        "amountDue": 25000.00,
        "dueDate": "2026-08-01"
      }
    ],
    "upcomingDeadlines": [
      {
        "id": "proj_456",
        "name": "E-Commerce Redesign",
        "clientName": "Stark Industries",
        "status": "in_progress",
        "targetDate": "2026-08-20",
        "budgetAmount": 120000.00,
        "budgetCurrency": "INR"
      }
    ],
    "recentInvoices": [
      {
        "id": "inv_789",
        "invoiceNumber": "INV-2026-0005",
        "clientName": "Nexus Labs",
        "status": "sent",
        "totalAmount": 45000.00,
        "amountDue": 45000.00,
        "issueDate": "2026-08-10"
      }
    ]
  }
}
```

---

## 9. Backend Domain Architecture (`apps/api/src/domains/dashboard`)

The Dashboard domain will be implemented as a specialized **Read-Model / Aggregation Layer**:

```text
apps/api/src/domains/dashboard/
├── dashboard.controller.ts        # Express HTTP handler for GET /dashboard
├── dashboard.mapper.ts            # Maps raw SQL aggregate rows to camelCase DTOs
├── dashboard.repository.ts        # Optimized SQL queries using Drizzle ORM
├── dashboard.routes.ts            # Express router definition
├── dashboard.service.ts           # Orchestrates parallel queries & checks membership
├── dashboard.types.ts             # Service input & response DTO interfaces
└── __tests__/
    └── dashboard.service.test.ts  # Vitest test suite
```

### Database Query Strategy (`dashboard.repository.ts`)
To achieve sub-100ms performance, `dashboard.repository.ts` will execute 4 focused, indexed queries in parallel using `Promise.all()`:
1. `getInvoiceMetrics(workspaceId)` — Aggregates sums for total, paid, due, and overdue amounts.
2. `getProjectMetrics(workspaceId)` — Counts active projects and fetches upcoming deadlines.
3. `getClientMetrics(workspaceId)` — Counts total active clients.
4. `getRecentInvoices(workspaceId)` — Fetches top 5 recent invoices with client names.

---

## 10. Authorization & Security Matrix

Dashboard endpoints strictly enforce the existing security architecture:
1. **Authentication**: `clerkAuth` validates Clerk RSA JWT signatures.
2. **User Resolution**: `userResolverMiddleware` extracts `req.user.id` internal UUID.
3. **Workspace Membership**: `WorkspaceMemberRepository.getByWorkspaceAndUser(workspaceId, actorId)` checks membership.
4. **RBAC Policy**:
   - `owner`: Can view Dashboard.
   - `editor`: Can view Dashboard.
   - `viewer`: Can view Dashboard (read-only view).

---

## 11. Frontend Architecture & TanStack Query Design

### Directory Structure (`apps/web`)

```text
apps/web/
├── app/workspaces/[workspaceId]/dashboard/page.tsx # App Router Page
└── src/features/dashboard/
    ├── api/
    │   ├── dashboard.api.ts       # API fetcher calling GET /dashboard
    │   └── dashboard.keys.ts      # Query keys definition
    ├── components/
    │   ├── DashboardPage.tsx      # Main Dashboard layout container
    │   ├── DashboardHeader.tsx    # Header & quick actions
    │   ├── DashboardOverview.tsx  # 4 KPI summary cards row
    │   ├── OverdueAlertBanner.tsx # Overdue invoices warning box
    │   ├── ProjectDeadlines.tsx   # Upcoming project deadlines list
    │   ├── InvoiceSummaryCard.tsx # Invoice status breakdown card
    │   ├── RecentInvoicesList.tsx # Recent invoices table
    │   └── DashboardSkeleton.tsx  # Skeleton loading state
    ├── hooks/
    │   └── useDashboard.ts        # Query hook
    └── index.ts
```

### Query Key & Cache Invalidation (`dashboard.keys.ts`)

```ts
export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (workspaceId: string) => [...dashboardKeys.all, workspaceId] as const,
};
```

#### Invalidation Triggers
When any mutation succeeds in another domain, the hook will invalidate the dashboard cache:
- `useCreateClient` / `useDeleteClient` → Invalidates `dashboardKeys.detail(workspaceId)`.
- `useCreateProject` / `useUpdateProject` → Invalidates `dashboardKeys.detail(workspaceId)`.
- `useCreateInvoice` / `useSendInvoice` / `useRecordPayment` → Invalidates `dashboardKeys.detail(workspaceId)`.

---

## 12. Phased Implementation Plan

- **Phase 6A**: Planning & Architecture Documentation (`dashboard.md` & `dashboard-design.md`). **[CURRENT PHASE]**
- **Phase 6B**: Backend Read-Model & API Endpoint (`apps/api/src/domains/dashboard/`).
- **Phase 6C**: Frontend Dashboard Components & TanStack Query (`apps/web/src/features/dashboard/`).
- **Phase 6D**: Cross-Domain Query Cache Integration & Automatic Invalidation.
- **Phase 6E**: Test Suite Execution & E2E HTTP Verification.
- **Phase 6F**: Release Candidate (RC-1) Security & Quality Audit.
