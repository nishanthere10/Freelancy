# Sprint 4: Invoice Domain & System Integration

**Version:** 1.1  
**Status:** Phase 4 COMPLETE - Invoice Engine, Payment Logic & UX Polish Delivered  
**Date:** August 8-9, 2026

---

## Executive Summary

Sprint 4 delivers the core financial engine of Freelance OS: the **Invoice Domain & Payment Lifecycle**. This covers:

1. **Database Schema**: `invoices`, `invoice_items`, and `invoice_history` tables with relational integrity to `workspaces`, `clients`, and `projects`.
2. **Serial Number Generator**: Auto-generates unique sequential invoice identifiers (`INV-2026-0001`, `INV-2026-0002`) upon sending.
3. **State Machine & Immutability Engine**: 5-stage lifecycle (`draft` → `sent` → `paid` / `overdue` / `cancelled`). Immutability locks prevent modifying sent or paid invoices.
4. **Repository & Service Layer**: `InvoiceRepository`, `FakeInvoiceRepository`, `InvoiceService` with Result<T> pattern, financial math calculation engine (Subtotal, Discount, Taxable, GST, Total, Due).
5. **API & Routes**: Express router mounted at `/api/v1/workspaces/:workspaceId/invoices`.
6. **Frontend Web App (`apps/web`)**: Next.js App Router integration (`/workspaces/:workspaceId/invoices`), `InvoicesRoute`, `CreateInvoiceDialog`, `CreateInvoiceForm`, `EditInvoiceDialog`, `RecordPaymentDialog`, `InvoiceDetailView`.
7. **UX & UI Refinement**: Date Selection Preset Badges (`Today`, `Net 7`, `Net 15`, `Net 30`), generous modal padding, `.no-scrollbar` utility, auto-seeding helper (`seed.ts`).

---

## What Was Built

### Phase 4a: Database & Invoice Domain Engine (COMPLETE ✅)

**Database Tables (`packages/database/src/schema/invoices.ts`)**
- `invoices`: `id`, `workspaceId`, `clientId`, `projectId`, `invoiceNumber`, `status`, `subtotal`, `taxRate`, `taxAmount`, `discountRate`, `discountAmount`, `totalAmount`, `amountPaid`, `amountDue`, `issueDate`, `dueDate`, `sentAt`, `paidAt`, audit timestamps.
- `invoice_items`: `id`, `invoiceId`, `description`, `quantity`, `unitPrice`, `amount`, `sortOrder`.
- `invoice_history`: `id`, `invoiceId`, `fromStatus`, `toStatus`, `actorId`, `notes`, `createdAt`.

**Domain Logic & Policies (`invoice.policies.ts`, `invoice.service.ts`)**
- `canCreateInvoice`, `canUpdateInvoice`, `canSendInvoice`, `canRecordPayment`, `canCancelInvoice`.
- `InvoiceService.sendInvoice`: Validates line items exist, assigns sequential number `INV-YYYY-XXXX`, sets status to `sent`, locks editing.
- `InvoiceService.recordPayment`: Updates `amountPaid` and `amountDue`. Auto-transitions status to `paid` when `amountDue <= 0`.

---

### Phase 4b: API Endpoints & E2E Tests (COMPLETE ✅)

**REST Routes (`apps/api/src/domains/invoice/`)**
- `POST /api/v1/workspaces/:workspaceId/invoices` — Create draft invoice
- `GET /api/v1/workspaces/:workspaceId/invoices` — List invoices (filtered by status/search)
- `GET /api/v1/workspaces/:workspaceId/invoices/:invoiceId` — Get invoice details with items & history
- `PATCH /api/v1/workspaces/:workspaceId/invoices/:invoiceId` — Update draft invoice
- `POST /api/v1/workspaces/:workspaceId/invoices/:invoiceId/send` — Transition to `sent` + lock
- `POST /api/v1/workspaces/:workspaceId/invoices/:invoiceId/payments` — Record payment
- `POST /api/v1/workspaces/:workspaceId/invoices/:invoiceId/cancel` — Cancel invoice

**Testing Suite**
- `invoice.e2e.test.ts`: Complete HTTP lifecycle E2E test (`POST draft` -> `GET detail` -> `PATCH update` -> `POST send` -> `POST payment` -> `Immutability checks`).
- `invoice.repository.test.ts` & `invoice.routes.test.ts`: 100% green passing tests.

---

### Phase 4c: Web Frontend & User Experience Polish (COMPLETE ✅)

**App Router Pages & Components (`apps/web`)**
- App Router Pages:
  - `apps/web/app/workspaces/[workspaceId]/invoices/page.tsx`
  - `apps/web/app/invoices/page.tsx`
- Feature Components:
  - `InvoicesRoute.tsx`: Main route container managing active invoice views, search, and state.
  - `CreateInvoiceDialog.tsx` & `CreateInvoiceForm.tsx`: Invoice form with live math preview, line items table, and **Date Selection Presets** (`Today`, `Net 7`, `Net 15`, `Net 30`).
  - `EditInvoiceDialog.tsx`: Draft invoice editor modal.
  - `RecordPaymentDialog.tsx`: Payment logging modal with outstanding balance card and date presets.
  - `InvoiceDetailView.tsx`: Full invoice detail pane with status badge, item list, payment history timeline, and print/PDF trigger.
- Shared Design System Upgrades:
  - `Button.tsx`: Added `default` and `outline` variant aliases.
  - `Dialog.tsx`: Exported `DialogContent`, `DialogHeader`, `DialogTitle` subcomponents.
  - `globals.css`: Added cross-browser `.no-scrollbar` utility.
  - Generous modal padding (`p-6 sm:p-8`), `max-w-4xl` width, and clean card spacing.

**Auto-Seeding & Database Safety (`apps/api/src/db/seed.ts`)**
- Added `ensureDefaultWorkspace()` helper to auto-seed mock workspace `550e8400-e29b-41d4-a716-446655440000` and owner member record on server start.
- Enhanced foreign key error messages (`23503`) to guide developers if database tables require `pnpm --filter @repo/database db:push`.

---

## Verification & Final Status

- ✅ **API Vitest Suite**: 10 test files passing 100% green across domain repos, services, and route controllers.
- ✅ **TypeScript Typecheck**: Zero type errors in both `@repo/api` and `web`.
- ✅ **Biome Compliance**: Clean formatting and zero unresolved lint warnings.
- ✅ **Manual E2E Flow Verified**: Successfully tested full invoice lifecycle (`Draft` → `Sent` → `Payment` → `Paid`) in browser UI.
