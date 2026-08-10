# Invoice Technical Architecture Specification

**Version:** 1.0  
**Last Updated:** August 9, 2026  
**Status:** Architecture Specification  
**Owner:** Backend Architecture & Senior Engineering  
**Sprint:** Sprint 4  

---

## Document Purpose

This document is **Part 3 of 4** in the Invoice Domain Specification for Freelance-OS. It defines layer responsibilities, data flow boundaries, authorization policies, database isolation rules, and TanStack Query state architecture.

---

## 1. System Architecture Diagram

```text
               Next.js 15 Web App (apps/web/src/features/invoice)
                                     │
                                     ▼
                        Feature API (invoice.api.ts)
                                     │
                                     ▼
                           Typed Axios Client
                                     │
                         HTTP POST / PATCH / GET
                                     │
                                     ▼
                 Express API Server (apps/api/src/domains/invoice)
                                     │
                                     ▼
                          Invoice Controller
                                     │
                                     ▼
                           Invoice Service
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
      Invoice Policy          Client Repository       Invoice Repository
    (invoice.policies.ts)   (client.repository.ts)  (invoice.repository.ts)
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     │
                                     ▼
                           Drizzle ORM Engine
                                     │
                                     ▼
                           PostgreSQL Database
```

---

## 2. Layer Responsibilities & Strict Invariants

| Layer | OWNS | MUST NOT OWN |
|---|---|---|
| **Controller (`invoice.controller.ts`)** | Unpacking HTTP request params/body, invoking service, mapping `Result<T>` to HTTP status codes. | Direct database queries, financial business calculations, SQL logic. |
| **Service (`invoice.service.ts`)** | Canonical calculation pipeline, date validation, sequential numbering coordination, role policy evaluation, `Result<T>` wrapping. | Express `req`/`res` objects, HTTP status codes, raw SQL queries. |
| **Policy (`invoice.policies.ts`)** | RBAC permission evaluation (`owner`, `editor`, `viewer`). | Database queries, HTTP error serialization. |
| **Repository (`invoice.repository.ts`)** | Executing Drizzle ORM queries with MANDATORY `workspaceId` filtering on every query. | Financial calculation logic, authorization decisions, HTTP DTO mapping. |

---

## 3. Financial State Machine & Sequential Numbering Concurrency

Sequential invoice numbers (`INV-YYYY-XXXX`) MUST be assigned atomically to avoid gaps or duplicates:

```typescript
// Number Assignment Execution Flow in InvoiceRepository
await db.transaction(async (tx) => {
  // 1. Lock workspace invoice count for update
  const [maxSeq] = await tx
    .select({ max: max(invoicesTable.sequenceNumber) })
    .from(invoicesTable)
    .where(eq(invoicesTable.workspaceId, workspaceId));

  const nextSeq = (maxSeq?.max ?? 0) + 1;
  const currentYear = new Date().getFullYear();
  const invoiceNumber = `INV-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

  // 2. Update invoice status to 'sent' and lock number
  return tx
    .update(invoicesTable)
    .set({
      status: 'sent',
      invoiceNumber,
      sequenceNumber: nextSeq,
      issuedAt: new Date(),
    })
    .where(and(
      eq(invoicesTable.id, invoiceId),
      eq(invoicesTable.workspaceId, workspaceId),
      eq(invoicesTable.status, 'draft')
    ));
});
```

---

## 4. Frontend TanStack Query Architecture

State management relies on **TanStack Query (v5)**:

### Query Keys Factory (`apps/web/src/features/invoice/api/invoice.keys.ts`)
```typescript
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...invoiceKeys.lists(), workspaceId, filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (workspaceId: string, invoiceId: string) =>
    [...invoiceKeys.details(), workspaceId, invoiceId] as const,
} as const;
```

### Mutation Invalidation Strategy
- `useCreateInvoice`: Invalidates `invoiceKeys.lists()`.
- `useSendInvoice`: Invalidates `invoiceKeys.lists()` & updates `invoiceKeys.detail()`.
- `useRecordPayment`: Invalidates `invoiceKeys.lists()` & updates `invoiceKeys.detail()`.
- `useCancelInvoice`: Invalidates `invoiceKeys.lists()` & updates `invoiceKeys.detail()`.

---

## 5. Domain Event Model

```typescript
export type InvoiceEvent =
  | { type: "invoice.created"; invoiceId: string; workspaceId: string; actorId: string; invoice: Invoice }
  | { type: "invoice.updated"; invoiceId: string; workspaceId: string; actorId: string; invoice: Invoice }
  | { type: "invoice.sent"; invoiceId: string; workspaceId: string; actorId: string; invoiceNumber: string; invoice: Invoice }
  | { type: "invoice.paid"; invoiceId: string; workspaceId: string; actorId: string; amountPaid: string; invoice: Invoice }
  | { type: "invoice.cancelled"; invoiceId: string; workspaceId: string; actorId: string; invoice: Invoice };
```
