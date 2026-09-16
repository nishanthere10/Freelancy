# Sprint 17: Project Hub & Deliverables Execution Engine — Architectural Deep Dive

**Version:** 1.0  
**Date:** September 13, 2026  
**Audience:** Technical Leadership, Engineers, and Product Stakeholders  
**Architecture Pattern:** Normalized Operational Projections + Atomic Sagas + In-Context AI Intelligence  

---

## 1. The Core Breakdown: The Post-Conversion Operational Void

### Symptom & User Impact
Prior to Sprint 17, Freelance OS successfully generated, refined, and converted AI scopes into projects (`POST /ai/scope/:id/convert`). However, immediately upon redirecting to `/workspaces/[id]/projects/[id]`, **the operational journey hit a dead end**:
1. Freelancers were presented with a static 3-card overview displaying only project dates and a raw text block.
2. The detailed deliverables crafted in the AI Scope Studio (hours, complexity, descriptions) were **completely inaccessible** for active tracking.
3. Upfront deposit invoices created during conversion were disconnected and invisible on the project page.
4. Scope Drift Detection could only be run from the standalone AI page, forcing freelancers to manually re-select scopes rather than evaluating change requests directly inside their active project.

```mermaid
flowchart TD
    subgraph S16_Flow ["Sprint 16 State (Operational Dead End)"]
        A[Client Brief] --> B[AI Scope Studio]
        B --> C[Confirm Scope]
        C --> D[Convert to Project]
        D --> E[projects Table Created]
        D --> F[scope_analyses.project_id linked]
        D -.-> G[Deposit Invoice Created]
        E --> H[ProjectDetail.tsx - Static Card]
        B -. Deliverables Locked In JSONB .-> I[scope_analyses.result]
        H -. Cannot Track Deliverables .-> I
        H -. No Visibility .-> G
        H -. No In-Context Launch .-> J[Scope Drift Engine]
    end
```

### Root Cause & Technical Collision
The root cause was an **architectural mismatch between planning artifacts and operational entities**:
- **Expected State**: A converted project is a living workspace. Its milestones have discrete statuses (`pending`, `in_progress`, `completed`), tracked hours, billing states, and audit trails.
- **Actual State**: Deliverables existed solely as raw objects within `scope_analyses.result` (a JSONB column). They had no database IDs, no independent timestamps, no row-level locks, and no referential integrity. Mutating them to track progress would overwrite the contractual baseline needed for Scope Drift analysis.

---

## 2. The Architectural Fix: End-to-End Implementation Blueprint

Sprint 17 introduces the **Project Hub & Deliverables Execution Engine**, transforming the project page from an informational view into a central command center:

```mermaid
flowchart TD
    subgraph Project_Hub ["Centralized Project Hub Workspace"]
        direction TB
        PH[Project Detail: /projects/:projectId]
        
        subgraph Layer_Deliverables ["Deliverables Execution Engine"]
            D1[Milestones Checklist]
            D2[Status: Pending / In Progress / Completed]
            D3[Hours: Estimated vs. Logged]
            D4[Deterministic Progress Bar]
        end

        subgraph Layer_Financials ["Financial Engine & Invoicing"]
            F1[Budget Overview]
            F2[Total Invoiced vs. Total Paid]
            F3[Linked Deposit Invoice]
            F4[Itemized Progress Invoice Modal]
        end

        subgraph Layer_AI ["AI Scope Intelligence"]
            A1[Confirmed Scope Baseline]
            A2[Embedded 'Check Scope Drift' Button]
            A3[Automated Scope Context Injection]
        end

        PH --> Layer_Deliverables
        PH --> Layer_Financials
        PH --> Layer_AI
    end
```

---

### A. Persistence Layer: Normalized `project_deliverables`

Rather than mutating immutable historical JSON, operational deliverables are normalized into a dedicated table:

```mermaid
erDiagram
    WORKSPACES ||--o{ PROJECTS : owns
    WORKSPACES ||--o{ PROJECT_DELIVERABLES : isolates
    PROJECTS ||--o{ PROJECT_DELIVERABLES : contains
    SCOPE_ANALYSES ||--o{ PROJECT_DELIVERABLES : origin_provenance
    INVOICES ||--o{ PROJECT_DELIVERABLES : bills

    PROJECT_DELIVERABLES {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        varchar title
        text description
        numeric estimated_hours
        numeric logged_hours
        varchar complexity
        project_deliverable_status status
        int position
        uuid source_scope_id FK
        uuid invoice_id FK
        timestamptz billed_at
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECTS {
        uuid id PK
        uuid workspace_id FK
        varchar name
        varchar status
        numeric budget_amount
        varchar budget_currency
    }

    SCOPE_ANALYSES {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        jsonb result "Immutable Baseline"
        timestamptz confirmed_at
    }

    INVOICES {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        varchar invoice_number
        numeric total_amount
        varchar status
    }
```

