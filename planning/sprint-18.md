# Freelance OS — Sprint 18
# Scope Drift → Change Order Bridge

**Version:** 1.0  
**Status:** Proposed / Ready for Architecture Review  
**Date:** September 16, 2026  
**Depends On:** Sprint 16 — Collaborative AI Scope Studio & Operational Bridge; Sprint 17 — Project Hub & Deliverables Execution Engine

---

## 1. Executive Summary

Sprint 18 extends Freelance OS from **scope-drift detection** to **controlled change-order execution**.

The current product already supports:

```text
Client Brief
    ↓
AI Scope Generation
    ↓
AI Refinement / Manual Editing
    ↓
Scope Confirmation
    ↓
Project + Deposit Invoice
    ↓
Project Hub
    ↓
Scope Drift Detection
```

The current gap is what happens **after Scope Drift Detection identifies legitimate new work**.

Today, the system can analyze a client change request and produce an impact assessment, but it does not yet provide a complete operational path to:

- formally record the approved change,
- add the new work to the active project,
- update the project's operational budget and timeline,
- generate a dedicated change-order invoice,
- preserve the original agreement,
- maintain a traceable change history.

The current audit identifies **Scope Drift → Change Order Bridge** as the next candidate because it builds directly on the existing Scope Drift Engine, Project Hub, project deliverables, and progress invoicing capabilities without requiring a new external payment provider. The audit classifies the prerequisite surface as complete and the implementation risk as low relative to the other current candidates.

Sprint 18 therefore introduces:

> **A controlled workflow for converting an approved scope change into a traceable operational and financial change order.**

The central architectural principle is:

```text
Original Scope
    ↓
Immutable Historical Baseline

Current Project
    ↓
Mutable Operational State

Change Order
    ↓
Explicit, Auditable Modification

Change-Order Invoice
    ↓
Financial Representation of That Modification
```

---

# 2. Problem Statement

Freelancers frequently encounter requests that were not part of the original project scope.

Example:

Original project:

```text
E-commerce Website

Budget: ₹1,00,000
Deadline: September 30

Deliverables:
1. Homepage
2. Product Catalogue
3. Shopping Cart
4. Checkout
5. Testing
```

Mid-project, the client asks:

> "Can you also add WhatsApp notifications for every order?"

The existing Scope Drift engine can determine that this request is outside the original scope and estimate an impact such as:

```text
Additional effort: +8 hours
Budget impact: +₹12,000
Timeline impact: +2 days
Affected areas: Backend + Testing

Recommendation: Negotiate
```

However, without a Change Order workflow, the freelancer still has to manually:

- decide what exactly changes,
- update the project,
- add the new work,
- adjust budget/timeline,
- create a separate invoice,
- preserve the original agreement,
- maintain a historical record.

Sprint 18 automates this transition while preserving human approval.

---

# 3. Product Goal

Turn:

```text
"AI detected scope creep."
```

into:

```text
"AI detected scope creep → freelancer reviewed it → approved change → project updated → extra work added → change-order invoice created."
```

The feature must remain:

- human-in-the-loop,
- financially explicit,
- reversible before approval,
- auditable,
- tenant-safe,
- idempotent,
- independent of the LLM as a financial source of truth.

---

# 4. Core User Journey

## 4.1 Existing Project

The freelancer already has an active project:

```text
Project: E-commerce Website

Original Budget: ₹1,00,000
Original Deadline: 30 Sep

Deliverables:
✓ Homepage
✓ Product Catalogue
↻ Shopping Cart
○ Checkout
○ Testing
```

The confirmed scope is stored as the historical baseline.

Operational execution state is represented by `project_deliverables`.

---

## 4.2 Client Requests a Change

The client says:

> "Can you also add WhatsApp notifications whenever an order is placed?"

The freelancer opens the active Project Hub.

They click:

```text
[ Check Scope Drift ]
```

The existing confirmed scope is automatically selected.

The user submits:

