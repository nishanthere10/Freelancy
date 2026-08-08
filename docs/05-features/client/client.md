# Client Management Feature Documentation

**Version:** 1.0
**Last Updated:** August 8, 2026
**Status:** Pre-Implementation Specification
**Owner:** Product Team
**Sprint:** Sprint 2

---

## Document Purpose

This document is **Part 1 of 3** in the Client Domain Specification.

| Document | Contents |
|----------|----------|
| `client.md` (this file) | Product spec: features, UX flows, personas, acceptance criteria |
| `client-design.md` | Engineering design: architecture, domain model, file structure |
| `client-api.md` | API specification: endpoints, request/response schemas, error codes |

---

## Architectural Context

The Client domain is the **second vertical slice** of Freelance OS.

It must follow the same architectural pattern as the Workspace domain — the first validated vertical slice. Any deviation from the Workspace architecture requires explicit justification.

The domain hierarchy is:

```
User
 └── Workspace (Sprint 1 — complete)
      └── Client (Sprint 2 — this document)
           └── Project (Sprint 3)
                └── Invoice (Sprint 4)
```

Clients live inside a Workspace. Every client record is owned by exactly one workspace. This enforces data isolation between different users and future agency teams.

---

## Product Overview

### What Is a Client?

A client is a **person or company that a freelancer works for**. They are the source of projects, the recipient of deliverables, and the payer of invoices.

In Freelance OS, a client is a **persistent contact record** that spans multiple projects. It is the anchor point for:
- Project history
- Invoice history
- Revenue tracking
- Relationship intelligence (AI-assisted, future)

### Why We Need a Client Entity

Before the Client domain, projects and invoices exist in a void. There is no way to:
- See all projects for a specific company
- Track total revenue per client
- Manage contact information without duplication
- Build the "AI remembers this client" capability

The Client entity enables the full project lifecycle described in `business-workflows.md` — particularly the **Client Relationship Workflow** (Section 5).

---

## MVP Scope

### Included in MVP

| Feature | Priority |
|---------|----------|
| Create a client (name, email, phone, company) | P0 — Must Have |
| List all clients in a workspace | P0 — Must Have |
| View client detail (contact info + project list) | P0 — Must Have |
| Edit client information | P0 — Must Have |
| Soft-delete (archive) a client | P1 — Should Have |
| Restore archived client | P1 — Should Have |
| India-specific fields (GST number, city, state) | P1 — Should Have |
| Client status (active / inactive / archived) | P1 — Should Have |

### Explicitly NOT in MVP

| Feature | Rationale |
|---------|-----------|
| Client portal / public project view | Requires auth system for clients — V2 |
| Two-way client messaging | Requires communication system — V3 |
| Client invitation / login | Requires separate auth flow — V2 |
| AI-powered client health score | Requires historical data — V2 |
| Client-level revenue analytics | Requires invoice data — available after Sprint 4 |
| Bulk import from CSV | Nice-to-have, not blocking — V2 |
| Client merge / deduplication | Requires usage data — V2 |

---

## Data Model Overview

A client record captures:

### Core Identity

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Required. Person or company display name |
| `email` | string | Required. Primary contact email (unique within workspace) |
| `phone` | string | Optional |
| `website` | string | Optional. Company website URL |

### Company Information

| Field | Type | Notes |
|-------|------|-------|
| `companyName` | string | Optional. Legal company name if different from `name` |
| `gstNumber` | string | Optional. Client's GST registration number (India B2B invoicing) |
| `contactPerson` | string | Optional. Primary contact person if `name` is a company |
| `department` | string | Optional. Department within a company |

### Address (India-First)

| Field | Type | Notes |
|-------|------|-------|
| `address` | string | Optional. Street address |
| `city` | string | Optional |
| `state` | string | Optional. Required for correct GST calculation |
| `postalCode` | string | Optional |
| `country` | string | Defaults to `IN` (India) |

> **GST Note:** The `state` field is critical for correct GST type calculation (CGST+SGST for intra-state vs. IGST for inter-state). The invoicing feature in Sprint 4 will use the client's state and the workspace owner's state to determine which tax type applies.

### Lifecycle

