# Freelancy / Freelance OS — Sprint 20 Implementation Specification

**Sprint:** 20  
**Name:** Automation Engine — n8n Orchestration Layer  
**Status:** READY FOR IMPLEMENTATION  
**Depends On:** Sprint 19 — Communication Hub  
**Primary Goal:** Turn Freelancy's business events, schedules, communication channels, and domain services into a safe user-configurable automation system powered by n8n.

---

# 0. Executive Summary

Freelancy has now completed the core operational loop:

```text
AI Scope
   ↓
Scope Confirmation
   ↓
Project Creation
   ↓
Project Hub
   ↓
Deliverables Execution
   ↓
Scope Drift
   ↓
Change Order
   ↓
Invoice
   ↓
Communication
```

Sprint 20 adds the automation layer:

```text
Freelancy Domain Event / Schedule
              ↓
        Automation Trigger
              ↓
       Conditions / Rules
              ↓
             n8n
              ↓
      Actions / Integrations
              ↓
      Freelancy Domain APIs
              ↓
       Email / WhatsApp /
       Future Integrations
              ↓
       Execution + Audit
```

The product objective is:

> **Freelancy should be able to run routine freelance operations automatically without allowing automation infrastructure to bypass Freelancy's business rules.**

---

# 1. Source Baseline

This sprint specification is based on the September 20, 2026 Freelance OS system report.

The report states:

- Sprints 1–19 are complete.
- Sprint 19 Communication Hub is reported as complete, audited, hardened, and verified.
- Communication uses a dedicated API domain.
- Communication tables include `communication_messages`, `communication_channels`, and `communication_events`.
- Provider adapters include Resend, WhatsApp, and Mock providers.
- Template handling and webhook deduplication exist.
- Tenant isolation and RBAC were implemented.
- The frontend contains a Communication Hub, thread feed, and email/WhatsApp modals.
- The report's final verification section still carries the earlier 386+ test baseline and an 11-table database count, so Sprint 20 must begin with a fresh repository verification instead of treating those numbers as the final Sprint 19 baseline.

Relevant source report sections:

- Sprint 19 status and feature map: lines 5–11 and 75–77
- Communication architecture: lines 419–443
- Final test summary: lines 447–463

---

# 2. Sprint 20 Product Objective

Build an **Automation Center** where a freelancer can create, review, activate, pause, inspect, and test automations.

Example:

```text
"When an invoice becomes overdue by 3 days,
email the client and notify me on WhatsApp."
```

Freelancy should turn that into:

```text
TRIGGER
Invoice overdue

CONDITION
Days overdue >= 3

ACTIONS
Send email to client
Send WhatsApp notification to owner

STATUS
Active
```

The user must never need to understand n8n's internal node graph to create a normal Freelancy automation.

---

# 3. Core Architectural Decision

## Freelancy is the source of truth

Freelancy owns:

- automation definition
- workspace ownership
- RBAC
- trigger semantics
- allowed condition schema
- allowed action schema
- client/project/invoice/change-order identity
- communication policy
- idempotency
- audit history
- automation lifecycle
- automation run record

## n8n is the execution/orchestration layer

n8n owns:

- workflow execution
- scheduling
- branching
- waiting/delays
- action sequencing
- external integration orchestration
- execution logs
- retrying workflow executions where appropriate

n8n describes itself as a workflow automation platform that connects applications/APIs and supports workflow primitives such as webhooks, schedules, branching and waiting. It can be used via cloud or self-hosting.

Use the current official n8n documentation for version-specific API behavior:

- https://docs.n8n.io/
- https://docs.n8n.io/workflows/executions/all-executions/
- https://docs.n8n.io/hosting/securing/security-audit/

## Never do this

```text
n8n
  ↓
direct PostgreSQL credentials
  ↓
UPDATE projects
```

Never do this either:

```text
n8n
  ↓
direct WhatsApp provider credentials
```

for normal Freelancy workflows.

Preferred:

```text
n8n
  ↓
Freelancy internal API
  ↓
Domain Service
  ↓
DB / CommunicationService
```

This preserves the architecture established in Sprints 16–19.

---

# 4. Product Model

The automation system consists of five layers:

```text
1. Definition
2. Trigger
3. Condition
4. Action
5. Execution
```

Example:

```text
Automation
 ├── Trigger
 │    └── invoice.overdue
 │
 ├── Conditions
 │    └── days_overdue >= 3
 │
 ├── Actions
 │    ├── send_email
 │    └── send_whatsapp
 │
 └── Execution
      ├── running
      ├── succeeded
      └── failed
```

---

# 5. Sprint 20 Scope

## In Scope

### Automation management

- create automation
- update automation
- activate automation
- pause automation
- archive automation
- duplicate automation
- manually test automation
- inspect automation runs

### Trigger system

- business event triggers
- scheduled triggers
- manual test trigger

### Conditions

- equality
- inequality
- contains
- greater than
- greater than or equal
- less than
- less than or equal
- boolean
- existence
- simple AND/OR groups

### Actions

Initial actions:

- send email
- send WhatsApp
- notify workspace owner
- create internal follow-up
- call a permitted Freelancy internal action

### n8n integration

- authenticated n8n connection
- workflow creation
- workflow update/synchronization
- workflow activation
- workflow deactivation
- execution ID correlation
- workflow health checks

### Observability

- automation run history
- execution status
- failure reason
- timing
- request/event IDs
- n8n execution ID
- activity events

### Security

- tenant isolation
- RBAC
- signed internal webhooks
- provider credential isolation
- input validation
- action allowlisting
- SSRF-safe internal API access
- rate limits
- idempotency
- replay protection

---

# 6. Out of Scope

Do NOT implement these in Sprint 20:

- AI natural-language automation builder
- arbitrary user-created n8n node graphs
- direct SQL actions
- arbitrary HTTP requests configured by users
- custom JavaScript execution from the Freelancy UI
- arbitrary third-party API credentials
- full Zapier clone
- marketing campaign system
- email newsletter system
- AI autonomous agents
- WhatsApp AI chatbot
- voice automation
- public client portal
- Stripe
- accounting integrations
- arbitrary file-processing pipelines
- Redis/Kafka/RabbitMQ solely for automation

AI automation generation belongs to Sprint 21.

---

# 7. Initial Automation Templates

Ship these predefined recipes first.

## Automation 1 — Invoice Overdue Reminder

```text
TRIGGER
invoice.overdue

CONDITION
days_overdue >= 3

ACTIONS
send_email(client)
send_whatsapp(owner)
```

