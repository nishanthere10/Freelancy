# Invoice Management Feature Documentation

**Version:** 1.0  
**Last Updated:** August 9, 2026  
**Status:** Feature Specification  
**Owner:** Product Architecture & Senior Engineering  
**Sprint:** Sprint 4  

---

## Document Purpose

This document is **Part 1 of 4** in the Invoice Domain Specification for Freelance-OS.

| Document | Contents |
|----------|----------|
| `invoice.md` (this file) | Feature Specification: product purpose, domain rules, lifecycle, acceptance criteria |
| `invoice-design.md` | UI/UX Specification: information architecture, component hierarchy, wireframes, print layout |
| `invoice-architecture.md` | Technical Architecture: layer boundaries, type boundaries, TanStack query cache model |
| `invoice-api.md` | API Specification: REST endpoints, Zod schemas, error models, JSON payload contracts |
| `docs/02-engineering/invoice-database.md` | Database Specification: Drizzle tables, composite foreign keys, numeric precision, migration strategy |

---

## 1. Feature Overview

### What Is Invoice Management?
**Invoice Management** allows freelancers to create, issue, send, track, and reconcile professional invoices for services provided to clients within a workspace. Invoices track line items, calculate GST (India tax context), assign sequential invoice numbers, monitor payment due dates, and record client payments.

### User Problems Solved
- **Manual Billing Friction**: Eliminates spreadsheet invoice templates and manual arithmetic error risks.
- **GST Tax Compliance**: Automatically calculates GST (standard 18%) and records client/freelancer GSTINs.
- **Payment Delay & Tracking**: Provides real-time visibility into `sent`, `overdue`, and `paid` status across clients and projects.
- **Audit & Legal Compliance**: Guarantees immutable sequential invoice numbers and audit trails required for tax reporting.

### Product Scope

#### MVP Scope (Sprint 4)
- **Invoice Identity**: Sequential workspace-scoped number (`INV-YYYY-XXXX`), issue date, due date.
- **Client & Project Association**: Mandatory `client_id`, optional `project_id`.
- **Line Items**: Itemized billing rows with description, quantity, unit price, and subtotal amounts.
- **Financial Calculations**: Subtotal, discount percentage/amount, taxable subtotal, GST tax rate/amount, total amount, amount paid, and amount due.
- **Lifecycle & Status Workflow**: Explicit state machine (`draft`, `sent`, `paid`, `overdue`, `cancelled`).
- **Payment Tracking**: Recording payment date, amount paid, payment method (`upi`, `bank_transfer`, `cash`, `other`), and transaction reference.
- **Browser Native PDF Print View**: `@media print` CSS layout for instant PDF preview and download.
- **Multi-Tenant Security**: 100% workspace-isolated SQL queries and composite foreign key enforcement.

#### Non-Goals (Deferred to Sprint 5+)
- **Server-side PDF Daemon**: Puppeteer/PDFKit backend rendering.
- **Automated Payment Gateways**: Stripe / Razorpay webhook integration (Sprint 5).
- **Recurring Subscriptions**: Automatic scheduled monthly retainer invoicing (Sprint 5).
- **Multi-Transaction Ledger**: Storing separate historical payment transaction receipts (Sprint 5).
- **Credit Notes**: Formal tax credit note records.

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

| Relationship | Rule | Rationale |
|---|---|---|
| **Workspace Relationship** | **Mandatory (`workspace_id`)** | Every invoice belongs to exactly one Workspace (multi-tenant security boundary). |
| **Client Relationship** | **Mandatory (`client_id`)** | Every invoice MUST be issued to a Client. `client_id` cannot be null. |
| **Project Relationship** | **Optional (`project_id` Nullable)** | Linking to a Project is optional, allowing freelancers to issue general retainer or consulting invoices. |
| **Multi-Invoice Projects** | **1 : N (One Project, Many Invoices)** | A project can have multiple invoices (deposit, milestones, final invoice). |

---

## 3. Invoice Lifecycle & Business Rules

### Lifecycle State Machine

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

### State Definitions & Capabilities