| Field | Type | Notes |
|-------|------|-------|
| `status` | enum | `active` \| `inactive` \| `archived`. Default: `active` |
| `workspaceId` | UUID | Foreign key. Enforces data isolation |
| `createdAt` | timestamp | Audit column |
| `updatedAt` | timestamp | Audit column |
| `createdBy` | UUID | Audit column |
| `updatedBy` | UUID | Audit column |
| `deletedAt` | timestamp | Soft delete. `null` = not deleted |

---

## Status Model

Clients have three statuses. The transitions are:

```
active ──► inactive ──► active    (back and forth)
active ──► archived               (soft delete)
archived ──► active               (restore)
```

| Status | Meaning | Visible in default list? |
|--------|---------|--------------------------|
| `active` | Currently working with this client | ✅ Yes |
| `inactive` | Not currently active but may return | ✅ Yes (with filter) |
| `archived` | Soft-deleted, hidden from normal views | ❌ No |

**Business rule:** A client cannot be hard-deleted if they have associated projects or invoices. The system must enforce soft-delete only for clients with history.

---

## User Flows

### Flow 1: Creating a New Client

**Trigger:** Freelancer wants to add a new client before creating a project for them.

**Entry points:**
- "New Client" button on the Clients list page
- "New Client" option in the command palette (CMD+K)
- (Future) "Create client" shortcut from the New Project flow

**Steps:**