## Automation 2 — Payment Received Notification

```text
TRIGGER
payment.recorded

ACTIONS
send_email(client)
notify_owner
```

## Automation 3 — Project Started

```text
TRIGGER
project.created

ACTIONS
send_email(client)
send_whatsapp(client)
```

## Automation 4 — Deliverable Completed

```text
TRIGGER
project.deliverable.completed

ACTIONS
send_whatsapp(client)
```

## Automation 5 — Change Order Proposed

```text
TRIGGER
change_order.proposed

ACTIONS
send_email(client)
send_whatsapp(client)
```

## Automation 6 — Weekly Project Update

```text
TRIGGER
schedule

SCHEDULE
Friday 18:00

FILTER
active projects

ACTIONS
send_email(client)
```

Sprint 20 should use a deterministic template message for this recipe. AI-generated weekly reporting is deferred to Sprint 21.

---

# 8. Business Event Catalog

Use stable, versioned automation events.

Initial event catalog:

```text
client.created
client.updated

project.created
project.updated
project.completed

project.deliverable.created
project.deliverable.started
project.deliverable.completed

invoice.created
invoice.sent
invoice.due
invoice.overdue

payment.recorded

change_order.proposed
change_order.approved
change_order.rejected
change_order.cancelled

communication.email.sent
communication.email.delivered
communication.email.received

communication.whatsapp.sent
communication.whatsapp.delivered
communication.whatsapp.received
```

Only expose events that actually exist in the repository. Where the current domain does not emit an event yet, add it as part of the relevant integration phase.

---

# 9. Automation Event Contract

Every automation event must have:

```json
{
  "version": "1",
  "eventId": "uuid",
  "eventType": "invoice.overdue",
  "occurredAt": "2026-09-21T12:00:00Z",
  "workspaceId": "uuid",
  "actorId": "uuid-or-null",
  "entity": {
    "type": "invoice",
    "id": "uuid"
  },
  "context": {
    "clientId": "uuid",
    "projectId": "uuid-or-null",
    "invoiceId": "uuid"
  },
  "data": {}
}
```

Required properties:

- `version`
- `eventId`
- `eventType`
- `occurredAt`
- `workspaceId`
- `entity`

Optional properties:

- `actorId`
- `context`
- `data`

Never put API keys, provider secrets, Clerk tokens, full provider webhook payloads, or unbounded message bodies inside an automation event.

---

# 10. Durable Event Delivery

The existing activity bus is non-blocking and fail-safe. That is appropriate for audit display and RAG synchronization, but automation delivery has a different requirement:

> A temporary n8n outage must not silently erase a business automation event.

Therefore Sprint 20 must introduce a durable automation event/delivery record.

Recommended table:

```text
automation_events
```

Suggested fields:

```text
id UUID PK
workspace_id UUID NOT NULL
event_id UUID NOT NULL
event_type TEXT NOT NULL
version INTEGER NOT NULL
payload JSONB NOT NULL

status enum(
  pending,
  dispatched,
  failed,
  dead_lettered
)

attempts INTEGER NOT NULL DEFAULT 0
next_attempt_at TIMESTAMPTZ NULL

last_error TEXT NULL

occurred_at TIMESTAMPTZ NOT NULL
dispatched_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Constraints:

```text
UNIQUE(event_id)
```

Indexes:

```text
(workspace_id, created_at DESC)
(status, next_attempt_at)
(event_type, occurred_at DESC)
```

Do NOT use provider webhook IDs as the automation event identity.

---

# 11. Event Delivery Strategy

Preferred model:

```text
Domain Event
   ↓
automation_events
   ↓
Dispatch
   ↓
n8n webhook
   ↓
Automation workflow
```

At minimum, delivery must be at-least-once.

Therefore:

```text
same event
   ↓
may be delivered twice
   ↓
automation must still produce one logical outcome
```

Idempotency belongs on the execution/action boundary.

---

# 12. Automation Definition Schema

Create:

```text
automations
```

Suggested schema:

```text
id UUID PK
workspace_id UUID NOT NULL
created_by_user_id UUID NOT NULL

name TEXT NOT NULL
description TEXT NULL

status enum(
  draft,
  active,
  paused,
  error,
  archived
)

trigger_type enum(
  event,
  schedule
)

trigger_config JSONB NOT NULL
condition_config JSONB NOT NULL
action_config JSONB NOT NULL

timezone TEXT NOT NULL

definition_version INTEGER NOT NULL DEFAULT 1
definition_hash TEXT NOT NULL

n8n_workflow_id TEXT NULL
n8n_workflow_version TEXT NULL

last_compiled_at TIMESTAMPTZ NULL
last_activated_at TIMESTAMPTZ NULL

created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Indexes:

```text
(workspace_id, status)
(workspace_id, created_at DESC)
(workspace_id, trigger_type)
(workspace_id, n8n_workflow_id)
```

---

# 13. Automation Run Schema

Create:

```text
automation_runs
```

Suggested fields:

```text
id UUID PK
workspace_id UUID NOT NULL
automation_id UUID NOT NULL

automation_event_id UUID NULL
n8n_execution_id TEXT NULL

status enum(
  queued,
  running,
  succeeded,
  failed,
  skipped,
  cancelled
)

trigger_source enum(
  event,
  schedule,
  manual
)

started_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL

error_code TEXT NULL
error_message TEXT NULL

created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Indexes:

```text
(workspace_id, automation_id, created_at DESC)
(workspace_id, status, created_at DESC)
(automation_id, created_at DESC)
(n8n_execution_id)
```

---

# 14. Automation Action Run Schema

Recommended if the implementation supports multiple actions.

Create:

```text
automation_action_runs
```

Fields:

```text
id UUID PK
workspace_id UUID NOT NULL
automation_run_id UUID NOT NULL

action_index INTEGER NOT NULL
action_type TEXT NOT NULL

status enum(
  pending,
  running,
  succeeded,
  failed,
  skipped
)

idempotency_key TEXT NOT NULL
provider_message_id TEXT NULL

error_code TEXT NULL
error_message TEXT NULL

started_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL

created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Constraints:

```text
UNIQUE(automation_run_id, action_index)
UNIQUE(workspace_id, idempotency_key)
```

This lets the system distinguish:

```text
Automation succeeded
but
one action failed
```

rather than collapsing everything into one opaque execution result.

---

# 15. Trigger Schema

Do not accept arbitrary JSON trigger definitions from the browser.

Use typed Zod schemas.

Example:

```ts
type EventTrigger = {
  type: "event";
  eventType: AutomationEventType;
};

type ScheduleTrigger = {
  type: "schedule";
  frequency: "daily" | "weekly";
  hour: number;
  minute: number;
  dayOfWeek?: number;
  timezone: string;
};
```

Keep the supported trigger set intentionally narrow.

---

# 16. Condition Schema

Use typed conditions.

Example:

```ts
type Condition = {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "contains"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "exists";
  value?: string | number | boolean | null;
};
```

Group:

```ts
type ConditionGroup = {
  operator: "AND" | "OR";
  conditions: Condition[];
};
```

Example:

```json
{
  "operator": "AND",
  "conditions": [
    {
      "field": "invoice.daysOverdue",
      "operator": "gte",
      "value": 3
    },
    {
      "field": "client.whatsappEnabled",
      "operator": "eq",
      "value": true
    }
  ]
}
```

Only allow a controlled field registry.

Never allow:

```text
database.query
sql(...)
JavaScript expression
HTTP URL
```

as user-configurable fields.

---

# 17. Allowed Condition Fields

Initial registry:

```text
invoice.amount
invoice.daysOverdue
invoice.status

project.status
project.budget
project.progressPercentage

deliverable.status
deliverable.estimatedHours
deliverable.loggedHours

changeOrder.status
changeOrder.budgetDelta
changeOrder.timelineDeltaDays

client.emailEnabled
client.whatsappEnabled

workspace.plan
```

Expand only with an explicit product requirement.

---

# 18. Action Schema

Example:

```ts
type AutomationAction =
  | {
      type: "send_email";
      templateKey: CommunicationTemplateKey;
      recipient: "client" | "owner";
    }
  | {
      type: "send_whatsapp";
      templateKey: CommunicationTemplateKey;
      recipient: "client" | "owner";
    }
  | {
      type: "notify_owner";
      messageTemplate: string;
    }
  | {
      type: "create_follow_up";
      title: string;
    };
```

Do not allow a user to configure arbitrary HTTP endpoints in Sprint 20.

---

# 19. Automation Compiler

This is the core n8n integration.

Freelancy stores:

```text
Automation Definition
```

The compiler converts it into a controlled n8n workflow.

Concept:

```text
Automation Definition
        ↓
Validate
        ↓
Compile
        ↓
n8n Workflow JSON
        ↓
Create / Update
        ↓
Activate
```

The exact n8n workflow JSON and API paths must be implemented against the current n8n API version at coding time. Do not hardcode assumptions about old n8n API payload shapes.

---

# 20. Compiled Event Workflow

Conceptual workflow:

```text
Webhook Trigger
      ↓
Validate Event Contract
      ↓
Load Automation Context
      ↓
Condition Evaluation
      ↓
IF condition passes
      ↓
Action Loop
      ↓
Freelancy Internal API
      ↓
Record Result
```

---

# 21. Compiled Scheduled Workflow

Conceptual workflow:

```text
Schedule Trigger
      ↓
Fetch candidate records
      ↓
Filter by automation definition
      ↓
Condition evaluation
      ↓
Action execution
      ↓
Record run
```

n8n documents Schedule Trigger and Webhook workflow primitives. Use those rather than creating another standalone scheduler unless actual implementation constraints require it.

---

# 22. Managed Workflow Strategy

A production-safe design is to generate a managed n8n workflow for each active automation where schedules/conditions/actions differ materially.

The workflow is created from a typed definition, not from arbitrary user-authored workflow JSON.

Every managed workflow must contain enough metadata to map back to:

```text
automationId
workspaceId
definitionVersion
definitionHash
```

The n8n instance used by Freelancy should be treated as an infrastructure/control plane, not as a user-visible workflow editor.

---

# 23. Automation Lifecycle

Lifecycle:

```text
draft
  ↓
validate
  ↓
compile
  ↓
activate
  ↓
active
  ↓
pause
  ↓
paused
  ↓
activate
```

Error path:

```text
compile / sync failure
        ↓
error
```

Archive:

```text
draft/paused/error
        ↓
archived
```

Do not archive an active automation without deactivating its n8n workflow first.

---

# 24. Activate Flow

```text
POST /automations/:id/activate
        ↓
Authenticate user
        ↓
RBAC
        ↓
Load automation
        ↓
Validate definition
        ↓
Compile n8n workflow
        ↓
Create/update workflow
        ↓
Validate returned workflow ID
        ↓
Activate n8n workflow
        ↓
Persist n8n workflow ID
        ↓
Set automation status = active
        ↓
Activity event
```

Failure:

```text
n8n creation succeeds
activation fails
```

The service must leave the database in a consistent state using a compensating action such as deactivation, cleanup, or an explicit error state depending on the observed n8n state.

---

# 25. Pause Flow

```text
POST /automations/:id/pause
        ↓
RBAC
        ↓
deactivate n8n workflow
        ↓
status = paused
        ↓
activity event
```

Do not merely set the database status to paused while leaving an active n8n workflow.

---

# 26. Update Flow

For an active automation:

```text
edit
 ↓
save new definition
 ↓
increment definition_version
 ↓
recalculate definition_hash
 ↓
compile
 ↓
replace/sync n8n workflow
 ↓
reactivate
```

Use a safe update strategy supported by the installed n8n version:

```text
compile new workflow
       ↓
validate
       ↓
activate/update
       ↓
deactivate old version
```

or another equivalent compensating/atomic approach.

---

# 27. Definition Hash

Canonicalize the automation definition.

Hash:

```text
trigger
+
conditions
+
actions
+
timezone
+
version
```

Use SHA-256.

Purpose:

- detect unchanged definitions
- avoid unnecessary workflow updates
- correlate the compiled workflow to the exact application definition
- detect workflow-definition drift

Never trust a workflow simply because the n8n workflow ID matches.

---

# 28. Internal API Boundary

Create an internal automation namespace.

Example:

```text
POST /api/v1/internal/automations/events
POST /api/v1/internal/automations/runs/:runId/started
POST /api/v1/internal/automations/runs/:runId/completed
POST /api/v1/internal/automations/runs/:runId/failed
```

Exact endpoints can be simplified if a single execution callback is sufficient.

These endpoints are not public APIs.

They require service authentication.

---

# 29. Internal Service Authentication

Use a dedicated n8n service credential.

Example:

```text
Authorization: Bearer <AUTOMATION_SERVICE_TOKEN>
```

Do not reuse:

- Clerk tokens
- AI service token
- Resend API key
- WhatsApp token

Use constant-time comparison where a static token is validated.

Attach:

```text
service identity
request ID
```

