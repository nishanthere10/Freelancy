# Dashboard Feature Module (`@features/dashboard`)

The **Dashboard** feature module provides freelancers with a real-time operational overview of business health, active deliverables, cash flow metrics, and invoice statuses.

---

## 1. Directory Structure

```text
apps/web/src/features/dashboard/
├── api/
│   ├── dashboard.api.ts       # Typed REST API fetcher (GET /api/v1/workspaces/:id/dashboard)
│   ├── dashboard.keys.ts      # Query keys factory (dashboardKeys.detail(workspaceId))
│   └── dashboard.types.ts     # Frontend response DTO types
├── components/
│   ├── DashboardHeader.tsx    # Header with title & quick CTA buttons
│   ├── DashboardOverview.tsx  # 4-column KPI cards row
│   ├── MetricCard.tsx         # Reusable KPI card with icon & status colors
│   ├── OverdueAlertBanner.tsx # Overdue invoices warning banner
│   ├── ProjectDeadlines.tsx   # Upcoming deliverables list
│   ├── InvoiceSummaryCard.tsx # Invoice status breakdown card
│   ├── RecentInvoicesList.tsx # Recent 5 invoices table
│   ├── DashboardSkeleton.tsx  # Skeleton loading geometry
│   ├── DashboardEmptyState.tsx# New workspace welcome state
│   └── DashboardPage.tsx      # Main layout container
├── hooks/
│   └── useDashboard.ts        # TanStack Query hook
└── index.ts                   # Public module exports
```

---

## 2. Query Caching & Invalidation Strategy

- **Query Key**: `['dashboard', workspaceId]`
- **Stale Time**: 3 minutes.
- **Cross-Domain Cache Invalidation**: Automatically invalidated when mutations succeed in:
  - `useCreateClient` (`@features/client`)
  - `useCreateProject` (`@features/project`)
  - `useCreateInvoice` (`@features/invoice`)
  - `useRecordPayment` (`@features/invoice`)

---

## 3. Design System & Layout Conventions

- **Widescreen Container**: `max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12`.
- **Theme Alignment**: Aligned with `docs/01-product/design-language.md` using CSS variables (`--color-canvas`, `--color-ink-deep`, `--color-brand-yellow`).
- **Icons**: Phosphor icons (`ChartPie`, `Receipt`, `CheckCircle`, `Clock`, `Briefcase`, `Warning`).