#### Key Relational Invariants:
1. **Tenant Isolation**: Enforced by composite foreign key `(workspace_id, project_id) REFERENCES projects(workspace_id, id) ON DELETE CASCADE`. Deliverables cannot cross workspace boundaries.
2. **Provenance**: `source_scope_id` points to `scope_analyses(id) ON DELETE SET NULL`, preserving traceability back to the AI prompt.
3. **Billing Lock**: `billed_at` and `invoice_id` track progress billing, preventing double-invoicing.

---

### B. Conversion Engine: Atomic Scope Claim & Compensating Saga

To prevent race conditions where double-clicking "Convert to Project" creates duplicate projects and invoices, conversion utilizes an **Atomic Claim + Compensating Saga**:

```mermaid
sequenceDiagram
    autonumber
    actor User as Freelancer (Web Client)
    participant API as POST /scope/:id/convert
    participant DB as Neon PostgreSQL
    participant PS as ProjectService
    participant IS as InvoiceService

    User->>API: Click "Convert to Live Project"
    
    rect rgb(240, 248, 255)
        Note over API,DB: Step 1: Atomic Concurrency Barrier (CAS)
        API->>DB: UPDATE scope_analyses SET project_id = placeholder WHERE id = :id AND project_id IS NULL AND confirmed_at IS NOT NULL
        alt 0 rows updated (Already claimed / converted)
            DB-->>API: 0 rows
            API-->>User: 409 ALREADY_CONVERTED (Abort)
        else 1 row updated (Exclusive lock acquired)
            DB-->>API: 1 row claimed
        end
    end

    rect rgb(255, 250, 240)
        Note over API,PS: Step 2: Project Creation
        API->>PS: createProject({ name, budget, client })
        alt Project creation fails
            PS-->>API: Error
            API->>DB: UPDATE scope_analyses SET project_id = NULL (Release claim)
            API-->>User: 400 Bad Request
        else Project created successfully
            PS-->>API: project_123
        end
    end

    rect rgb(240, 255, 240)
        Note over API,DB: Step 3: Deliverable Materialization
        API->>DB: INSERT INTO project_deliverables (batch from scope.result.deliverables)
        alt Deliverable insert fails (Case A)
            DB-->>API: Error
            API->>PS: deleteProject(project_123) [Compensating Rollback]
            API->>DB: UPDATE scope_analyses SET project_id = NULL
            API-->>User: 500 DELIVERABLE_MATERIALIZATION_FAILED
        else Deliverables created
            DB-->>API: [deliv_1, deliv_2, deliv_3]
        end
    end

    rect rgb(255, 245, 245)
        Note over API,IS: Step 4: Optional Deposit Invoice
        opt depositPercentage > 0
            API->>IS: createInvoice({ projectId: project_123, items, ... })
            alt Invoice creation fails (Case B)
                IS-->>API: Error
                API->>DB: DELETE FROM project_deliverables WHERE project_id = project_123 [Rollback]
                API->>PS: deleteProject(project_123) [Rollback]
                API->>DB: UPDATE scope_analyses SET project_id = NULL
                API-->>User: 400 INVOICE_CREATION_FAILED
            else Invoice created
                IS-->>API: inv_123
            end
        end
    end

    rect rgb(245, 245, 255)
        Note over API,DB: Step 5: Finalize Scope Link
        API->>DB: UPDATE scope_analyses SET project_id = project_123.id
        API-->>User: 201 Created { project, invoice, deliverables }
    end
```

---

### C. Financials & Progress Invoicing: Itemized Completed-Deliverable Billing

Freelancers generate cash flow during delivery by billing completed milestones:

```mermaid
sequenceDiagram
    autonumber
    actor User as Freelancer
    participant UI as Project Hub UI
    participant API as POST /projects/:id/invoices/progress
    participant DB as Neon PostgreSQL
    participant IS as InvoiceService

    User->>UI: Select completed deliverables (e.g. Deliv A, Deliv B)
    UI->>UI: Preview itemized total & exact penny rounding
    User->>UI: Click "Create Progress Invoice"
    UI->>API: POST { deliverableIds: [A, B], dueDate, taxRate, discountRate }

    API->>DB: SELECT * FROM project_deliverables WHERE id IN (A, B) AND project_id = :pId
    
    rect rgb(255, 240, 240)
        Note over API: Validation & Eligibility Checks
        API->>API: Verify all deliverables status == 'completed'
        API->>API: Verify all deliverables billed_at IS NULL
    end

    rect rgb(240, 255, 240)
        Note over API: Server-Authoritative Itemization
        API->>API: Map each deliverable into invoice item (unitPrice = hours / totalHours * budget)
        API->>IS: createInvoice({ projectId, clientId, items, taxRate, discountRate })
        IS-->>API: invoice_456
    end

    rect rgb(240, 248, 255)
        Note over API,DB: Atomic Billing Lock (Race Prevention)
        API->>DB: UPDATE project_deliverables SET billed_at = NOW(), invoice_id = invoice_456.id WHERE id IN (A, B) AND billed_at IS NULL
        alt Updated count != 2 (Concurrent request billed one of them)
            DB-->>API: Row count mismatch
            API->>IS: deleteInvoice(invoice_456) [Compensating Rollback]
            API-->>UI: 409 DELIVERABLE_ALREADY_BILLED
        else Updated count == 2
            DB-->>API: Success
            API-->>UI: 201 Created { invoice: invoice_456 }
        end
    end
```