and timestamp/replay metadata where applicable.

---

# 30. Replay Protection

Signed internal event delivery should contain:

```text
eventId
timestamp
nonce
signature
```

Conceptually:

```text
HMAC-SHA256(
  timestamp + "." + eventId + "." + body
)
```

The verification layer must reject:

- invalid signature
- stale timestamp
- replayed nonce/event
- mismatched event ID

Store processed event IDs where needed.

---

# 31. Action Boundary

n8n should not implement domain operations itself.

Bad:

```text
n8n → SQL UPDATE invoice
```

Correct:

```text
n8n
 ↓
POST /internal/actions/send-email
 ↓
CommunicationService
 ↓
ResendProvider
```

Correct:

```text
n8n
 ↓
POST /internal/actions/send-whatsapp
 ↓
CommunicationService
 ↓
WhatsAppProvider
```

Correct:

```text
n8n
 ↓
POST /internal/actions/create-follow-up
 ↓
Freelancy Domain Service
 ↓
PostgreSQL
```

This ensures future actions remain safe.

---

# 32. Internal Action Allowlist

Sprint 20 allow only:

```text
send_email
send_whatsapp
notify_owner
create_follow_up
```

Every action must have:

- typed request schema
- workspace ID
- automation ID
- run ID
- action ID/index
- idempotency key
- automation service identity

No generic endpoint such as:

```text
POST /internal/run-anything
```

---

# 33. Communication Integration

The automation system must reuse Sprint 19 communication infrastructure.

Do NOT create:

```text
n8n → Resend directly
n8n → Meta directly
```

for standard Freelancy actions.

Use:

```text
n8n
 ↓
Freelancy Internal Action API
 ↓
CommunicationService
 ↓
provider adapter
```

This ensures communication preferences, templates, provider abstraction, message persistence, webhook tracking, activity events, and idempotency remain consistent for both manual and automated messages.

---

# 34. Automation Idempotency

Every automation execution needs:

```text
workspaceId
automationId
sourceEventId
actionIndex
```

Generate:

```text
idempotencyKey =
sha256(
  workspaceId +
  automationId +
  sourceEventId +
  actionIndex +
  definitionVersion
)
```

Result:

```text
same event + same automation + same action
→ same idempotency key
→ one logical action
```

---

# 35. Duplicate Event Scenario

Example:

```text
invoice.overdue event
       ↓
n8n execution A

same event delivered again
       ↓
n8n execution B
```

Execution B must not send another email.

Flow:

```text
Action API
 ↓
check idempotency key
 ↓
already completed?
 ↓
return existing result
```

This is mandatory.

---

# 36. Credentials

Do not store every workspace's external provider credential inside n8n during Sprint 20.

Preferred:

```text
Freelancy
  owns provider credentials
        ↓
CommunicationService
```

n8n only receives the minimum integration credentials required for orchestration:

```text
AUTOMATION_SERVICE_TOKEN
N8N_API_KEY
N8N_WEBHOOK_SIGNING_SECRET
```

as applicable.

This reduces the blast radius of a compromised workflow.

---

# 37. n8n Provider Abstraction

Support n8n Cloud or self-hosted n8n behind an application-level abstraction.

Suggested interface:

```ts
interface N8nWorkflowProvider {
  createWorkflow(input: CompiledWorkflow): Promise<N8nWorkflowRef>;
  updateWorkflow(input: CompiledWorkflow): Promise<N8nWorkflowRef>;
  activateWorkflow(workflowId: string): Promise<void>;
  deactivateWorkflow(workflowId: string): Promise<void>;
  getWorkflow(workflowId: string): Promise<N8nWorkflowRef>;
  healthCheck(): Promise<boolean>;
}
```

Use a mock implementation for tests.

Do not bind the rest of the API directly to n8n SDK/client details.

---

# 38. n8n Deployment

Support:

```text
Option A
n8n Cloud

Option B
Self-hosted n8n
```

The product must abstract n8n behind `N8nWorkflowProvider`.

If self-hosted:

- persistent database/storage strategy required
- persistent application configuration required
- encrypted credential storage required
- HTTPS required
- production webhook URL required
- backup strategy required
- access control required
- security review required

n8n's documentation covers cloud/self-hosting, configuration, security, executions, and source-control/environment features. Use the version currently deployed rather than copying old infrastructure examples.

---

# 39. n8n Security Review

Before production activation, run the current n8n security audit.

The current n8n audit documentation describes checks covering credential usage, database-related risks, filesystem interactions, risky/community nodes, instance configuration, and unprotected webhooks.

Reference:
https://docs.n8n.io/hosting/securing/security-audit/

Recommended policy:

```text
No community nodes for Sprint 20.
No Execute Command node.
No unrestricted Code node.
No arbitrary filesystem access.
No arbitrary SQL.
```

The workflow compiler should use only approved n8n built-in nodes.

---

# 40. Allowed n8n Node Classes

Initial approved node set:

```text
Webhook
Schedule Trigger
HTTP Request
If
Switch
Set / Edit Fields
Merge
Loop Over Items
Wait
Respond to Webhook
```

Avoid:

```text
Execute Command
Shell access
filesystem nodes
arbitrary community nodes
```

Enforce this allowlist in the compiler.

---

# 41. Frontend: Automation Center

Create:

```text
/workspaces/[workspaceId]/automations
```

Suggested layout:

```text
Automation Center

[ + Create Automation ]

Active
────────────────────────────────────

Invoice Overdue Reminder
Invoice overdue → 3 days → Email + WhatsApp
ACTIVE

Weekly Project Update
Every Friday → Client Email
ACTIVE

Payment Notification
Payment received → Email client
PAUSED
```

---

# 42. Automation Builder

Use a structured UI.

```text
Create Automation

Name
[ Invoice overdue reminder ]

WHEN
[ Invoice becomes overdue ]

IF
[ Days overdue ] [ >= ] [ 3 ]

THEN
[ Send email to client ]

AND
[ Send WhatsApp to me ]

[ Test ] [ Save Draft ] [ Activate ]
```

Do not expose:

```text
Webhook URL
n8n nodes
workflow JSON
credentials
```

to normal users.

---

# 43. Automation Builder Components

Create:

```text
apps/web/src/features/automation/
```

Suggested:

```text
components/
  AutomationCenter.tsx
  AutomationCard.tsx
  AutomationBuilder.tsx
  TriggerSelector.tsx
  ConditionBuilder.tsx
  ActionBuilder.tsx
  AutomationPreview.tsx
  AutomationRunHistory.tsx
  AutomationRunDetails.tsx
  TestAutomationModal.tsx
  AutomationStatusBadge.tsx

hooks/
  useAutomations.ts
  useCreateAutomation.ts
  useUpdateAutomation.ts
  useActivateAutomation.ts
  usePauseAutomation.ts
  useAutomationRuns.ts
  useTestAutomation.ts

schemas/
  automation.schemas.ts

types/
  automation.types.ts
```

Use the existing Next.js, TanStack Query, React Hook Form, Zod, and UI conventions. Do not introduce another state-management library.

---

# 44. User Experience: Test Automation

Before activation:

```text
[Test Automation]
```

Example:

```text
Test Event

Invoice:
INV-2026-1042

Days overdue:
5

Expected result:
✓ Condition passes
✓ Email action prepared
✓ WhatsApp action prepared
```

For the first version:

```text
TEST MODE
```

must not send a real message unless the user explicitly chooses a live test.

Preferred dry-run result:

```json
{
  "triggerMatched": true,
  "conditionsMatched": true,
  "actions": [
    {
      "type": "send_email",
      "wouldExecute": true
    },
    {
      "type": "send_whatsapp",
      "wouldExecute": true
    }
  ]
}
```

---

# 45. Automation Run History

Add:

```text
Automation
   ↓
Runs
```

Example:

```text
Invoice Overdue Reminder

Today 14:31
✓ Success
Invoice INV-2026-1021
Email sent
WhatsApp sent

Today 11:02
✗ Failed
WhatsApp action failed
Provider unavailable

Yesterday 14:05
↷ Skipped
Condition failed
days_overdue = 1
```

---

# 46. Execution Status

Use:

```text
queued
running
succeeded
failed
skipped
cancelled
```

Do not collapse `skipped` into `failed`.

A condition not matching is a valid automation result.

---

# 47. n8n Execution Correlation

When n8n returns an execution identifier:

```text
automation_runs.n8n_execution_id
```

Store it.

This allows:

```text
Freelancy
   ↓
Automation Run
   ↓
n8n execution
```

n8n documents execution history and retry capabilities. Use the current deployment's execution API or UI integration where available.

Reference:
https://docs.n8n.io/workflows/executions/all-executions/

---

# 48. Retry Strategy

Do not implement unlimited retries.

Recommended:

```text
attempt 1
↓
attempt 2
↓
attempt 3
↓
dead-letter / failed
```

Use exponential backoff.

Do not retry:

```text
validation failure
authorization failure
invalid recipient
unsupported template
```

Retry:

```text
network timeout
provider 5xx
temporary n8n failure
```

The retry decision must be explicit and typed.

---

# 49. Dead-Letter Handling

If an event cannot be processed after the retry policy:

```text
automation_events.status = dead_lettered
```

and:

```text
automation_runs.status = failed
```

Create activity:

```text
Automation "Invoice Overdue Reminder" failed after maximum retries
```

The user should be able to inspect automation, event, run, action, and error.

---

# 50. Schedule Semantics

For scheduled automations, store timezone explicitly.

Example:

```text
timezone = Asia/Kolkata
schedule = every Friday at 18:00
```

Do not assume server timezone.

The frontend should show:

```text
Every Friday at 6:00 PM
Asia/Kolkata
```

Configure the n8n schedule according to the currently deployed n8n version.

---

# 51. Schedule Safety

Do not create extremely high-frequency schedules.

Initial limit:

```text
minimum supported interval = 15 minutes
```

Do not allow:

```text
every second
every minute
```

in Sprint 20.

---

# 52. Automation Rate Limits

Workspace-specific initial limits:

```text
max active automations: 100
max actions/automation: 10
max conditions/automation: 20
max runs/hour/workspace: 1000
15-minute minimum schedule interval
```

Return explicit errors:

```text
AUTOMATION_LIMIT_REACHED
AUTOMATION_RUN_RATE_LIMITED
```

Do not silently execute excess actions.

---

# 53. Manual Run / Dry Run API

Implement:

```http
POST /api/v1/workspaces/:workspaceId/automations/:automationId/test
```

The default `/test` behavior is dry-run.

Actual live manual execution, if implemented, must require an explicit confirmation path.

---

# 54. API Endpoints

Mount:

```text
/api/v1/workspaces/:workspaceId/automations
```

## List

```http
GET /
```

Filters:

```text
status?
triggerType?
cursor?
limit?
```

## Get

```http
GET /:automationId
```

## Create

```http
POST /
```

## Update

```http
PATCH /:automationId
```

## Activate

```http
POST /:automationId/activate
```

## Pause

```http
POST /:automationId/pause
```

## Archive

```http
POST /:automationId/archive
```

## Duplicate

```http
POST /:automationId/duplicate
```

## Dry run

```http
POST /:automationId/test
```

## Runs

```http
GET /:automationId/runs
GET /:automationId/runs/:runId
```

---

# 55. API Request Validation

Use Zod.

Creation schema must reject:

- unknown trigger types
- unknown event types
- arbitrary condition field paths
- unknown operators
- unsupported action types
- excessive condition count
- excessive action count
- invalid timezone
- invalid schedule
- empty automation name
- oversized template fields

Never accept arbitrary n8n workflow JSON through the API.

---

# 56. RBAC

Recommended policy:

| Action | Owner | Editor | Viewer |
|---|---:|---:|---:|
| View automations | Yes | Yes | Yes |
| Create automation | Yes | Yes | No |
| Edit automation | Yes | Yes | No |
| Activate/pause | Yes | Yes | No |
| Archive | Yes | Yes | No |
| Test dry-run | Yes | Yes | No |
| View run history | Yes | Yes | Yes |
| Configure n8n integration | Yes | No | No |

Reuse the existing workspace policy layer. Do not create an automation-specific membership model.

---

# 57. Tenant Isolation

Every automation query must include:

```text
workspace_id
```

Every run query must include:

```text
workspace_id
automation_id
```

The server must verify that the automation and every referenced client/project/invoice/change-order belong to the same workspace.

---

# 58. Important Tenant Attack

Test:

```text
Workspace A user
   ↓
automationId from Workspace B
```

Expected:

```text
403 or existing not-found convention
```

and:

```text
NO n8n workflow execution
NO action
NO message
```

---

# 59. Prompt / Input Security

Sprint 20 does not have an AI automation builder.

Nevertheless:

- client names are untrusted input
- client message content is untrusted input
- email bodies are untrusted input
- WhatsApp messages are untrusted input
- invoice descriptions are untrusted input
- template variables are untrusted input