1. User clicks **"+ New Client"**
2. A dialog or slide-over panel opens with the **Create Client form**
3. User fills in required fields: `name`, `email`
4. User optionally fills in: `phone`, `companyName`, `gstNumber`, `state`, `city`
5. User clicks **"Create Client"**
6. System validates input:
   - `name`: required, 1–255 characters
   - `email`: required, valid email format, unique within workspace
   - `gstNumber` (if provided): valid GST format (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`)
7. On success: dialog closes, client appears at top of list, toast: "Client created"
8. On error: inline validation errors shown beneath each field

**Empty state after creation:**

Client detail page shows:
```
No projects yet.
[Create First Project for {Client Name}]
```

---

### Flow 2: Viewing the Client List

**URL:** `/clients`

**Default view:** Active clients, sorted by most recently updated.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ Clients                              [+ New Client] │
│                                                      │
│ [Active ▼]  Search clients...         [3 clients]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 🏢 Acme Corp          acme@example.com              │
│    3 projects · ₹1,45,000 revenue    [View →]      │
│                                                      │
│ 👤 Priya Mehta         priya@startup.io             │
│    1 project · ₹30,000 revenue       [View →]      │
│                                                      │
│ 🏢 TechStart           info@techstart.in            │
│    2 projects · ₹80,000 revenue      [View →]      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Filters:**
- Status: All / Active / Inactive / Archived
- Search: By name, email, or company name

**Empty state (no clients):**

```
You haven't added any clients yet.

Clients are the companies and people you work for.
Add a client to get started.

[+ Add Your First Client]
```

---

### Flow 3: Viewing a Client

**URL:** `/clients/[id]`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ← Clients   Acme Corp                  [⋮ Actions] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  CONTACT INFORMATION                                 │
│  Email:    acme@example.com                         │
│  Phone:    +91 98765 43210                          │
│  Website:  acmecorp.in                              │
│  GST:      29AABCM1234D1ZX                          │
│  Address:  Koramangala, Bangalore, Karnataka - 560034│
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  PROJECTS (3)                                        │
│                                                      │
│  Website Redesign          Active   ₹45,000         │
│  Mobile App MVP            Active   ₹80,000         │
│  Brand Identity            Done     ₹20,000         │
│                                                      │
│  [+ New Project for Acme Corp]                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  TOTAL REVENUE                         ₹1,45,000    │
│  ACTIVE PROJECTS                               2    │
│  COMPLETED PROJECTS                            1    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Actions menu (⋮):**
- Edit Client
- Mark as Inactive / Mark as Active
- Archive Client (soft delete)

---

### Flow 4: Editing a Client

**Trigger:** User clicks "Edit Client" from the client detail page actions menu.

**Behavior:**
- Opens the same dialog/panel as Create, pre-populated with existing values
- "Update Client" button on submit
- On success: changes reflected immediately, toast: "Client updated"
- Slug is not shown here — clients do not have slugs (only Workspaces do)

---

### Flow 5: Archiving a Client

**Trigger:** User selects "Archive Client" from actions menu.

**Confirmation dialog:**

```
Archive "Acme Corp"?

This will hide the client from your client list.
All projects and invoices will be preserved.
You can restore the client at any time.

[Cancel]  [Archive Client]
```

**After archive:**
- Client disappears from the default list view
- Client's projects and invoices remain intact
- A "Show Archived" filter reveals archived clients
- Archived client detail page shows an "Archived" banner + "Restore" button

---

## Acceptance Criteria

### AC-01: Create Client

- GIVEN a workspace member
- WHEN they submit the create client form with valid name and email
- THEN a client record is created in the workspace
- AND the client appears in the client list
- AND a success toast is shown

### AC-02: Email Uniqueness Within Workspace

- GIVEN a workspace with an existing client `foo@bar.com`
- WHEN a user tries to create another client with `foo@bar.com` in the same workspace
- THEN the system returns a 409 Conflict error
- AND the form shows: "A client with this email already exists in your workspace"

### AC-03: Cross-Workspace Isolation

- GIVEN two workspaces (A and B) that both have a client with email `foo@bar.com`
- WHEN a user in workspace A lists clients
- THEN they only see workspace A's clients
- AND workspace B's clients are never returned

### AC-04: List Defaults to Active

- GIVEN a workspace with 3 active clients and 1 archived client
- WHEN the user navigates to `/clients`
- THEN only the 3 active clients are shown
- AND archived clients are hidden unless filter is set to "Archived"

### AC-05: Edit Client

- GIVEN an existing client
- WHEN the user updates the client name and saves
- THEN the updated name appears immediately
- AND `updatedAt` timestamp is updated
- AND `updatedBy` is set to the acting user's ID

### AC-06: Archive / Restore

- GIVEN an active client
- WHEN the user archives the client
- THEN `deletedAt` is set and `status` becomes `archived`
- AND the client disappears from the default list
- WHEN the user restores the client
- THEN `deletedAt` becomes null and `status` returns to `active`

### AC-07: Cannot Archive Client Without Confirmation

- GIVEN an active client
- WHEN the user clicks "Archive Client"
- THEN a confirmation dialog is shown before any action is taken

---

## India-Specific Requirements

### GST Number Validation

The client's GST number is used for B2B invoice generation. The format must be validated:

**GST Format:** `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`

**Example:** `29AABCM1234D1ZX`

**Breakdown:**
- `29` — State code (Karnataka)
- `AABCM1234D` — PAN number
- `1` — Entity number
- `Z` — Default letter Z
- `X` — Check digit

The first two digits encode the state, which determines whether a transaction is intra-state (CGST+SGST) or inter-state (IGST). This data is stored here and consumed by the invoicing domain in Sprint 4.

---

## Discrepancies Found During Planning

The following discrepancies were identified between documentation and the current codebase.

> [!WARNING]
> **Discrepancy 1:** `drizzle-schema.md` Section 5 describes a `clients.ts` schema file in `packages/database/src/schema/clients.ts`. This file **does not exist** in the actual codebase. The only schema file in `packages/database/src/schema/` is `workspaces.ts`. The client schema must be created during implementation.

> [!NOTE]
> **Discrepancy 2:** `drizzle-schema.md` (v2.0) shows `clientsTable` with a `status` field using `text` type with a comment `// 'active' | 'inactive' | 'archived'`. The Workspace slice uses a proper `pgEnum` for similar status fields (e.g., `workspaceRoleEnum`). During implementation, prefer `pgEnum` for client status to maintain consistency with the established pattern.

> [!NOTE]
> **Discrepancy 3:** `drizzle-schema.md` shows `clientsRelations` referencing `projectsTable`. Since the `projects` domain is Sprint 3, the initial client schema should define the relation but the `projectsTable` import will not be available yet. The relation should be added in a follow-up migration when the projects domain is implemented.

---

## Related Documentation

- [`client-design.md`](./client-design.md) — Engineering architecture and domain design
- [`client-api.md`](./client-api.md) — API endpoints and request/response schemas
- [`workspace.md`](../workspace.md) — The reference vertical slice this domain mirrors
- [`drizzle-schema.md`](../../02-engineering/drizzle-schema.md) — Prescribed database schema (Section 5)
- [`database-design.md`](../../02-engineering/database-design.md) — Normalization and design patterns
- [`business-workflows.md`](../../01-product/business-workflows.md) — Section 5: Client Relationship Workflow

---

**End of Client Feature Documentation (Part 1 of 3)**
