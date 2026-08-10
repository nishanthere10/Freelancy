# Sprint 4 — Invoice Management Product & Architecture Discovery

**Vertical Slice:** Invoice Management  
**Role:** Principal Product Engineer + Staff Architect  
**Date:** August 9, 2026  
**Status:** Product & Architecture Specification (Pre-Implementation)  

---

## Executive Summary

This document establishes the product vision, domain relationships, state lifecycle, database structure, financial calculation rules, security isolation model, and API surface for **Sprint 4 — Invoice Management**. 

Building upon the validated **Workspace (Sprint 1)**, **Client (Sprint 2)**, and **Project (Sprint 3)** slices, Invoice bridges project deliverables to financial transactions.

```text
User
 └── Workspace (Sprint 1 — Validated)
      ├── Client (Sprint 2 — Validated)
      │    └── Project (Sprint 3 — Validated)
      │
      └── Invoice (Sprint 4 — THIS SPECIFICATION)
```

---

## 1. Product Goal & Scope

### Core Value Proposition
Freelancers need a simple, legally compliant, professional mechanism to issue invoices, calculate taxes (GST for India), track due dates, and record payments without resorting to external spreadsheets or heavy enterprise accounting suites.

### User Story
> "As a freelancer, I want to generate a professional invoice from a client or project, calculate applicable GST, issue it with a sequential invoice number, and mark it paid when I receive funds."

---

## 2. Domain Relationships & Multi-Tenancy

```text
                          Workspace (workspace_id)
                          ┌──────────────────────┐
                          │  TENANT BOUNDARY     │
                          └──────────┬───────────┘
                                     │
            ┌────────────────────────┴────────────────────────┐
            ▼                                                 ▼
  Client (workspace_id, id)                       Project (workspace_id, id)
            │                                                 │
            └────────────────────────┬────────────────────────┘
                                     │
                                     ▼
                      Invoice (workspace_id, id)
```

### Relationship Matrix

| Question | Decision | Architectural Rationale |
|---|---|---|
| **Does Invoice belong to Workspace?** | **YES (Mandatory `workspace_id`)** | Primary tenant isolation boundary. All SQL queries filter by `workspace_id`. |
| **Does Invoice belong to Client?** | **YES (Mandatory `client_id`)** | Invoices MUST be issued to a specific Client. `client_id` cannot be null. |
| **Does Invoice belong to Project?** | **OPTIONAL (Nullable `project_id`)** | Most invoices map to a Project. However, `project_id` is nullable to allow general client retainers, ad-hoc consulting fees, or deposit billing before a project is initialized. |
| **Can one Project have multiple Invoices?** | **YES (1 : N)** | A project can be billed via deposit invoice, milestone invoices, and final invoice. |
| **Can one Invoice cover multiple Projects?** | **NO (1 : 1 or Client-wide)** | For MVP simplicity, an invoice maps to either one specific Project or unassigned Client billing. |

### Multi-Tenant Integrity Protection
To prevent cross-tenant data leakage (e.g., creating an invoice in Workspace A referencing a Client or Project in Workspace B), PostgreSQL enforces two **Composite Foreign Keys**:

```sql
-- Client Tenant Constraint
CONSTRAINT fk_invoices_workspace_client
FOREIGN KEY (workspace_id, client_id)
REFERENCES clients (workspace_id, id)
ON DELETE RESTRICT

-- Project Tenant Constraint
CONSTRAINT fk_invoices_workspace_project
FOREIGN KEY (workspace_id, project_id)
REFERENCES projects (workspace_id, id)
ON DELETE SET NULL
```

---

## 3. Invoice Lifecycle & State Machine

Invoices transition through five explicit states:

```text
   ┌─────────┐         Send / Issue          ┌─────────┐          Mark Paid           ┌─────────┐
   │  DRAFT  │ ────────────────────────────> │  SENT   │ ───────────────────────────> │  PAID   │
   └────┬────┘                               └────┬────┘                              └─────────┘
        │                                         │
        │ Cancel                                  │ Cancel / Overdue
        v                                         v
   ┌─────────┐                               ┌─────────┐
   │CANCELLED│ <──────────────────────────── │ OVERDUE │
   └─────────┘                               └─────────┘
```

### Lifecycle Definitions

