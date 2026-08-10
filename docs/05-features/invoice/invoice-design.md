# Invoice UI/UX Specification

**Version:** 1.0  
**Last Updated:** August 9, 2026  
**Status:** UI/UX Design Specification  
**Owner:** Frontend Engineering & UX Team  
**Sprint:** Sprint 4  

---

## Document Purpose

This document is **Part 2 of 4** in the Invoice Domain Specification for Freelance-OS. It outlines the information architecture, component hierarchy, design token mapping, responsive behavior, and printable document styling for Invoice Management.

---

## 1. Information Architecture

Invoices are organized within the Workspace context and reference Client and optional Project records:

```text
Workspace Navigation
  ├── Dashboard
  ├── Clients (/workspaces/[workspaceId]/clients)
  ├── Projects (/workspaces/[workspaceId]/projects)
  └── Invoices (/workspaces/[workspaceId]/invoices)
        ├── Invoice List (Default grid view)
        └── Invoice Detail (/workspaces/[workspaceId]/invoices/[invoiceId])
```

---

## 2. Page Anatomy & Component Inventory

All components will reside in `apps/web/src/features/invoice/components/`:

| Component | Responsibility | Visual Variant / Token |
|---|---|---|
| `InvoicePage.tsx` | Feature layout, search/filter bar, action header | Shared `Button`, `Input`, `Skeleton` |
| `InvoiceList.tsx` | Grid wrapper for cards or empty placeholder | Responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) |
| `InvoiceCard.tsx` | Individual summary card showing status badge, client tag, total amount, due date | `Card` container with subtle hover shadow |
| `InvoiceDetail.tsx` | Full invoice detail view with action header, breakdown, line items table, payment summary | Printable container (`@media print` supported) |
| `CreateInvoiceDialog.tsx` | Modal wrapper for invoice drafting | `Dialog` primitive |
| `CreateInvoiceForm.tsx` | React Hook Form with dynamic line items array | Form Provider with Zod validation |
| `LineItemEditor.tsx` | Dynamic table allowing adding/removing line items | Line items array form control |
| `RecordPaymentDialog.tsx` | Modal prompt for recording client payment | `Dialog` primitive |
| `InvoiceStatusBadge.tsx` | Colored pill badge reflecting lifecycle status | Status-colored badges |
| `InvoicePrintView.tsx` | Clean printable invoice layout formatted for A4 PDF export | Dedicated CSS print styling |

---

## 3. Visual Tokens & Color Mapping

Following Freelance-OS design system invariants, Invoice uses standard tokens:

### Status Badges (`InvoiceStatusBadge.tsx`)

| Status | Background Token | Text Token | Border Token |
|---|---|---|---|
| `draft` | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| `sent` | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| `paid` | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| `overdue` | `bg-red-50` | `text-red-700` | `border-red-200` |
| `cancelled` | `bg-gray-100` | `text-gray-600` | `border-gray-200` |

---

## 4. Invoice Card Layout (`InvoiceCard.tsx`)

```text
┌──────────────────────────────────────────────────────────┐
│  [STATUS BADGE]                        INV-2026-0001     │
│  Acme Corp Pvt Ltd                                       │
│  Project: E-Commerce Mobile App                          │
│  ──────────────────────────────────────────────────────  │
│  Total Amount: ₹1,77,000                   18% GST       │
│  Due Date: Oct 31, 2026 (Due in 12 days)                 │
│  ──────────────────────────────────────────────────────  │
│  [View Details]                    [Send] [Record Pay]   │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Invoice Detail & Printable View Layout (`InvoiceDetail.tsx`)

```text
┌──────────────────────────────────────────────────────────┐
│ ← Back to Invoices                    [Print / PDF] [Pay]│
│                                                          │
│  INVOICE                               [STATUS BADGE]    │
│  Invoice #: INV-2026-0001                                │
│  Issue Date: Sep 1, 2026 | Due Date: Oct 1, 2026        │
│  ──────────────────────────────────────────────────────  │
│  FROM:                        TO:                        │
│  Alex Freelancer              Acme Corp Pvt Ltd          │
│  GSTIN: 27AAAAA0000A1Z5       GSTIN: 27BBBCC1111B1Z2     │
│  ──────────────────────────────────────────────────────  │
│  ITEMS                                                   │
│  Description              Qty    Rate        Amount      │
│  Mobile App Frontend       1     ₹1,00,000   ₹1,00,000   │
│  Backend API & DB          1     ₹50,000     ₹50,000     │
│  ──────────────────────────────────────────────────────  │
│                               Subtotal:      ₹1,50,000   │
│                               18% GST:       ₹27,000     │
│                               Grand Total:   ₹1,77,000   │
│                               Amount Paid:   ₹0.00       │
│                               Amount Due:    ₹1,77,000   │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Print & PDF Styling (`@media print`)

To generate PDFs without server infrastructure, `InvoiceDetail.tsx` applies print-specific CSS rules:

```css
@media print {
  body { background: white; color: black; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .invoice-container { box-shadow: none; border: none; padding: 0; }
}
```

---

## 7. Responsive & Accessibility Design

### Responsive Layout Rules
- **Desktop (≥ 1024px)**: 3-column card grid, inline search and status tabs.
- **Tablet (768px - 1023px)**: 2-column card grid.
- **Mobile (< 768px)**: 1-column card grid, scrollable status tabs, full-width inputs.

### Accessibility (a11y) Rules
- **Form Controls**: All input fields use explicit `id` to `label` `htmlFor` association and `aria-invalid` / `aria-describedby` error bindings.
- **Dialog Focus Trap**: `CreateInvoiceDialog` and `RecordPaymentDialog` trap focus and handle `Escape` key close.
- **Color Contrast**: Status badge text maintains WCAG AA contrast ratios (≥ 4.5:1).
