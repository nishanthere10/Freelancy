# Sprint 6 — Business Dashboard UI/UX Design Contract (`dashboard-design.md`)

**Version:** 1.0  
**Status:** Phase 6A APPROVED SPECIFICATION — Ready for Implementation  
**Date:** August 11, 2026  
**Target Design System:** `docs/01-product/design-language.md` & `apps/web/src/styles/globals.css`

---

## 1. Design Objective & Aesthetic Philosophy

The **Freelance OS Dashboard** UI is designed to feel **calm, operational, premium, and actionable**. It provides immediate clarity on business health without visual clutter or decorative slop.

### Core Visual Principles
- **Design Token Compliance**: Uses existing CSS variable tokens (`--color-canvas`, `--color-ink-deep`, `--color-brand-yellow`, `--color-slate-text`, `--color-hairline`).
- **Widescreen Layout (`max-w-[1400px]`)**: Utilizes full available horizontal space with fluid padding (`p-6 sm:p-10 lg:p-12`).
- **Rounded Geometries (`rounded-2xl` & `rounded-full`)**: Standardized 20px card corners (`rounded-2xl`) and pill buttons/tags (`rounded-full`).
- **Iconography**: Phosphor / Lucide icons (`CurrencyDollar`, `Receipt`, `CheckCircle`, `Clock`, `Briefcase`, `Users`, `Warning`).
- **No Random Colors**: Strict adherence to curated status tints (emerald for collected, amber for pending/overdue, purple for gross invoiced, blue for active projects).

---

## 2. Design Tokens Reference Table

```css
/* Established Tokens from apps/web/src/styles/globals.css & design-language.md */
:root {
  --color-canvas: #f8fafc;               /* Page background surface */
  --color-ink-deep: #0f172a;             /* Dark headlines & primary text */
  --color-slate-text: #64748b;           /* Secondary body & metadata text */
  --color-brand-yellow: #ffd000;         /* Canary yellow brand highlight */
  --color-brand-yellow-deep: #e6bc00;    /* Darker yellow hover accent */
  --color-hairline: #e2e8f0;             /* 1px container dividers */

  --radius-xl: 16px;
  --radius-2xl: 20px;                    /* Standard dashboard card radius */
  --radius-full: 9999px;                 /* Pill buttons & status tags */
}
```

---

## 3. Page Layout Wireframe Specification

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard Header                                                                            │
│ [Icon] Workspace Dashboard Overview                             [+ Create Invoice] [+ Project]│
│ Manage active projects, receivables, and cash flow for <Workspace Name>.                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4-Column KPI Summary Row                                                                    │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│ │ Total Invoiced    │ │ Total Collected   │ │ Balance Due       │ │ Active Projects   │ │
│ │ ₹2,50,000.00      │ │ ₹1,80,000.00      │ │ ₹70,000.00        │ │ 4 Active          │ │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ Overdue Invoices Alert Banner (Conditional - Rendered only if overdueInvoices > 0)          │
│ ⚠️ 1 Overdue Invoice requiring immediate collection (Total: ₹25,000.00)     [View Overdue →]│
├──────────────────────────────────────────────────────────┬──────────────────────────────────┤
│ Deliverables & Active Operations (2-Column Desktop Grid) │ Finance & Receivables Breakdown │
│ ┌──────────────────────────────────────────────────────┐ │ ┌──────────────────────────────┐ │
│ │ 📁 Upcoming Project Deadlines                        │ │ │ 🧾 Invoice Status Breakdown  │ │
│ │ • E-Commerce Redesign — Stark Ind. (Due Aug 20)      │ │ │ • Paid: 12   • Sent: 3        │ │
│ │ • API Integration — Acme Corp (Due Aug 28)           │ │ │ • Draft: 2   • Overdue: 1     │ │
│ └──────────────────────────────────────────────────────┘ │ └──────────────────────────────┘ │
├──────────────────────────────────────────────────────────┴──────────────────────────────────┤
│ Recent Invoices & Payments Table                                                            │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Invoice #       Client          Issue Date     Status      Amount          Action       │ │
│ │ INV-2026-0005   Nexus Labs      Aug 10, 2026   SENT        ₹45,000.00      [View →]     │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Specifications

### 1. Dashboard Header (`DashboardHeader.tsx`)
- **Container**: `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`.
- **Title**: `text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep,#0f172a)] tracking-tight`.
- **Icon Badge**: `h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-semibold`.
- **Quick CTAs**:
  - Primary CTA: Black-pill button `<Button onClick={openCreateInvoice}>+ Create Invoice</Button>`.
  - Secondary CTA: Outlined pill button `<Button variant="outline" onClick={openCreateProject}>+ Add Project</Button>`.