Never interpret those as automation instructions, SQL, JavaScript, or n8n expressions.

---

# 60. Activity Events

Add deterministic events:

```text
automation.created
automation.updated
automation.activated
automation.paused
automation.archived
automation.execution_started
automation.execution_succeeded
automation.execution_failed
automation.execution_skipped
automation.action_succeeded
automation.action_failed
```

Example activity:

```text
Automation "Invoice Overdue Reminder" activated
```

Do not put raw stack traces into activity text.

---

# 61. Observability

Every run should correlate:

```text
requestId
workspaceId
automationId
automationRunId
automationEventId
n8nExecutionId
actionId
```

Structured log example:

```json
{
  "event": "automation.execution",
  "workspaceId": "...",
  "automationId": "...",
  "runId": "...",
  "n8nExecutionId": "...",
  "status": "succeeded",
  "durationMs": 842
}
```

Never log:

- service tokens
- n8n API keys
- WhatsApp access tokens
- Resend API keys
- raw provider credentials

---

# 62. n8n Health Monitoring

Create:

```http
GET /api/v1/admin/integrations/n8n/health
```

Owner/admin-equivalent access only.

Check:

```text
n8n reachable
authentication works
API reachable
workflow management calls work
```

Potential status:

```text
healthy
degraded
offline
misconfigured
```

If n8n is offline:

- existing Freelancy core must continue operating
- automation creation may remain available as draft
- activation should fail safely
- existing business operations must not fail

---

# 63. Critical Principle: Automation Must Never Block Core Business Operations

Bad:

```text
Create invoice
 ↓
n8n offline
 ↓
invoice creation fails
```

Correct:

```text
Create invoice
 ↓
invoice succeeds
 ↓
automation event queued
 ↓
n8n unavailable
 ↓
automation delivery retries later
```

Core domain operations must remain available even when automation infrastructure is down.

---

# 64. Failure Boundaries

### n8n outage

```text
Core business operation = success
Automation = pending/deferred
```

### Email provider outage

```text
Automation = failed or retrying
Core project/invoice = unaffected
```

### WhatsApp provider outage

```text
WhatsApp action = failed/retrying
Other actions follow configured failure policy
```

### Invalid automation definition

```text
Activation blocked
Automation remains draft/error
```

### Authorization failure

```text
Action rejected
No mutation
```

---

# 65. Action Ordering

Default behavior:

```text
Action 1
 ↓
Action 2
 ↓
Action 3
```

If Action 1 fails:

```text
retry Action 1
```

After max attempts, the initial policy is:

```text
continueOnError = false
```

Do not allow arbitrary failure policies in Sprint 20.

Parallelization can be added later.

---

# 66. Action Result Contract

Internal action APIs should return:

```json
{
  "success": true,
  "data": {
    "actionId": "...",
    "messageId": "...",
    "status": "sent"
  },
  "requestId": "..."
}
```

Failure:

```json
{
  "success": false,
  "error": "COMMUNICATION_PROVIDER_ERROR",
  "message": "Message provider unavailable",
  "requestId": "..."
}
```

Use existing Freelancy error-envelope conventions.

---

# 67. Automation API Service Structure

Create:

```text
apps/api/src/domains/automation/
```

Suggested:

```text
automation.controller.ts
automation.service.ts
automation.repository.ts
automation.schema.ts
automation.types.ts
automation.policy.ts
automation.compiler.ts
automation.events.ts
automation.dispatcher.ts
automation.idempotency.ts
automation.n8n.ts

n8n/
  n8n.provider.ts
  n8n.client.ts
  n8n.workflow.compiler.ts
  n8n.workflow.templates.ts

actions/
  action.registry.ts
  send-email.action.ts
  send-whatsapp.action.ts
  notify-owner.action.ts
  create-follow-up.action.ts

triggers/
  event-trigger.ts
  schedule-trigger.ts

__tests__/
```

---

# 68. Database Migration

Add a new migration after the actual current Sprint 19 migration state.

Possible objects:

```text
automation_status enum
automation_trigger_type enum
automation_run_status enum
automation_event_status enum
automation_events
automations
automation_runs
automation_action_runs
```

Do not assume the migration number. Inspect the latest migration first.

---

# 69. Migration Requirements

Must be:

- safe for production data
- properly indexed
- tenant-scoped
- FK-protected
- compatible with Neon HTTP transport
- compatible with the repository's migration runner

After migration:

```text
pnpm --filter @repo/database db:migrate
```

Verify the actual schema.

---

# 70. Event Production Integration

Existing domain adapters/services should be extended to emit automation-ready events.

Potential sources:

```text
client service
project service
project deliverable service
invoice service
payment service
change-order service
communication service
```

Do not duplicate business logic.

A service emits a domain event; the automation layer normalizes it to `AutomationEventV1`.

---

# 71. Event Versioning

Never silently change an event payload.

Example:

```json
{
  "version": 1,
  "eventType": "invoice.overdue"
}
```

When semantics materially change:

```text
version = 2
```

Old workflows must remain safe.

---

# 72. Automation Compiler Safety

The compiler must reject:

```text
unsupported action
unsupported event
unsupported condition field
excessive actions
excessive predicates
invalid schedule
unknown template
```

It should never generate arbitrary n8n nodes from user-provided JSON.

Concept:

```text
User Definition
 ↓
Typed AST
 ↓
Allowlist Validation
 ↓
Compiler
 ↓
Approved n8n node graph
```

---

# 73. Compiler Tests

For every supported automation:

```text
input definition
 ↓
expected compiled workflow
```

Test:

- exact trigger mapping
- condition mapping
- action mapping
- workflow metadata
- node allowlist
- absence of forbidden nodes
- stable output
- deterministic definition hash

Compiler output should be deterministic for the same definition/version.

---

# 74. n8n Provider Mock

Tests must not depend on a real n8n server.

Create:

```ts
MockN8nWorkflowProvider
```

It should support:

```text
createWorkflow()
updateWorkflow()
activateWorkflow()
deactivateWorkflow()
getWorkflow()
healthCheck()
```

The mock records calls so tests can verify activation, deactivation, workflow ID persistence, and rollback behavior.

---

# 75. API Tests

Minimum coverage:

### Automation CRUD

- create
- list
- get
- update
- archive
- duplicate

### RBAC

- owner
- editor
- viewer
- wrong workspace

### Validation

- bad trigger
- bad condition
- bad action
- too many actions
- invalid schedule
- invalid timezone

### Activation

