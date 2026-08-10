# Invoice REST API Specification

**Version:** 1.0  
**Last Updated:** August 9, 2026  
**Status:** API Specification  
**Owner:** Backend Engineering  
**Sprint:** Sprint 4  

---

## Document Purpose

This document is **Part 4 of 4** in the Invoice Domain Specification for Freelance-OS. It defines the REST API surface, Zod schemas, HTTP response contracts, and error code mappings.

**Base Path:** `/api/v1/workspaces/:workspaceId/invoices`

---

## 1. Endpoint Summary

| Method | Endpoint Path | Description | Required Role |
|---|---|---|---|
| `GET` | `/` | List invoices (supports `status`, `clientId`, `projectId`, `search`) | Viewer / Editor / Owner |
| `POST` | `/` | Create new draft invoice | Editor / Owner |
| `GET` | `/:invoiceId` | Get invoice detail with line items | Viewer / Editor / Owner |
| `PATCH` | `/:invoiceId` | Update draft invoice (line items, notes, terms) | Editor / Owner |
| `POST` | `/:invoiceId/send` | Explicit Command: Issue invoice & assign sequential number | Editor / Owner |
| `POST` | `/:invoiceId/pay` | Explicit Command: Record client payment | Editor / Owner |
| `POST` | `/:invoiceId/cancel` | Explicit Command: Cancel / void invoice | Owner |
| `DELETE` | `/:invoiceId` | Delete draft invoice | Owner |

---

## 2. Response Envelope & Error Codes

All responses use the standard Freelance-OS envelope:

```json
// Success Response (200 / 201)
{ "success": true, "data": T }

// Error Response (4xx / 5xx)
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable error" } }
```

### Error Code Mapping Table

| Domain Error | HTTP Status | API Error Code |
|---|---|---|
| `InvoiceValidationError` | 400 Bad Request | `VALIDATION_ERROR` |
| `InvoiceClientWorkspaceMismatchError` | 400 Bad Request | `CLIENT_WORKSPACE_MISMATCH` |
| `InvoiceProjectWorkspaceMismatchError` | 400 Bad Request | `PROJECT_WORKSPACE_MISMATCH` |
| `InvoiceImmutableError` | 400 Bad Request | `INVOICE_IMMUTABLE` |
| `InvoiceInvalidStatusTransitionError` | 400 Bad Request | `INVALID_TRANSITION` |
| `InvoicePermissionDeniedError` | 403 Forbidden | `FORBIDDEN` |
| `InvoiceNotFoundError` | 404 Not Found | `NOT_FOUND` |
| `InvoiceDeletedError` | 410 Gone | `GONE` |

---

## 3. Zod Validation Schemas (`invoice.schema.ts`)

```typescript
import { z } from "zod";

export const invoiceStatusEnum = z.enum(["draft", "sent", "paid", "overdue", "cancelled"]);
export const paymentMethodEnum = z.enum(["upi", "bank_transfer", "cash", "other"]);

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required"),
  quantity: z.number().positive("Quantity must be greater than 0").default(1),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  projectId: z.string().uuid("Invalid project ID").nullable().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be YYYY-MM-DD").optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD").optional(),
  discountRate: z.number().min(0).max(100).optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(18),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  items: z.array(invoiceItemSchema).min(1, "Invoice must contain at least one item"),
});

export const recordPaymentSchema = z.object({
  amountPaid: z.number().positive("Amount paid must be positive"),
  paymentMethod: paymentMethodEnum.default("upi"),
  paymentReference: z.string().trim().max(255).optional(),
});
```

---

## 4. Endpoint Details & Payload Contracts

### 1. Create Invoice (`POST /api/v1/workspaces/:workspaceId/invoices`)

#### Request Body:
```json
{
  "clientId": "660e8400-e29b-41d4-a716-446655440000",
  "projectId": "770e8400-e29b-41d4-a716-446655440001",
  "dueDate": "2026-10-31",
  "discountRate": 0,
  "taxRate": 18,
  "notes": "Thank you for your business!",
  "items": [
    { "description": "Mobile App UI Design", "quantity": 1, "unitPrice": 100000 },
    { "description": "Backend API Integration", "quantity": 1, "unitPrice": 50000 }
  ]
}
```

#### Response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440002",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "660e8400-e29b-41d4-a716-446655440000",
    "clientName": "Acme Corp Pvt Ltd",
    "projectId": "770e8400-e29b-41d4-a716-446655440001",
    "projectName": "E-Commerce Mobile App",
    "invoiceNumber": null,
    "status": "draft",
    "issueDate": "2026-09-01",
    "dueDate": "2026-10-31",
    "currency": "INR",
    "subtotal": "150000.00",
    "discountAmount": "0.00",
    "taxableAmount": "150000.00",
    "taxRate": "18.00",
    "taxAmount": "27000.00",
    "totalAmount": "177000.00",
    "amountPaid": "0.00",
    "amountDue": "177000.00",
    "items": [
      { "id": "it1", "description": "Mobile App UI Design", "quantity": "1.00", "unitPrice": "100000.00", "amount": "100000.00" },
      { "id": "it2", "description": "Backend API Integration", "quantity": "1.00", "unitPrice": "50000.00", "amount": "50000.00" }
    ]
  }
}
```

---

### 2. Issue / Send Invoice (`POST /api/v1/workspaces/:workspaceId/invoices/:id/send`)

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440002",
    "invoiceNumber": "INV-2026-0001",
    "status": "sent",
    "issuedAt": "2026-09-01T14:30:00.000Z"
  }
}
```

---

### 3. Record Payment (`POST /api/v1/workspaces/:workspaceId/invoices/:id/pay`)

#### Request Body:
```json
{
  "amountPaid": 177000,
  "paymentMethod": "upi",
  "paymentReference": "UPI/6289110023"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440002",
    "status": "paid",
    "amountPaid": "177000.00",
    "amountDue": "0.00",
    "paidAt": "2026-09-05T10:00:00.000Z"
  }
}
```