| Status | Meaning | Number Assigned? | Financial Editing | Soft Delete Allowed? |
|---|---|:---:|:---:|:---:|
| `draft` | Working draft in progress. Amounts not finalized. | ❌ No | ✅ Editable | ✅ Allowed |
| `sent` | Formally issued to client. Payment awaited. | ✅ Yes (`INV-2026-0001`) | 🔒 Immutable | ❌ Forbidden |
| `overdue` | Issued invoice where current date > `due_date`. | ✅ Yes | 🔒 Immutable | ❌ Forbidden |
| `paid` | Payment received in full. | ✅ Yes | 🔒 Immutable | ❌ Forbidden |
| `cancelled` | Voided / Cancelled invoice. | ✅ Yes (if sent) | 🔒 Immutable | ❌ Forbidden |

### Business & Validation Rules
1. **Invoice Number Assignment**: Sequential invoice number `INV-YYYY-XXXX` is assigned ONLY upon transition from `draft` ➔ `sent`. Drafts have no invoice number.
2. **Immutability Rule**: Once an invoice transitions to `sent`, financial amounts, line items, client, and project associations are permanently locked.
3. **Audit Protection**: `sent`, `paid`, `overdue`, and `cancelled` invoices CANNOT be soft-deleted. Voiding must be executed via transition to `cancelled` to preserve audit logs.
4. **Date Validation**: `due_date` MUST be greater than or equal to `issue_date`.
5. **Positive Monetary Values**: Unit prices, totals, and tax rates MUST be non-negative.
6. **Client Workspace Scope**: The selected Client and optional Project MUST belong to the SAME `workspaceId`.

---

## 4. Financial Calculation Pipeline

All financial calculations are performed on the backend service layer (`InvoiceService`):

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

- **Monetary Precision**: Stored as PostgreSQL `numeric(12, 2)`. Amounts are rounded to 2 decimal places using exact mathematical rounding.

---

## 5. User Journeys

### Journey 1: Create and Send Invoice
```text
User ➔ UI "+ Create Invoice" ➔ Selects Client & Project ➔ Enters Line Items ➔ Clicks "Save Draft"
  ➔ POST /api/v1/workspaces/:workspaceId/invoices (Draft created)
User reviews preview ➔ Clicks "Send / Issue Invoice"
  ➔ POST /api/v1/workspaces/:workspaceId/invoices/:id/send
  ➔ Assigns number "INV-2026-0001", locks invoice, updates status to "sent"
```

### Journey 2: Record Payment
```text
User ➔ Invoice Detail ➔ Clicks "Record Payment" ➔ Selects Payment Method (UPI) & Amount
  ➔ POST /api/v1/workspaces/:workspaceId/invoices/:id/pay
  ➔ Updates amount_paid, sets status to "paid", records paid_at timestamp
```

---

## 6. Permissions (RBAC)

| Action | Viewer | Editor | Owner | Policy Check |
|---|:---:|:---:|:---:|---|
| View Invoices | ✅ | ✅ | ✅ | `canViewInvoice` |
| Create Draft / Edit Draft | ❌ | ✅ | ✅ | `canCreateInvoice` / `canUpdateInvoice` |
| Send / Issue Invoice | ❌ | ✅ | ✅ | `canSendInvoice` |
| Record Payment | ❌ | ✅ | ✅ | `canRecordPayment` |
| Cancel Invoice | ❌ | ❌ | ✅ | `canCancelInvoice` |
| Delete Draft Invoice | ❌ | ❌ | ✅ | `canDeleteInvoice` |

---

## 7. Acceptance Criteria (Gherkin)

```gherkin
Feature: Invoice Management

  Scenario: Successfully create and issue an invoice
    Given I am an "editor" in workspace "w1"
    And a client "c1" exists in workspace "w1"
    When I submit a POST request to "/api/v1/workspaces/w1/invoices" with:
      | clientId | c1 |
      | items    | [{ "description": "Web Design", "quantity": 1, "unitPrice": 50000 }] |
    Then the response status should be 201
    And the invoice status should be "draft"
    And the invoiceNumber should be null
    When I submit a POST request to "/api/v1/workspaces/w1/invoices/:id/send"
    Then the response status should be 200
    And the invoice status should be "sent"
    And the invoiceNumber should match "INV-2026-\d{4}"

  Scenario: Prevent editing a sent invoice
    Given an invoice "inv1" in status "sent" in workspace "w1"
    When I submit a PATCH request to "/api/v1/workspaces/w1/invoices/inv1" with updated line items
    Then the response status should be 400
    And the error code should be "INVOICE_IMMUTABLE"
```