- compile success
- compile failure
- n8n create failure
- n8n activate failure
- rollback
- already active
- paused → active

### Idempotency

- repeated event
- repeated action
- repeated execution callback

---

# 76. n8n Integration Tests

Mock the provider.

Test:

```text
create automation
 ↓
compile
 ↓
create workflow
 ↓
activate
 ↓
persist n8n workflow ID
```

Update:

```text
active automation
 ↓
new definition
 ↓
new compilation
 ↓
workflow update
```

Pause:

```text
active automation
 ↓
deactivate
 ↓
status paused
```

Failure:

```text
create succeeds
activate fails
 ↓
compensating action
 ↓
automation error
```

---

# 77. Event Delivery Tests

Test:

```text
domain event
 ↓
automation_event inserted
 ↓
dispatch
 ↓
n8n accepted
 ↓
status dispatched
```

Failure:

```text
n8n unavailable
 ↓
attempt++
 ↓
nextAttemptAt
 ↓
retry
```

Duplicate:

```text
same eventId
 ↓
unique constraint / dedupe
 ↓
one logical event
```

---

# 78. Action Idempotency Tests

Test:

```text
event E
automation A
action 0

→ send email
```

Repeat the exact same event/automation/action.

Expected:

```text
NO second email
```

The existing Sprint 19 communication idempotency layer remains authoritative for message-level duplication.

---

# 79. Frontend Tests

Test:

- automation list
- create builder
- trigger selector
- condition builder
- action builder
- validation
- save draft
- activate
- pause
- run history
- run details
- empty state
- error state
- viewer restrictions
- dry-run result

---

# 80. End-to-End Scenarios

## E2E 1 — Invoice Reminder

```text
Invoice becomes overdue
        ↓
Automation event
        ↓
n8n webhook
        ↓
Condition matches
        ↓
Email action
        ↓
CommunicationService
        ↓
Mock Resend
        ↓
Message persisted
        ↓
Automation run = succeeded
```

## E2E 2 — Condition Skip

```text
Invoice overdue
        ↓
daysOverdue = 1
        ↓
condition requires >= 3
        ↓
automation run = skipped
        ↓
NO message
```

## E2E 3 — Duplicate

```text
same event sent twice
        ↓
one logical email
        ↓
duplicate execution/action ignored
```

## E2E 4 — n8n outage

```text
invoice operation succeeds
        ↓
automation event pending
        ↓
n8n unavailable
        ↓
core API remains healthy
        ↓
automation marked retrying/pending
```

## E2E 5 — Manual Pause

```text
automation active
        ↓
pause
        ↓
n8n workflow deactivated
        ↓
new event
        ↓
NO execution
```

---

# 81. Security Tests

Mandatory adversarial tests:

### Cross-tenant automation

Workspace A → Workspace B automation must fail.

### Cross-tenant action

Workspace A automation → Workspace B client must fail.

### Fake internal service request

Random bearer token must fail.

### Replay

Same event/signature/nonce must be rejected or deduplicated.

### Tampered event

Payload changed with old signature must fail.

### Forbidden node

Compiler receives an action requiring an unapproved n8n node → reject.

### Arbitrary URL

Automation contains `https://attacker.example` → reject because Sprint 20 has no arbitrary HTTP action.

---

# 82. Observability Tests

Verify every run can be traced across:

```text
requestId
automationId
runId
eventId
workspaceId
n8nExecutionId
```

and that secrets do not appear in logs/errors/activity records.

---

# 83. Phase Plan

## Phase 0 — Baseline Reconciliation

Tasks:

1. Inspect latest migration state.
2. Inspect Sprint 19 communication implementation.
3. Inspect activity event types.
4. Inspect repository RBAC policy.
5. Run current full test suite.
6. Establish real current baseline.
7. Verify the Sprint 19 report's test/database discrepancies.

### STOP POINT A

Do not code automation features until the current baseline is documented.

---

## Phase 1 — Automation Database

Implement:

```text
automations
automation_events
automation_runs
automation_action_runs
```

and required enums/indexes.

### Tests

Repository tests for tenant isolation, uniqueness, indexes, FK constraints, and status transitions.

### STOP POINT B

```text
pnpm --filter @repo/database db:migrate
pnpm typecheck
pnpm test
```

---

## Phase 2 — Automation Domain

Implement:

```text
automation.service.ts
automation.repository.ts
automation.schema.ts
automation.policy.ts
automation.events.ts
automation.idempotency.ts
```

Implement CRUD and lifecycle operations.

### STOP POINT C

All API tests green.

---

## Phase 3 — Event Contract + Durable Event Delivery

Implement:

```text
AutomationEventV1
automation_events
event adapter
dispatcher
deduplication
retry state
```

Integrate with current domain events.

### STOP POINT D

Verify invoice, project, deliverable, payment, and change-order events can reach the automation layer without breaking core operations.

---

## Phase 4 — n8n Provider

Implement:

```text
N8nWorkflowProvider
N8nClient
N8nWorkflowCompiler
N8nHealthService
```

Add environment configuration.

### STOP POINT E

Use `MockN8nWorkflowProvider` for all unit tests.

Run a real local/staging n8n smoke test separately.

---

## Phase 5 — Workflow Compiler

Support:

```text
event trigger
schedule trigger
conditions
email action
WhatsApp action
owner notification
follow-up action
```

Enforce node allowlist.

### STOP POINT F

Golden-file/compiler tests pass.

---

## Phase 6 — Internal Action APIs

Implement:

```text
send email
send WhatsApp
notify owner
create follow-up
```

These actions must call existing Freelancy services.

### STOP POINT G

Verify n8n cannot bypass tenant/RBAC/domain rules.

---

## Phase 7 — Frontend Automation Center

Implement:

```text
AutomationCenter
AutomationBuilder
TriggerSelector
ConditionBuilder
ActionBuilder
AutomationRunHistory
```

### STOP POINT H

Full web suite passes.

---

## Phase 8 — Dry Run + Diagnostics

Implement:

```text
automation test
run preview
run history
action status
error diagnostics
```

No live action unless explicitly invoked.

### STOP POINT I

Manual UX verification.

---

## Phase 9 — Prebuilt Templates

Ship the six starter automations from Section 7.

Templates should create normal editable draft definitions. Do not make them immutable.

---

## Phase 10 — Hardening

Perform:

```text
tenant isolation audit
RBAC audit
signature verification audit
replay audit
idempotency audit
n8n node allowlist audit
credential audit
rate-limit audit
log-redaction audit
failure-saga audit
```

Run the current n8n security audit in the deployed environment.