### 2. KPI Summary Cards Row (`DashboardOverview.tsx` & `MetricCard.tsx`)
- **Grid Layout**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`.
- **Card Geometry**: `p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] bg-white shadow-sm hover:shadow-md transition-all flex items-center justify-between`.
- **Cards Breakdown**:
  1. **Total Invoiced**: Text `Total Invoiced` (gray-400 uppercase text-[10px] tracking-wider), Amount `₹2,50,000.00` (text-2xl font-bold text-gray-900), Icon `Receipt` in purple badge (`bg-purple-50 text-purple-600`).
  2. **Total Collected**: Text `Total Collected`, Amount `₹1,80,000.00` (text-2xl font-bold text-emerald-600), Icon `CheckCircle` in emerald badge (`bg-emerald-50 text-emerald-600`).
  3. **Balance Outstanding**: Text `Balance Due`, Amount `₹70,000.00` (text-2xl font-bold text-amber-600), Icon `Clock` in amber badge (`bg-amber-50 text-amber-600`).
  4. **Active Projects**: Text `Active Work`, Value `4 Active` (text-2xl font-bold text-blue-600), Icon `Briefcase` in blue badge (`bg-blue-50 text-blue-600`).

### 3. Overdue Alert Banner (`OverdueAlertBanner.tsx`)
- **Visibility**: Rendered conditionally when `overdueCount > 0`.
- **Styling**: `p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-between gap-4 text-amber-900`.
- **Content**: Icon `Warning` + text: `1 Overdue Invoice requiring collection (Total: ₹25,000.00)`.
- **Action**: Link `View Overdue Invoices →` navigating to `/workspaces/:id/invoices`.

### 4. Operations & Finance Grid (`ProjectDeadlines.tsx` & `InvoiceSummaryCard.tsx`)
- **Layout**: `grid grid-cols-1 lg:grid-cols-2 gap-6`.
- **Project Deadlines Card**:
  - Container: `p-6 rounded-2xl border border-gray-200 bg-white space-y-4`.
  - Item Row: `p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-100/80 transition-colors flex items-center justify-between`.
  - Content: Project name, Client name, Target Date badge (`bg-blue-50 text-blue-700`).
- **Invoice Status Breakdown Card**:
  - Container: `p-6 rounded-2xl border border-gray-200 bg-white space-y-4`.
  - Status Pills: Displays count & amount per status (`Paid` emerald, `Sent` blue, `Draft` gray, `Overdue` amber).

### 5. Recent Invoices Table (`RecentInvoicesList.tsx`)
- **Container**: `p-6 rounded-2xl border border-gray-200 bg-white space-y-4`.
- **Table Structure**: Standard clean table with headers `#`, `Client`, `Date`, `Status`, `Amount`, `Action`.

---

## 5. State Specifications (Loading, Empty, Error)

### Skeleton Loading State (`DashboardSkeleton.tsx`)
Rendered while `isLoading === true`:
- 4 skeleton KPI boxes (`h-32 rounded-2xl animate-pulse bg-gray-100`).
- 2 skeleton section panels (`h-64 rounded-2xl animate-pulse bg-gray-100`).

### Empty States (`DashboardEmptyState.tsx`)
Rendered when a newly created workspace has zero data:
- **Icon**: `<Receipt className="h-10 w-10 text-amber-500" />`.
- **Heading**: `Welcome to your new workspace!`.
- **Description**: `Get started by creating your first client profile, project, or invoice to see real-time financial metrics here.`.
- **Primary CTA**: `<Button onClick={openCreateClient}>Add First Client</Button>`.

### Error State
Rendered if the API returns an error:
- `p-8 text-center bg-red-50 text-red-700 rounded-2xl border border-red-200 max-w-lg mx-auto`.
- Displays error message with a `Retry` button.

---

## 6. Responsive Breakpoints

| Viewport Width | Layout Behavior |
| :--- | :--- |
| **Desktop (`>= 1024px`)** | 4-column KPI cards row, 2-column operations & finance grid, full table view. |
| **Tablet (`768px - 1023px`)** | 2-column KPI cards row, 1-column operations & finance grid. |
| **Mobile (`< 768px`)** | 1-column KPI cards row, 1-column operations, scrollable invoice table. |

---

## 7. Accessibility Specifications

1. **Semantic HTML**: `<main>`, `<section>`, `<h1>`, `<h2>`, `<table>`.
2. **Color Independence**: All status indicators pair status colors with clear text badges (`PAID`, `SENT`, `OVERDUE`).
3. **Keyboard Focus**: Interactive cards and buttons use `focus-visible:ring-2 focus-visible:ring-amber-500`.
4. **Screen Reader Labels**: `aria-label` provided for icon-only action buttons.

---

## 8. Implementation Handoff Rules for Coding Agent

When implementing Sprint 6 Phase 6B/6C, the coding agent MUST:
1. **Read `dashboard.md` and `dashboard-design.md`** as the authoritative contracts.
2. **Use existing shared primitives** (`Button`, `Card`, `Dialog`, `Input`, `Skeleton` from `@shared/components`).
3. **Do NOT create ad-hoc hex colors**; use CSS variables and standard Tailwind palette.
4. **Use Phosphor Icons** (`@phosphor-icons/react`).
5. **Keep layout width at `max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12`**.
6. **Ensure 100% workspace scoping** (`workspaceId` passed to all hooks and API requests).
