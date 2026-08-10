# Invoice Database Implementation Specification

**Version:** 1.0  
**Last Updated:** August 9, 2026  
**Status:** Database Implementation Specification  
**Owner:** Backend Engineering & Database Architecture  
**Sprint:** Sprint 4  

---

## Document Purpose

This document defines the PostgreSQL database schema, Drizzle ORM mappings, composite foreign key constraints, indexes, and migration strategy for **Sprint 4 — Invoice Management**.

---

## 1. Table Definitions & Schema Specification

### 1. Table: `invoices` (`packages/database/src/schema/invoices.ts`)

| Column Name | DB Column | Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `id` | `uuid` | No | `gen_random_uuid()` | Primary Key |
| `workspaceId` | `workspace_id` | `uuid` | No | - | Foreign Key -> `workspaces.id` (CASCADE) |
| `clientId` | `client_id` | `uuid` | No | - | Foreign Key -> `clients.id` (RESTRICT) |
| `projectId` | `project_id` | `uuid` | Yes | `null` | Foreign Key -> `projects.id` (SET NULL) |
| `invoiceNumber` | `invoice_number` | `varchar(50)` | Yes | `null` | Assigned on `send` (e.g. `INV-2026-0001`) |
| `sequenceNumber` | `sequence_number` | `integer` | Yes | `null` | Sequential integer within workspace |
| `status` | `status` | `invoice_status` | No | `'draft'` | Enum: `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| `issueDate` | `issue_date` | `date` | Yes | `null` | Invoice issuance date |
| `dueDate` | `due_date` | `date` | Yes | `null` | Payment due date |
| `paidAt` | `paid_at` | `timestamp` | Yes | `null` | Timestamp when payment settled |
| `currency` | `currency` | `varchar(3)` | No | `'INR'` | ISO 3-letter currency code |
| `subtotal` | `subtotal` | `numeric(12,2)` | No | `'0.00'` | Sum of item amounts |
| `discountRate` | `discount_rate` | `numeric(5,2)` | Yes | `'0.00'` | Discount percentage (0 - 100) |
| `discountAmount` | `discount_amount` | `numeric(12,2)` | Yes | `'0.00'` | Calculated discount amount |
| `taxableAmount` | `taxable_amount` | `numeric(12,2)` | No | `'0.00'` | Subtotal minus discount |
| `taxRate` | `tax_rate` | `numeric(5,2)` | Yes | `'18.00'` | GST Tax percentage (default 18%) |
| `taxAmount` | `tax_amount` | `numeric(12,2)` | Yes | `'0.00'` | Calculated tax amount |
| `totalAmount` | `total_amount` | `numeric(12,2)` | No | `'0.00'` | Taxable amount plus tax amount |
| `amountPaid` | `amount_paid` | `numeric(12,2)` | No | `'0.00'` | Recorded payment amount |
| `amountDue` | `amount_due` | `numeric(12,2)` | No | `'0.00'` | Outstanding balance |
| `paymentMethod` | `payment_method` | `varchar(50)` | Yes | `null` | Enum string: `upi`, `bank_transfer`, `cash` |
| `paymentReference` | `payment_reference` | `varchar(255)`| Yes | `null` | Transaction ID / UTR reference |
| `notes` | `notes` | `text` | Yes | `null` | Client-facing notes |
| `terms` | `terms` | `text` | Yes | `null` | Payment terms & instructions |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | Audit record creation |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | Audit record update |
| `createdBy` | `created_by` | `uuid` | No | - | User ID who created record |
| `updatedBy` | `updated_by` | `uuid` | No | - | User ID who last updated record |
| `deletedAt` | `deleted_at` | `timestamp` | Yes | `null` | Soft deletion timestamp (Draft only) |

---

### 2. Table: `invoice_items` (`packages/database/src/schema/invoices.ts`)

| Column Name | DB Column | Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `id` | `uuid` | No | `gen_random_uuid()` | Primary Key |
| `workspaceId` | `workspace_id` | `uuid` | No | - | Tenant isolation FK -> `workspaces.id` |
| `invoiceId` | `invoice_id` | `uuid` | No | - | Foreign Key -> `invoices.id` (CASCADE) |
| `description` | `description` | `text` | No | - | Line item description |
| `quantity` | `quantity` | `numeric(10,2)` | No | `'1.00'` | Item quantity or hours |
| `unitPrice` | `unit_price` | `numeric(12,2)` | No | `'0.00'` | Unit rate or hourly rate |
| `amount` | `amount` | `numeric(12,2)` | No | `'0.00'` | Derived: `quantity * unitPrice` |
| `sortOrder` | `sort_order` | `integer` | No | `0` | UI display order |

---

## 2. Multi-Tenant Constraints & Database Integrity Rules

### Composite Foreign Keys
To guarantee that invoices cannot cross tenant boundaries:

```sql
-- Client Tenant Boundary FK
CONSTRAINT fk_invoices_workspace_client
FOREIGN KEY (workspace_id, client_id)
REFERENCES clients (workspace_id, id)
ON DELETE RESTRICT;

-- Project Tenant Boundary FK
CONSTRAINT fk_invoices_workspace_project
FOREIGN KEY (workspace_id, project_id)
REFERENCES projects (workspace_id, id)
ON DELETE SET NULL;
```

### Invoice Number Uniqueness Constraint
Sequential invoice numbers are guaranteed unique per workspace:

```sql
CREATE UNIQUE INDEX idx_invoices_workspace_number
ON invoices (workspace_id, invoice_number)
WHERE invoice_number IS NOT NULL;
```

---

## 3. Indexes & Query Performance

```sql
CREATE INDEX idx_invoices_workspace_id ON invoices (workspace_id);
CREATE INDEX idx_invoices_client_id ON invoices (client_id);
CREATE INDEX idx_invoices_project_id ON invoices (project_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);
```

---

## 4. Migration Strategy

When ready for implementation, the database migration will be executed via Drizzle Kit:

```bash
# 1. Update packages/database/src/schema/index.ts to export invoices schema
# 2. Run Drizzle Kit generation
pnpm --filter @repo/database db:generate
# 3. Apply migration to local development database
pnpm --filter @repo/database db:migrate
```