---

### D. In-Context Scope Drift Architecture

```mermaid
flowchart LR
    subgraph UI ["Project Hub"]
        Btn["Click 'Check Scope Drift'"]
    end

    subgraph Modal ["DriftAnalysisModal"]
        Input["Change Request Input: 'Add automated SMS alerts'"]
        Engine["POST /ai/drift"]
    end

    subgraph Backend ["Existing AI Engine (Sprint 11)"]
        ScopeRef["Fetch Confirmed Scope via scope_analyses.project_id"]
        Groq["Groq LLM: Drift & Complexity Evaluation"]
        Verdict["Drift Verdict: Major Scope Drift (+14h, $1,200)"]
    end

    Btn -->|Auto-inject scopeAnalysisId| Modal
    Input --> Engine
    Engine --> ScopeRef
    ScopeRef --> Groq
    Groq --> Verdict
    Verdict -->|Display impact| Modal
```

---

## 3. Concrete Advantages: Why This Architecture Works Best

1. **Immutable AI Baseline Preserved**:
   The confirmed scope (`scope_analyses.result`) remains an unblemished legal contract. Project deliverables can be edited, completed, re-scoped, or split without corrupting the historical baseline needed for Scope Drift evaluation.
2. **Zero Concurrent Lost Updates**:
   Because each deliverable is an indexed row in PostgreSQL, concurrent requests (e.g., logging time while ticking completed) utilize row-level locks. In JSONB, one request would overwrite the other's entire payload.
3. **Atomic Billing Guarantees**:
   The atomic conditional check (`WHERE id IN (...) AND billed_at IS NULL`) physically prevents double-billing a deliverable, even if two tabs submit the invoice simultaneously.
4. **Server-Authoritative Financials**:
   The frontend merely provides an ergonomic preview; all subtotals, sequence numbers, taxes, discounts, and rounding are computed by `InvoiceService` with penny-exact precision.
5. **Zero-Mutation Reads**:
   `GET /projects/:projectId` is 100% read-only. Legacy project backfills are strictly decoupled into an explicit administrative CLI script and an explicit POST action, preventing side-effect bugs on query requests.

---

## 4. Real Tradeoffs & Limitations

1. **Schema Migration Required**:
   Requires `0008_add_project_deliverables.sql` and migration tracking in Neon PostgreSQL.
2. **Compensating Saga Complexity**:
   Because `neon-http` executes stateless fetch requests across separate micro-services (Projects, Invoices, AI), transactions that fail midway require explicit compensating rollbacks (`deleteProject`, releasing scope claims) rather than a single database-level `ROLLBACK`.
3. **Overrun Support Over Strict Budget Gating**:
   `loggedHours > estimatedHours` is intentionally allowed without hard blocking. Freelancers need the ability to record reality (+4h overrun) rather than being stopped by the software.

---

## 5. Alternative Approaches Evaluated

| Approach | Concept | Fatal Flaw / Why Rejected |
| :--- | :--- | :--- |
| **Option A: Scope JSONB** | Mutate `scope_analyses.result.deliverables[]` during execution. | Destroys the immutable contract baseline; breaks Scope Drift; prone to concurrent lost updates. |
| **Option A2: Project JSONB** | Add a `deliverables` JSON column to `projects`. | Solves baseline mutation, but still suffers from full-row read-modify-write collisions and cannot establish foreign keys from `invoice_items`. |
| **Option B (Chosen Path)** | **Normalized `project_deliverables` relational table.** | **Guarantees stable IDs, row-level locking, atomic progress billing, strict tenant isolation, and future change-order extensibility.** |

---

## 6. Implementation Checklist & Verification Gates

```text
[ ] Phase 2: Apply migration 0008_add_project_deliverables.sql to Neon DB
[ ] Phase 3: Implement ProjectDeliverableRepository & ProjectDeliverableService
[ ] Phase 4: Wire deliverables REST endpoints into ProjectController & Routes
[ ] Phase 5: Extend ai.service.ts convertScopeToProject with Atomic Claim & Rollback Saga
[ ] Phase 6: Implement Itemized Progress Invoicing with atomic billed_at locking
[ ] Phase 7: Add backfill script for pre-Sprint-17 legacy projects
[ ] Phase 8: Rebuild ProjectDetail.tsx into the Project Hub with in-context Scope Drift
[ ] Phase 9: Run Concurrency & Rollback Vitest Suites
[ ] Phase 10: Verify Monorepo Quality Gates (Lint, Typecheck, Test, Build)
```