```text
Add WhatsApp order notifications for customers and admins.
```

---

## 4.3 Scope Drift Analysis

The existing Scope Drift engine compares:

```text
Confirmed Scope
        +
Client Change Request
```

Expected result:

```text
Scope Drift Detected

Summary:
WhatsApp order notifications are outside the confirmed scope.

Affected Deliverables:
- Backend
- Testing

Additional Work:
- WhatsApp notification integration
- Notification testing

Estimated Additional Hours:
8h

Estimated Budget Impact:
₹12,000

Timeline Impact:
+2 days

Recommendation:
NEGOTIATE
```

At this stage:

> **NO PROJECT DATA HAS BEEN MODIFIED.**

The analysis is advisory.

---

# 5. Change Order Proposal

After reviewing the drift analysis, the user selects:

```text
[ Generate Change Order ]
```

This creates a **draft change-order proposal**, not an immediate mutation of the active project.

The proposal should display:

```text
CHANGE ORDER #1

Original Project
----------------
Budget:   ₹1,00,000
Deadline: 30 Sep

Requested Change
----------------
WhatsApp Order Notifications

Additional Deliverables
-----------------------
1. WhatsApp Notification Integration
2. Notification Testing

Estimated Additional Effort
---------------------------
8 hours

Budget Impact
-------------
+₹12,000

Timeline Impact
---------------
+2 days

Proposed Project State
----------------------
Budget:   ₹1,12,000
Deadline: 02 Oct

Change-Order Invoice
--------------------
₹12,000
```

The user can review and edit the proposal before approval.

---

# 6. Human Approval

The user explicitly chooses:

```text
[ Approve Change Order ]
```

Only after approval should operational mutations occur.

Before approval:

```text
Confirmed Scope       UNCHANGED
Project Budget        UNCHANGED
Project Deadline      UNCHANGED
Project Deliverables  UNCHANGED
Invoices              UNCHANGED
```

After approval:

```text
Confirmed Scope       UNCHANGED
Project Budget        UPDATED
Project Deadline      UPDATED
Project Deliverables  UPDATED
Change Order          CREATED
Change-Order Invoice  CREATED
Activity Events       EMITTED
```

---

# 7. Critical Data Model Principle

Sprint 18 must **not overwrite the original confirmed scope**.

There are three logically different layers.

## 7.1 Historical Planning Baseline

```text
scope_analyses
```

Represents:

> What was originally analyzed, reviewed, and confirmed.

This is the historical baseline used for Scope Drift comparison.

It must remain intact.

---

## 7.2 Current Operational State

```text
projects
project_deliverables
```

Represents:

> What the freelancer is currently executing.

This state may evolve through approved change orders.

---

## 7.3 Change History

Sprint 18 should introduce a first-class change-order record.

Conceptually:

```text
change_orders
```

Representing:

> Why the active project changed, who approved it, what changed, and what financial/timeline impact was accepted.

---

# 8. Proposed Change Order Data Model

The exact schema must be confirmed against the repository before implementation.

A candidate design:

```text
change_orders
-------------
id
workspace_id
project_id
scope_analysis_id
drift_analysis_id
change_order_number
title
description
status
additional_budget
additional_hours
timeline_delta_days
approved_by_user_id
approved_at
created_at
updated_at
```

Potential status values:

```text
draft
approved
rejected
cancelled
```

Do not add states that do not have a concrete workflow requirement.

---

# 9. Change Order Provenance

Every change order should be traceable to its origin.

Recommended relationship:

```text
Confirmed Scope
      ↓
Drift Analysis
      ↓
Change Order
      ↓
Project Deliverables
      ↓
Change-Order Invoice
```

This provides an audit trail answering:

> Why was this project changed?

Example:

```text
Scope #SC-102
    ↓
Drift Analysis #DR-028
    ↓
Change Order #CO-001
    ↓
+2 Deliverables
    ↓
+₹12,000
    ↓
Invoice INV-2026-0042-CO1
```