### STOP POINT J

No unresolved P0/P1 security or financial defects.

---

## Phase 11 — Full E2E Verification

Run:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

AI:

```text
cd apps/ai
pytest
```

Then execute:

```text
invoice overdue
payment received
deliverable completed
change order proposed
scheduled automation
duplicate event
n8n outage
provider failure
pause automation
cross-tenant attack
```

---

# 84. Definition of Done

Sprint 20 is complete only when:

## Product

- [ ] Automation Center exists
- [ ] User can create a draft
- [ ] User can configure trigger
- [ ] User can configure conditions
- [ ] User can configure actions
- [ ] User can dry-run automation
- [ ] User can activate
- [ ] User can pause
- [ ] User can archive
- [ ] User can inspect execution history
- [ ] Starter templates exist

## Backend

- [ ] Automation domain exists
- [ ] Durable event record exists
- [ ] n8n adapter exists
- [ ] compiler exists
- [ ] internal action boundary exists
- [ ] event deduplication exists
- [ ] retry policy exists
- [ ] idempotency exists
- [ ] activity events exist

## n8n

- [ ] secure connection exists
- [ ] workflow creation works
- [ ] workflow update works
- [ ] activation works
- [ ] pause/deactivation works
- [ ] event trigger works
- [ ] schedule trigger works
- [ ] execution ID is correlated
- [ ] forbidden nodes are not generated
- [ ] security audit completed

## Security

- [ ] workspace isolation
- [ ] RBAC
- [ ] signed internal communication
- [ ] replay protection
- [ ] provider credential isolation
- [ ] action allowlist
- [ ] rate limits
- [ ] input validation
- [ ] safe logging

## Testing

- [ ] database tests
- [ ] API tests
- [ ] compiler tests
- [ ] n8n provider tests
- [ ] action tests
- [ ] frontend tests
- [ ] event delivery tests
- [ ] idempotency tests
- [ ] adversarial security tests
- [ ] end-to-end tests
- [ ] existing suites remain green

---

# 85. Important Non-Goals Reminder

Do NOT turn Sprint 20 into Sprint 21.

Not yet:

```text
User:
"Whenever an invoice is three days late,
send a polite WhatsApp reminder and email me."

        ↓

AI
        ↓
Automation Definition
        ↓
Validation
        ↓
Human Review
        ↓
n8n
```

The natural-language generation part is Sprint 21.

Sprint 20 is deterministic:

```text
Trigger
+
Condition
+
Action
```

---

# 86. Sprint 21 Handoff

Sprint 20 should deliberately prepare for:

```text
Sprint 21
AI Automation Builder
```

Example:

```text
User:
"Whenever an invoice is three days late,
send a polite WhatsApp reminder and email me."

        ↓

AI
        ↓
Automation Definition
        ↓
Validation
        ↓
Human Review
        ↓
Sprint 20 Automation Engine
        ↓
n8n
```

The AI should generate the typed definition, not arbitrary n8n workflow JSON.

---

# 87. Product-Level Result

After Sprint 20, the product should feel different.

Current:

```text
Freelancy manages my freelance work.
```

After Sprint 20:

```text
Freelancy manages my freelance work
AND automatically handles routine operations.
```

Example dashboard:

```text
Automation Center

12 active automations

✓ 342 successful runs
↷ 8 skipped
⚠ 2 failed

Most used:
Invoice Overdue Reminder
```

The freelancer controls the rules.

n8n executes them.

Freelancy remains the source of truth.

---

# 88. Technical Principle to Preserve

The architecture must remain:

```text
                 ┌───────────────────┐
                 │     Next.js UI    │
                 └─────────┬─────────┘
                           ↓
                 ┌───────────────────┐
                 │    Express API    │
                 └─────────┬─────────┘
                           ↓
                 ┌───────────────────┐
                 │ Freelancy Domain  │
                 │   Source of Truth │
                 └─────────┬─────────┘
                           ↓
                 ┌───────────────────┐
                 │ Automation Events │
                 └─────────┬─────────┘
                           ↓
                 ┌───────────────────┐
                 │       n8n         │
                 │   Orchestration   │
                 └─────────┬─────────┘
                           ↓
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓
        Email API      WhatsApp API   Internal APIs
            ↓              ↓              ↓
                 Freelancy Domain
                        ↓
                    PostgreSQL
```

Never reverse the ownership model.

---

# 89. Implementation Agent Rules

The coding/reasoning agent must:

1. inspect the existing repository before changing anything,
2. use the September 20 Sprint 19 implementation as the baseline,
3. verify the actual migration and test counts instead of trusting stale summary numbers,
4. preserve the existing domain-service architecture,
5. preserve existing workspace authorization,
6. preserve Sprint 19 CommunicationService and provider adapters,
7. add n8n behind a provider abstraction,
8. never let n8n access PostgreSQL directly,
9. never put provider secrets in automation records,
10. never accept arbitrary n8n workflow JSON from users,
11. never generate forbidden n8n nodes,
12. never make core business operations depend synchronously on n8n availability,
13. make automation delivery idempotent,
14. make event delivery at-least-once,
15. record execution history,
16. test failure and rollback paths,
17. stop at each phase's review gate,
18. run the complete monorepo quality gate before claiming completion.

---

# 90. Final Quality Gate

Before marking Sprint 20 complete:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

AI:

```powershell
cd apps/ai
pytest
```

Database:

```powershell
pnpm --filter @repo/database db:migrate
```

Then verify production/staging n8n separately.

Required final report:

```text
Sprint 20 Status:
COMPLETE / COMPLETE WITH DEFERRED HARDENING / NOT COMPLETE

Tests:
AI:
API:
Web:
Database:

Automation Tests:
Compiler:
Event Delivery:
Idempotency:
n8n Integration:
E2E:

Security:
Tenant Isolation:
RBAC:
Webhook Signing:
Replay Protection:
Credential Isolation:
Node Allowlist:

Known Issues:
Deferred Items:

Git Commit:
Deployment:
```

Do not claim Sprint 20 complete until the implementation and final verification report agree with one another.

---

# 91. Current Official n8n References

Use current vendor documentation during implementation because API versions and hosting/security behavior change over time.

- n8n documentation: https://docs.n8n.io/
- Executions: https://docs.n8n.io/workflows/executions/all-executions/
- Security audit: https://docs.n8n.io/hosting/securing/security-audit/
- Workflow sharing/permissions: https://docs.n8n.io/workflows/sharing/

The implementation agent must inspect the currently deployed n8n version before writing workflow-management API calls.