| Status | Meaning | Number Assigned? | Editable? | Allowed Transitions |
|---|---|:---:|:---:|---|
| `draft` | Unissued working draft. Financial amounts un-locked. | ❌ No | ✅ Yes | `sent`, `cancelled` |
| `sent` | Formally issued to client. Payment awaited. | ✅ Yes (`INV-2026-0001`) | ❌ Immutable | `paid`, `overdue`, `cancelled` |
| `overdue` | Issued invoice past due date (`due_date < NOW()`). | ✅ Yes | ❌ Immutable | `paid`, `cancelled` |
| `paid` | Payment received and settled. | ✅ Yes | ❌ Immutable | None (Terminal state) |
| `cancelled` | Voided / Cancelled invoice. | ✅ Yes (if sent) | ❌ Immutable | None (Terminal state) |

### Transition Rules
1. **`draft` ➔ `sent`**: Validates line items, generates next sequential `invoice_number` (`INV-2026-XXXX`), locks amounts, sets `issued_at = NOW()`.
2. **`sent` ➔ `paid`**: Sets `amount_paid = total_amount`, `amount_due = 0`, `paid_at = NOW()`.
3. **`sent` ➔ `overdue`**: Automatic state transition when current date passes `due_date` and `amount_due > 0`.
4. **Any State ➔ `cancelled`**: Voids invoice. Sequential number remains burned to preserve audit trail.

---

## 4. Status vs. Payment Model

### Evaluated Options
- **Option A (Separate State Machines)**: `invoice_status` (`draft`, `issued`, `void`) AND `payment_status` (`unpaid`, `partially_paid`, `paid`).
- **Option B (RECOMMENDED - Unified Lifecycle)**: Single `status` enum (`draft`, `sent`, `paid`, `overdue`, `cancelled`) paired with explicit numeric fields (`amount_paid`, `amount_due`).

### Rationale
For solo freelancers, a single state machine is significantly easier to understand and operate. Partial payments are tracked via numeric fields (`amount_paid`), while the primary badge reflects actionable lifecycle status.

---

## 5. Invoice Numbering Architecture

Invoice numbering is legally sensitive. 

### Design Rules
1. **Sequential & Workspace-Scoped**: Format `INV-YYYY-XXXX` (e.g. `INV-2026-0001`), resetting sequence per workspace per calendar year.
2. **Assignment Timing**: Invoice numbers are **NOT** assigned during `draft` state. They are assigned atomically when transitioning from `draft` ➔ `sent`.
3. **Immutability & Audit Trail**: Once assigned, an invoice number is permanently locked. Cancelling an invoice retains its number as `cancelled` to prevent gap-based tax audit flags.
4. **Concurrency Safety**: Sequential number generation executes inside a PostgreSQL atomic transaction (`SELECT MAX(sequence_number) WHERE workspace_id = :wId FOR UPDATE`).

---

## 6. Money & Calculation Architecture

Financial calculations MUST NOT use floating-point arithmetic (`0.1 + 0.2 = 0.30000000000000004`).

### Storage Representation
- Stored in PostgreSQL as `numeric(12, 2)` (supports amounts up to ₹999,999,999.99).
- DTOs transport amounts as exact stringified decimals (`"15000.00"`).

### Canonical Calculation Pipeline (`InvoiceService`)

```text
  Line Items (quantity * unit_price)
                 ↓
           Line Amounts
                 ↓
         Subtotal = Σ(Line Amounts)
                 ↓
  Discount = Subtotal * (discount_rate / 100)
                 ↓
      Taxable Amount = Subtotal - Discount
                 ↓
    Tax Amount = Taxable Amount * (tax_rate / 100)
                 ↓
   Total Amount = Taxable Amount + Tax Amount
                 ↓
     Amount Due = Total Amount - Amount Paid
```

---

## 7. Line Items Data Model

An invoice contains 1 or more line items (`invoice_items` table):

```text
Invoice
 └── InvoiceItem[]
      ├── description (text, required)
      ├── quantity (numeric(10,2), default 1.00)
      ├── unitPrice (numeric(12,2), required)
      ├── amount (numeric(12,2), derived: quantity * unitPrice)
      └── sortOrder (integer, default 0)
```

---

## 8. GST / Tax Scope for India MVP

To avoid overengineering a global tax engine while providing full utility for Indian freelancers:

### MVP Scope (Sprint 4)
- **Freelancer GSTIN**: Stored on Workspace settings.
- **Client GSTIN**: Stored on Client record (`clients.gst_number`).
- **Single Tax Rate (`tax_rate`)**: Percentage input (e.g., `18.00` for standard GST).
- **Tax Summary Breakdown**: UI/Print layout renders CGST (9%) + SGST (9%) for intra-state or IGST (18%) for inter-state based on workspace/client state match.

---

## 9. Currency Scope

- **Default Currency**: `'INR'` (Indian Rupee).
- **Multi-Currency Support**: Stored as ISO 3-letter code (`varchar(3)`). Currency cannot be changed once invoice is transitioned to `sent`.

---

## 10. Editability & Immutability Rules

```text
        ┌─────────────┬───────────────────┬───────────────────┐
        │ Field Group │ Draft Status      │ Sent / Paid       │
        ├─────────────┼───────────────────┼───────────────────┤
        │ Line Items  │ ✅ Editable       │ 🔒 Locked         │
        │ Financials  │ ✅ Editable       │ 🔒 Locked         │
        │ Client/Proj │ ✅ Editable       │ 🔒 Locked         │
        │ Notes       │ ✅ Editable       │ ✅ Editable       │
        │ Due Date    │ ✅ Editable       │ ✅ Extendable     │
        └─────────────┴───────────────────┴───────────────────┘
```

---

## 11. Soft Delete & Audit Policy

- **`draft` Invoices**: Soft deletion permitted (`deleted_at = NOW()`).
- **`sent` / `paid` / `cancelled` Invoices**: Hard deletion and soft deletion **PROHIBITED**. Must remain permanently in database for legal tax auditability. Voiding is executed strictly via status transition to `cancelled`.

---

## 12. Authorization Matrix (RBAC)

| Action | Viewer | Editor | Owner | Policy Function |
|---|:---:|:---:|:---:|---|
| `listInvoices` / `getInvoice` | ✅ | ✅ | ✅ | `canViewInvoice` |
| `createInvoice` / `updateDraft` | ❌ | ✅ | ✅ | `canCreateInvoice` / `canUpdateInvoice` |
| `sendInvoice` (Issue) | ❌ | ✅ | ✅ | `canSendInvoice` |
| `recordPayment` | ❌ | ✅ | ✅ | `canRecordPayment` |
| `cancelInvoice` | ❌ | ❌ | ✅ | `canCancelInvoice` |
| `deleteDraft` | ❌ | ❌ | ✅ | `canDeleteInvoice` |

---

## 13. Proposed REST API Surface

```text
GET    /api/v1/workspaces/:workspaceId/invoices              # List invoices (supports status, clientId, projectId filters)
POST   /api/v1/workspaces/:workspaceId/invoices              # Create draft invoice
GET    /api/v1/workspaces/:workspaceId/invoices/:id          # Get invoice detail with line items
PATCH  /api/v1/workspaces/:workspaceId/invoices/:id          # Update draft invoice metadata & items
POST   /api/v1/workspaces/:workspaceId/invoices/:id/send     # Explicit command: Issue invoice & assign number
POST   /api/v1/workspaces/:workspaceId/invoices/:id/pay      # Explicit command: Record payment
POST   /api/v1/workspaces/:workspaceId/invoices/:id/cancel   # Explicit command: Cancel/void invoice
DELETE /api/v1/workspaces/:workspaceId/invoices/:id          # Delete draft invoice
```

---

## 14. Frontend UX & Document Generation (PDF Strategy)

### Document Generation Strategy: Browser Native Print CSS (RECOMMENDED)
Instead of adding heavy server-side PDF generation dependencies (Puppeteer/PDFKit), Sprint 4 uses **Browser Native Styled Print Views (`@media print`)**.
- **Pros**: 0 bundle overhead, 100% pixel-perfect vector rendering, instant preview, zero server infrastructure cost.
- **User Flow**: User clicks **"Download PDF / Print"** -> Opens formatted clean print preview -> Browser saves as PDF.

---

## 15. Proposed Database Schema