---

# 10. Original Scope Must Remain Immutable

The confirmed scope must not be rewritten to reflect later changes.

For example:

### Original Scope

```text
Budget: ₹1,00,000
Deadline: 30 Sep
```

### After Change Order

```text
Project Operational State
Budget: ₹1,12,000
Deadline: 02 Oct
```

The original `scope_analyses.result` continues to represent:

```text
₹1,00,000
30 Sep
```

This allows future analysis to distinguish:

```text
Original agreement
vs.
Approved changes
vs.
Current execution
```

---

# 11. Project Deliverable Changes

An approved change order may introduce new operational deliverables.

Example:

Before:

```text
1. Homepage
2. Product Catalogue
3. Shopping Cart
4. Checkout
5. Testing
```

After Change Order #1:

```text
1. Homepage
2. Product Catalogue
3. Shopping Cart
4. Checkout
5. Testing

Change Order #1
6. WhatsApp Notification Integration
7. Notification Testing
```

The original deliverables should not be recreated.

New deliverables must receive:

- unique UUIDs,
- workspace/project ownership,
- ordering,
- status,
- estimated hours,
- source/change-order provenance.

---

# 12. Deliverable Provenance

Sprint 17 already introduced `sourceScopeId`.

Sprint 18 should preserve this provenance and, where needed, introduce change-order provenance.

Conceptually:

```text
Original scope deliverable
    source_scope_id = SC-102
    change_order_id = NULL
```

New change-order deliverable:

```text
change_order_id = CO-001
source_scope_id = NULL or original scope reference
```

The exact field strategy must be finalized during schema design.

The objective is to answer:

> Was this deliverable part of the original scope or added later?

---

# 13. Project Budget Update

The project budget is an operational value.

Example:

```text
Current Project Budget:
₹1,00,000

Change Order #1:
+₹12,000

New Operational Budget:
₹1,12,000
```

The update must be server-authoritative.

Do not trust:

```text
newBudget
```

sent from the browser.

The backend calculates the resulting budget from authoritative values.

---

# 14. Timeline Update

The same principle applies to project dates.

Example:

```text
Original Target:
30 Sep

Approved Change:
+2 days

New Target:
02 Oct
```

The exact date calculation should use the project's existing date conventions.

The system must not allow the AI to directly mutate dates.

The AI provides an impact recommendation.

The domain service performs the actual mutation after approval.

---

# 15. Change-Order Invoice

The change order should create a **separate invoice**.

Do not modify the original deposit invoice.

Example:

```text
Original Project
----------------
Deposit Invoice
INV-2026-001
₹50,000

Change Order #1
----------------
INV-2026-004-CO1
₹12,000
```

This makes financial history explicit.

---

# 16. Progress vs Change-Order Invoices

Sprint 17 already supports progress invoicing.

Sprint 18 must keep the concepts distinct:

### Progress Invoice

Bills already planned project work.

```text
Completed Deliverables
        ↓
Progress Invoice
```

### Change-Order Invoice

Bills additional approved work.

```text
Approved Change Order
        ↓
Change-Order Invoice
```

Do not merge these into a single ambiguous billing mechanism.

---

# 17. Suggested Change-Order Invoice Workflow

```text
Generate Change Order
        ↓
Review Proposal
        ↓
Approve Change Order
        ↓
Calculate Additional Amount
        ↓
Create Change-Order Invoice
        ↓
Add New Deliverables
        ↓
Update Project Budget
        ↓
Update Project Timeline
```

The exact order should be implemented using the chosen transaction/compensation model.

---

# 18. Change Order UI

The existing `DriftAnalysisModal` should be extended or followed by a dedicated change-order review surface.

Suggested flow:

```text
┌──────────────────────────────────────────────┐
│ Scope Drift Detected                        │
├──────────────────────────────────────────────┤
│ Request                                     │
│ "Add WhatsApp notifications"                │
│                                              │
│ Impact                                      │
│ +8 hours                                    │
│ +₹12,000                                    │
│ +2 days                                     │
│                                              │
│ Recommendation: NEGOTIATE                   │
│                                              │
│ [ Generate Change Order ]                   │
└──────────────────────────────────────────────┘
```

Then:

```text
┌──────────────────────────────────────────────┐
│ Change Order #1                              │
├──────────────────────────────────────────────┤
│ Additional Work                              │
│ ✓ WhatsApp Notification Integration          │
│ ✓ Notification Testing                       │
│                                              │
│ Additional Hours: 8h                        │
│ Budget Increase: ₹12,000                    │
│ Timeline Increase: +2 days                  │
│                                              │
│ New Budget: ₹1,12,000                       │
│ New Deadline: 2 Oct                         │
│                                              │
│ Change-Order Invoice: ₹12,000               │
│                                              │
│ [ Cancel ]       [ Approve Change Order ]   │
└──────────────────────────────────────────────┘
```

---

# 19. What Happens If User Rejects the Change?

Nothing in the project should change.

Result:

```text
Change Order
status = rejected

Project Budget
unchanged

Project Deadline
unchanged

Project Deliverables
unchanged

Invoices
unchanged
```

The drift analysis remains as historical analysis.

---

# 20. What Happens If User Cancels the Draft?

Nothing operational should change.

The draft change order may be:

```text
cancelled
```

or may simply not be persisted until an explicit "Generate Change Order" action.

The implementation must decide which model produces the cleanest audit trail.

---

# 21. What Happens If Invoice Creation Fails?

This is a critical failure path.

Example:

```text
Change Order approved
        ↓
Project budget updated
        ↓
Invoice creation fails
```

The system must not silently leave the project partially updated.

The implementation must choose one of:

### Preferred

Atomic transaction if feasible.

### Otherwise

Compensating rollback.

For example:

```text
Invoice fails
     ↓
Rollback deliverables
Rollback budget
Rollback timeline
Rollback change-order approval
```

or explicitly maintain a safe pending state if the product intentionally supports asynchronous settlement.

Do not accept silent partial state.

---

# 22. Idempotency

Change Order approval must be idempotent.

Potential repeated requests:

```text
User clicks Approve
    ↓
Network timeout
    ↓
User clicks again
```

The system must not produce:

```text
2 change orders
2 invoices
duplicate deliverables
double budget increase
```

Expected invariant:

```text
One approved change order
→ one operational mutation
→ one change-order invoice
```

unless future product semantics explicitly support multiple billing documents.

---

# 23. Concurrency

Consider:

```text
Request A ─┐
           ├── approve CO-001
Request B ─┘
```

Only one should succeed.

The losing request should receive an appropriate conflict/idempotent response.

The protection must be server/database-side.

---

# 24. Scope Drift Recommendation vs Change Order Approval

The AI recommendation must remain advisory.

For example:

```text
AI Recommendation:
NEGOTIATE
```

does not mean:

```text
System automatically modifies project.
```

Instead:

```text
AI Recommendation
        ↓
Human Decision
        ↓
Change Order Approval
        ↓
Domain Mutation
```

This preserves human authority.

---

# 25. AI Responsibility

The AI can propose:

- affected deliverables,
- new deliverables,
- additional hours,
- budget impact estimate,
- timeline impact estimate,
- rationale,
- confidence.

The AI must NOT be the final authority for:

- actual project budget,
- invoice amount,
- project target date,
- authorization,
- database writes.

The TypeScript domain layer remains authoritative.

---

# 26. Security Requirements

All Change Order endpoints must enforce:

### Workspace isolation

A user cannot access or mutate:

```text
workspace B
```

using a workspace A session.

### Project/scope relationship

The supplied project must belong to:

```text
workspaceId
```

and the drift analysis must belong to the same project/scope context.

### Scope confirmation

Change Orders should be based on a confirmed scope.

### RBAC

At minimum, evaluate:

```text
viewer  → read only
editor  → operational mutation
owner   → full permitted mutation
```

The final permission matrix should reuse the existing project/AI RBAC architecture.

---

# 27. Database Integrity

Enforce relationships such as:

```text
change_order.workspace_id
    → workspace

change_order.project_id
    → project

change_order.scope_analysis_id
    → scope analysis

change_order.drift_analysis_id
    → drift analysis
```

Use foreign keys and indexes appropriate to the repository.

Do not depend solely on frontend validation.

---

# 28. Activity / Audit Trail

Change-order operations must be visible in the audit trail.

Potential events:

```text
project.change_order.created
project.change_order.approved
project.change_order.rejected
project.change_order.cancelled
project.change_order.invoice_created
project.change_order.applied
```

Use the existing naming conventions.

The events should include:

- actor
- workspace
- project
- change-order ID
- relevant invoice ID
- budget delta
- timeline delta

Activity persistence must remain non-blocking to the primary business operation.

---

# 29. Project Hub Integration

The Project Hub should surface change-order history.

Example:

```text
Project Hub

Budget
₹1,19,000

Original Budget
₹1,00,000

Approved Changes
₹19,000
```

Potential section:

```text
Change Orders

CO-001
WhatsApp Notifications
Approved
+₹12,000
+2 days

CO-002
Apple Pay
Approved
+₹7,000
+1 day
```

This gives the freelancer a clear explanation of how the current project state differs from the original agreement.

---

# 30. Change Order History

A future-proof history view can look like:

```text
Original Scope
₹1,00,000
30 Sep
        ↓
CO-001
+₹12,000
+2 days
        ↓
CO-002
+₹7,000
+1 day
        ↓
Current Project
₹1,19,000
03 Oct
```

This is valuable for:

- project transparency,
- billing,
- dispute resolution,
- future AI analytics,
- client communication.

---

# 31. Data Model: Recommended Logical Relationships

```text
workspace
   │
   ├── scope_analysis
   │       │
   │       └── drift_analysis
   │                │
   │                └── change_order
   │                         │
   │                         ├── project
   │                         │      └── project_deliverables
   │                         │
   │                         └── invoice
   │                                └── invoice_items
   │
   └── activity_events
```

The exact schema must be verified against existing database conventions before implementation.

---

# 32. API Surface

The final endpoint design should be consistent with the existing REST conventions.

Potential endpoints:

```text
POST   /workspaces/:workspaceId/projects/:projectId/change-orders
GET    /workspaces/:workspaceId/projects/:projectId/change-orders
GET    /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId

POST   /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId/approve
POST   /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId/reject
POST   /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId/cancel
```

The exact route naming should be chosen during architecture reconnaissance.

Avoid exposing raw AI-service endpoints directly to the browser.

---

# 33. Backend Domain Responsibilities

Create a dedicated Change Order domain/service rather than putting all logic into controllers.

Possible responsibilities:

```text
createDraft()
getById()
listByProject()
approve()
reject()
cancel()
buildInvoice()
applyToProject()
```

The service should coordinate:

```text
Drift Analysis
Project
Project Deliverables
Invoice
Activity
```

while preserving existing domain boundaries.

---

# 34. Financial Calculation Strategy

The preferred model for Sprint 18 is:

```text
Change Order
    ↓
Explicit line items / additional deliverables
    ↓
Additional amount
    ↓
Change-order invoice
```

If additional work maps to hours:

```text
Price = deterministic domain calculation
```

The AI's budget estimate can be displayed as a proposal, but final amount must be validated/recalculated by the backend.

Rounding must use the existing exact-money strategy.

---

# 35. Timeline Calculation Strategy

Similarly:

```text
AI estimate
    ↓
Human review
    ↓
Backend validates
    ↓
Project target date updated
```

Do not blindly accept:

```text
timeline_delta_days
```

without validating:

- numeric range,
- project dates,
- timezone/date conventions,
- existing completed work,
- existing target date.

---

# 36. Testing Requirements

Sprint 18 requires more than happy-path tests.

## Unit tests

Test:

- proposal construction,
- validation,
- status transitions,
- financial calculation,
- timeline calculation,
- permissions,
- relationship validation.

## Integration tests

Test:

```text
Drift Analysis
→ Change Order
→ Project mutation
→ Deliverable creation
→ Invoice creation
```

## Concurrency tests

Test:

```text
two approval requests
```

and:

```text
two invoice creation requests
```

## Failure tests

Test:

```text
invoice failure
deliverable creation failure
project update failure
scope relationship failure
activity failure
network timeout
```

## Tenant isolation

Test:

```text
workspace A
vs
workspace B
```

## E2E

Full user journey:

```text
Project
 ↓
Scope Drift
 ↓
Review
 ↓
Generate Change Order
 ↓
Review proposal
 ↓
Approve
 ↓
Project updated
 ↓
New deliverables visible
 ↓
Change-order invoice visible
 ↓
Activity event visible
```

---

# 37. Acceptance Criteria

Sprint 18 should not be considered complete until:

## Detection

- [ ] Scope Drift launches from Project Hub.
- [ ] Confirmed baseline scope is automatically used.
- [ ] AI impact analysis is shown.

## Proposal

- [ ] User can generate a Change Order proposal.
- [ ] Proposal clearly shows scope delta.
- [ ] Proposal shows budget delta.
- [ ] Proposal shows timeline delta.
- [ ] Proposal shows new/affected deliverables.

## Approval

- [ ] User explicitly approves the Change Order.
- [ ] Approval is RBAC-protected.
- [ ] Approval is idempotent.
- [ ] Concurrent approvals cannot duplicate the change.

## Project

- [ ] New operational deliverables are created.
- [ ] Existing deliverables remain intact.
- [ ] Project budget is updated server-side.
- [ ] Project timeline is updated server-side.
- [ ] Original confirmed scope remains unchanged.

## Financials

- [ ] Separate Change-Order Invoice is created.
- [ ] Original invoices remain unchanged.
- [ ] Exact financial calculations are server-authoritative.
- [ ] Duplicate billing is prevented.
- [ ] Failed invoice creation does not leave silent partial state.

## Audit

- [ ] Change Order is stored.
- [ ] Approval/rejection is stored.
- [ ] Invoice linkage is stored.
- [ ] Activity events are generated.
- [ ] Actor/workspace information is preserved.

## Security

- [ ] Tenant isolation.
- [ ] RBAC.
- [ ] No IDOR.
- [ ] Valid scope/project relationship.
- [ ] Confirmed baseline required.

## Testing

- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Concurrency tests.
- [ ] Failure-path tests.
- [ ] E2E test.
- [ ] `pnpm lint`.
- [ ] `pnpm typecheck`.
- [ ] `pnpm test`.
- [ ] `pnpm build`.

---

# 38. Example: Full Real-World Flow

## Initial State

```text
Project: E-commerce Website

Budget: ₹1,00,000
Deadline: 30 Sep

Deliverables:
✓ Homepage
✓ Product Catalogue
↻ Shopping Cart
○ Checkout
○ Testing
```

## Client Request

> "Please add WhatsApp order notifications."

## Drift Analysis

```text
Recommendation: NEGOTIATE

Additional Hours: 8h
Budget Impact: ₹12,000
Timeline Impact: +2 days
```

## Change Order Draft

```text
CO-001

Additional Deliverables:
- WhatsApp Notification Integration
- Notification Testing

Additional Budget:
₹12,000

Additional Timeline:
+2 days
```

## User Approval

```text
[ Approve Change Order ]
```

## New Operational State

```text
Project Budget:
₹1,12,000

Deadline:
02 Oct

Deliverables:
✓ Homepage
✓ Product Catalogue
↻ Shopping Cart
○ Checkout
○ Testing

CO-001:
○ WhatsApp Notification Integration
○ Notification Testing
```