```typescript
// packages/database/src/schema/invoices.ts

export const invoicesTable = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    clientId: uuid('client_id').notNull(),
    projectId: uuid('project_id'),

    // Numbering & Status
    invoiceNumber: varchar('invoice_number', { length: 50 }), // NULL in draft, assigned on send
    sequenceNumber: integer('sequence_number'),
    status: invoiceStatusEnum('status').notNull().default('draft'),

    // Dates
    issueDate: date('issue_date'),
    dueDate: date('due_date'),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // Financial Totals
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }).default('0.00'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00'),
    taxableAmount: numeric('taxable_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('18.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amountDue: numeric('amount_due', { precision: 12, scale: 2 }).notNull().default('0.00'),

    // Payment Tracking Metadata
    paymentMethod: varchar('payment_method', { length: 50 }), // upi, bank_transfer, cash
    paymentReference: varchar('payment_reference', { length: 255 }),

    // Content & Notes
    notes: text('notes'),
    terms: text('terms'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index('idx_invoices_workspace_id').on(table.workspaceId),
    clientIdx: index('idx_invoices_client_id').on(table.clientId),
    projectIdx: index('idx_invoices_project_id').on(table.projectId),
    statusIdx: index('idx_invoices_status').on(table.status),
    numberUnique: uniqueIndex('idx_invoices_workspace_number')
      .on(table.workspaceId, table.invoiceNumber)
      .where(isNotNull(table.invoiceNumber)),
    fkWorkspaceClient: foreignKey({
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clientsTable.workspaceId, clientsTable.id],
      name: 'fk_invoices_workspace_client',
    }).onDelete('restrict'),
    fkWorkspaceProject: foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projectsTable.workspaceId, projectsTable.id],
      name: 'fk_invoices_workspace_project',
    }).onDelete('set null'),
  })
);

export const invoiceItemsTable = pgTable(
  'invoice_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    invoiceId: uuid('invoice_id').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1.00'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    invoiceIdx: index('idx_invoice_items_invoice_id').on(table.invoiceId),
    fkInvoice: foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoicesTable.id],
      name: 'fk_invoice_items_invoice',
    }).onDelete('cascade'),
  })
);
```

---

## 16. Scope Boundary Matrix

### Sprint 4 MUST HAVE (MVP)
- Full Invoice CRUD (Drafting, Line items, Subtotal/Tax/Total calculation).
- Client & Project association with Composite Foreign Key multi-tenancy.
- Sequential Invoice Numbering on `send` action (`INV-2026-XXXX`).
- State Lifecycle (`draft` ➔ `sent` ➔ `paid` / `overdue` / `cancelled`).
- Payment recording (`amount_paid`, `paid_at`, `payment_method`).
- Browser Native Printable Invoice View (`@media print`).

### DEFERRED (Future Sprints)
- Server-side PDF generation daemon / Puppeteer.
- Razorpay / Stripe payment gateway automated webhooks (Sprint 5).
- Recurring automated billing (Sprint 5).
- Multi-currency exchange rate conversions.

---

## 17. Risk Register

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **Financial Rounding Errors** | HIGH | Perform all calculations using backend stringified decimal rounding (`Math.round(val * 100) / 100`). |
| **Duplicate Invoice Numbers** | HIGH | Assign numbers inside an isolated DB transaction with partial unique index `idx_invoices_workspace_number`. |
| **Cross-Tenant Invoice Leak** | CRITICAL | Enforce composite foreign keys `(workspace_id, client_id)` and `(workspace_id, project_id)` at PostgreSQL level. |
| **Illegal Sent Invoice Edits** | HIGH | `InvoiceService` rejects `update` invocations if `status !== 'draft'`. |

---

## 18. Human Decision Checkpoint

> [!IMPORTANT]
> The human developer must review and confirm the following 10 architectural decisions before Sprint 4 code implementation begins:

1. **Mandatory Client / Optional Project**: Invoice MUST require a `client_id`, but `project_id` is nullable.
2. **Unified Status Lifecycle**: Single status enum (`draft`, `sent`, `paid`, `overdue`, `cancelled`).
3. **Sequential Number Timing**: Numbers assigned on `send` transition (`INV-YYYY-XXXX`), not in draft.
4. **Financial Storage**: Amounts stored as PostgreSQL `numeric(12, 2)`.
5. **Tax Calculation**: Single tax percentage field (default 18% GST), rendered as CGST/SGST or IGST in UI.
6. **Immutability Policy**: Sent/Paid/Cancelled invoices cannot be edited or soft-deleted.
7. **Line Item Architecture**: Separate `invoice_items` child table with cascade deletion.
8. **PDF Generation**: Use browser native `@media print` CSS styled layout instead of Puppeteer backend.
9. **Payment Model**: Record payment status, date, and method directly on invoice record.
10. **Composite Tenant Keys**: Enforce composite foreign keys `(workspace_id, client_id)` and `(workspace_id, project_id)`.