## Financial State

```text
Original Invoices
unchanged

CO Invoice:
INV-2026-0042-CO1
₹12,000
```

## Historical State

```text
Original Confirmed Scope:
₹1,00,000
30 Sep

Change History:
CO-001
+₹12,000
+2 days
```

This is the intended behavior.

---

# 39. Explicit Non-Goals

Sprint 18 should NOT include:

```text
Stripe Checkout
Public Client Portal
Full CRM
Full accounting system
General task-management platform
Advanced time tracking
Automatic client negotiation
Fully autonomous scope approval
New vector database
New LLM provider
New agent framework
```

Those can be considered in later roadmap work.

---

# 40. Architectural Principles

Sprint 18 must preserve these principles:

### Principle 1 — Historical truth

Original confirmed scope remains intact.

### Principle 2 — Operational truth

Project and project deliverables represent current execution state.

### Principle 3 — Financial truth

Invoice and budget calculations are backend/domain authoritative.

### Principle 4 — AI is advisory

AI proposes impact; humans approve business consequences.

### Principle 5 — Explicit change

No hidden project modifications.

### Principle 6 — Full traceability

Every approved change should be explainable.

### Principle 7 — Idempotent mutation

Repeated requests must not duplicate project changes or invoices.

### Principle 8 — Tenant isolation

Every query and mutation remains workspace scoped.

---

# 41. Recommended Implementation Phases

## Phase 0 — Repository Reconnaissance

Inspect:

- current Drift engine,
- Project Hub,
- deliverable domain,
- InvoiceService,
- ActivityBus,
- existing migrations,
- RBAC patterns.

**Stop for review.**

## Phase 1 — Architecture Decision

Finalize:

- `change_orders` schema,
- status model,
- provenance,
- financial model,
- transaction/compensation strategy.

**Stop for review.**

## Phase 2 — Database

Implement:

- migration,
- schema,
- indexes,
- foreign keys.

Run tests.

**Stop for review.**

## Phase 3 — Change Order Domain

Implement:

- repository,
- service,
- schemas,
- permissions,
- approval workflow.

Run tests.

**Stop for review.**

## Phase 4 — Project Mutation Bridge

Connect approved change orders to:

- project budget,
- project dates,
- project deliverables.

Run integration tests.

**Stop for review.**

## Phase 5 — Invoice Bridge

Create Change-Order Invoice using existing invoice domain rules.

Run financial tests.

**Stop for review.**

## Phase 6 — Frontend

Add:

- Generate Change Order,
- proposal review,
- approval,
- history,
- Project Hub integration.

Run web tests.

**Stop for review.**

## Phase 7 — Activity

Wire Change Order events.

Run audit tests.

**Stop for review.**

## Phase 8 — Security / Concurrency

Run:

- RBAC,
- IDOR,
- duplicate approval,
- concurrent approval,
- concurrent billing,
- failure-path tests.

**Stop for review.**

## Phase 9 — E2E

Run the complete workflow.

**Stop for review.**

## Phase 10 — Production Readiness

Run:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Verify deployment configuration and documentation.

Only then mark Sprint 18 complete.

---

# 42. Final Definition of Done

Sprint 18 is complete when the product can demonstrate:

```text
Client asks for extra work
        ↓
Freelancer runs Scope Drift
        ↓
AI explains the impact
        ↓
Freelancer generates Change Order
        ↓
Freelancer reviews the proposal
        ↓
Freelancer approves
        ↓
Project operational state changes
        ↓
New deliverables appear
        ↓
Budget and timeline update
        ↓
Separate Change-Order Invoice created
        ↓
Activity history records the change
        ↓
Original Scope remains intact
```

The desired user experience is:

> **"I never have to manually reconcile scope creep with my project and invoices again."**

The system should make the relationship between the original agreement, current project state, approved change, and resulting invoice explicit and traceable.
