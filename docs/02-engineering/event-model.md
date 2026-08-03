# Event Model & Event Sourcing

**Version:** 1.0  
**Last Updated:** August 2, 2026  
**Status:** Production Ready  
**Owner:** Engineering Team

---

## Overview

This document defines the event model for Freelance OS. Events are the system's internal language for communicating state changes across services. Every significant business action generates an event that other parts of the system can subscribe to and react to.

This enables:
- **Real-time updates** (WebSocket notifications)
- **Background processing** (email, analytics, reporting)
- **Audit trails** (who did what when)
- **AI context** (historical data for learning)
- **Scalability** (loosely coupled services)

---

## 1. Event Architecture

### Event Flow

```
User Action
    ↓
Database Change
    ↓
Event Emitted
    ↓
┌──────────────┬─────────────┬──────────────┐
│              │             │              │
↓              ↓             ↓              ↓
WebSocket   Background   Audit Log    AI Memory
Broadcast   Jobs         Storage      Storage
```

### Event Sources

Events originate from:

1. **User Actions** (most common)
   - Creating a project
   - Updating scope
   - Submitting an invoice
   - Recording a payment

2. **System Actions**
   - AI analysis completed
   - Payment reminder scheduled
   - Scope drift detected

3. **External Actions**
   - Payment received (webhook from payment provider)
   - Email bounced (webhook from email provider)

---

## 2. Core Events

### Project Events

#### project:created
**When:** User creates a new project

**Data:**
```json
{
  "event": "project:created",
  "projectId": "uuid",
  "userId": "uuid",
  "title": "string",
  "budget": "number",
  "description": "string",
  "timestamp": "ISO-8601",
  "source": "user_action"
}
```

**Triggers:**
- ✓ Record in audit log
- ✓ Create audit entry
- ✓ Notify user (confirmation)

---

#### project:scope_analyzed
**When:** AI completes scope analysis

**Data:**
```json
{
  "event": "project:scope_analyzed",
  "projectId": "uuid",
  "userId": "uuid",
  "requirements": ["string"],
  "deliverables": ["string"],
  "timeline_estimate": "number (days)",
  "risks": ["string"],
  "confidence_score": "number (0-1)",
  "timestamp": "ISO-8601",
  "source": "ai_system"
}
```

**Triggers:**
- ✓ Store analysis in database
- ✓ Notify user via UI (real-time)
- ✓ Record AI suggestion for learning

---

#### project:scope_updated
**When:** User updates project scope (manually or by accepting AI suggestion)

**Data:**
```json
{
  "event": "project:scope_updated",
  "projectId": "uuid",
  "userId": "uuid",
  "changes": {
    "deliverables": ["added", "removed"],
    "timeline": "number (days)",
    "budget": "number"
  },
  "change_reason": "string (why)",
  "timestamp": "ISO-8601",
  "source": "user_action"
}
```

**Triggers:**
- ✓ Update project in database
- ✓ Record scope change in audit trail
- ✓ Notify client (if shared)
- ✓ Trigger re-analysis if needed

---

#### project:scope_drift_detected
**When:** AI detects scope creep (new request outside original scope)

**Data:**
```json
{
  "event": "project:scope_drift_detected",
  "projectId": "uuid",
  "userId": "uuid",
  "new_request": "string (description of new request)",
  "original_scope": "string",
  "impact": {
    "timeline_impact_days": "number",
    "budget_impact": "number",
    "risk_level": "low|medium|high"
  },
  "suggested_action": "accept|decline|negotiate",
  "confidence_score": "number (0-1)",
  "timestamp": "ISO-8601",
  "source": "ai_system"
}
```

**Triggers:**
- ✓ Send alert to freelancer (WebSocket + email)
- ✓ Record in project timeline
- ✓ Flag for manual review

---

#### project:milestone_created
**When:** User creates or AI suggests a milestone

**Data:**
```json
{
  "event": "project:milestone_created",
  "projectId": "uuid",
  "milestoneId": "uuid",
  "userId": "uuid",
  "title": "string",
  "description": "string",
  "due_date": "ISO-8601",
  "deliverables": ["string"],
  "order": "number",
  "source": "user_action|ai_suggestion",
  "timestamp": "ISO-8601"
}
```

**Triggers:**
- ✓ Create milestone in database
- ✓ Update project timeline view

---

#### project:milestone_updated
**When:** Milestone details change (title, due date, status, etc.)

**Data:**
```json
{
  "event": "project:milestone_updated",
  "projectId": "uuid",
  "milestoneId": "uuid",
  "userId": "uuid",
  "changes": {
    "status": "in_progress|completed",
    "due_date": "ISO-8601",
    "deliverables": ["string"]
  },
  "timestamp": "ISO-8601",
  "source": "user_action"
}
```

**Triggers:**
- ✓ Update milestone in database
- ✓ Notify client (if shared)
- ✓ Update project risk score

---

#### project:completed
**When:** Project fully delivered and accepted

**Data:**
```json
{
  "event": "project:completed",
  "projectId": "uuid",
  "userId": "uuid",
  "actual_timeline_days": "number",
  "estimated_timeline_days": "number",
  "actual_budget_spent": "number",
  "estimated_budget": "number",
  "completion_date": "ISO-8601",
  "timestamp": "ISO-8601",
  "source": "user_action"
}
```

**Triggers:**
- ✓ Calculate project profitability
- ✓ Store metrics for learning
- ✓ Prepare for invoicing
- ✓ Notify client

---

### Invoice Events

#### invoice:created
**When:** Invoice is generated (manually or automatically)

**Data:**
```json
{
  "event": "invoice:created",
  "invoiceId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "invoice_number": "string",
  "amount": "number",
  "gst_amount": "number",
  "total_amount": "number",
  "due_date": "ISO-8601",
  "line_items": [
    {
      "description": "string",
      "amount": "number"
    }
  ],
  "timestamp": "ISO-8601",
  "source": "user_action|system_auto"
}
```

**Triggers:**
- ✓ Generate PDF invoice
- ✓ Store invoice in database
- ✓ Prepare for sending

---

#### invoice:sent
**When:** Invoice is sent to client

**Data:**
```json
{
  "event": "invoice:sent",
  "invoiceId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "client_email": "string",
  "send_timestamp": "ISO-8601",
  "delivery_status": "pending|delivered|bounced",
  "timestamp": "ISO-8601",
  "source": "system_auto"
}
```

**Triggers:**
- ✓ Update invoice status to "sent"
- ✓ Record delivery timestamp
- ✓ Set reminder for overdue payment (if not paid in 30 days)

---

#### invoice:viewed
**When:** Client opens/views the invoice

**Data:**
```json
{
  "event": "invoice:viewed",
  "invoiceId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "viewed_timestamp": "ISO-8601",
  "viewer_ip": "string",
  "timestamp": "ISO-8601",
  "source": "system_tracking"
}
```

**Triggers:**
- ✓ Update invoice status to "viewed"
- ✓ Track engagement

---

#### invoice:paid
**When:** Payment received (via webhook or manual entry)

**Data:**
```json
{
  "event": "invoice:paid",
  "invoiceId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "amount_received": "number",
  "payment_method": "upi|bank_transfer|other",
  "transaction_id": "string",
  "payment_date": "ISO-8601",
  "timestamp": "ISO-8601",
  "source": "webhook|user_action"
}
```

**Triggers:**
- ✓ Update invoice status to "paid"
- ✓ Record payment in database
- ✓ Send receipt to client
- ✓ Notify freelancer (real-time)
- ✓ Update financial reports

---

#### invoice:overdue
**When:** Invoice payment is overdue (> 30 days unpaid)

**Data:**
```json
{
  "event": "invoice:overdue",
  "invoiceId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "days_overdue": "number",
  "amount_outstanding": "number",
  "timestamp": "ISO-8601",
  "source": "system_scheduled"
}
```

**Triggers:**
- ✓ Update invoice status to "overdue"
- ✓ Send reminder email to client
- ✓ Alert freelancer
- ✓ Flag for manual follow-up

---

### AI Events

#### ai:scope_analysis_requested
**When:** User requests AI analysis of project requirements

**Data:**
```json
{
  "event": "ai:scope_analysis_requested",
  "projectId": "uuid",
  "userId": "uuid",
  "raw_requirements": "string",
  "timestamp": "ISO-8601",
  "source": "user_action"
}
```

**Triggers:**
- ✓ Queue AI analysis job
- ✓ Send to AI service

---

#### ai:scope_analysis_completed
**When:** AI analysis completes

**Data:**
```json
{
  "event": "ai:scope_analysis_completed",
  "projectId": "uuid",
  "userId": "uuid",
  "analysis_result": {
    "requirements": ["string"],
    "deliverables": ["string"],
    "timeline_estimate": "number",
    "risks": ["string"]
  },
  "processing_time_ms": "number",
  "model_used": "string",
  "timestamp": "ISO-8601",
  "source": "ai_system"
}
```

**Triggers:**
- ✓ Broadcast to user (real-time)
- ✓ Store analysis in database
- ✓ Trigger project:scope_analyzed event

---

#### ai:risk_analysis_completed
**When:** AI completes risk analysis on project

**Data:**
```json
{
  "event": "ai:risk_analysis_completed",
  "projectId": "uuid",
  "userId": "uuid",
  "risks": [
    {
      "category": "scope|timeline|technical|dependency",
      "severity": "low|medium|high",
      "description": "string",
      "mitigation": "string"
    }
  ],
  "overall_risk_score": "number (0-100)",
  "timestamp": "ISO-8601",
  "source": "ai_system"
}
```

**Triggers:**
- ✓ Store risks in database
- ✓ Alert user if high-risk project
- ✓ Suggest mitigation strategies

---

### Payment Events

#### payment:webhook_received
**When:** Webhook received from payment provider (e.g., Razorpay)

**Data:**
```json
{
  "event": "payment:webhook_received",
  "provider": "razorpay|stripe|other",
  "webhook_event_type": "payment.authorized|payment.failed",
  "external_transaction_id": "string",
  "timestamp": "ISO-8601",
  "source": "webhook"
}
```

**Triggers:**
- ✓ Validate webhook signature
- ✓ Process payment
- ✓ Emit invoice:paid event

---

### User Events

#### user:signed_up
**When:** New user creates account

**Data:**
```json
{
  "event": "user:signed_up",
  "userId": "uuid",
  "email": "string",
  "name": "string",
  "timestamp": "ISO-8601",
  "source": "user_action"
}
```

**Triggers:**
- ✓ Send welcome email
- ✓ Create user onboarding flow

---

#### user:settings_updated
**When:** User updates profile or settings

**Data:**
```json
{
  "event": "user:settings_updated",
  "userId": "uuid",
  "changes": {
    "gst_registration": "yes|no",
    "gst_number": "string",
    "email": "string",
    "notification_preferences": {}
  },
  "timestamp": "ISO-8601",
  "source": "user_action"
}
```

**Triggers:**
- ✓ Update user profile
- ✓ Recalculate GST for future invoices

---

## 3. Event Distribution

### Event Bus Architecture

```
Event Source
    ↓
Event Bus (in-memory or Redis)
    ↓
┌─────────────┬────────────────┬──────────────┬────────────┐
│             │                │              │            │
↓             ↓                ↓              ↓            ↓
Database   WebSocket      Background    Audit Log     AI Memory
Writes     Broadcast      Jobs Queue    Storage       Storage
```

### Event Handlers

Each event can trigger multiple handlers:

```typescript
// Example: project:completed event triggers:

// 1. Calculate profitability
onEvent('project:completed', async (event) => {
  const profitability = calculateProfitability(event);
  await db.updateProject(event.projectId, { profitability });
});

// 2. Prepare for invoicing
onEvent('project:completed', async (event) => {
  await createInvoiceTemplate(event);
});

// 3. Notify user
onEvent('project:completed', async (event) => {
  await notifyUser(event.userId, 'Project complete - ready for invoicing');
});

// 4. Store in AI memory for learning
onEvent('project:completed', async (event) => {
  await storeInAIMemory(event);
});
```

### Event Publishing

```typescript
// Express route handling project creation
router.post('/projects', async (req, res) => {
  const project = await projectService.createProject(req.user.id, req.body);
  
  // Emit event after database insert succeeds
  await eventBus.emit('project:created', {
    projectId: project.id,
    userId: project.userId,
    title: project.title,
    budget: project.budget,
    timestamp: new Date().toISOString(),
    source: 'user_action',
  });
  
  res.status(201).json({ success: true, data: project });
});
```

---

## 4. Event Storage & Audit Trail

### Event Log

All events are stored in an immutable log:

```typescript
export const eventsTable = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  event_type: text('event_type').notNull(),  // e.g., "project:created"
  aggregate_id: uuid('aggregate_id').notNull(),  // projectId, invoiceId, etc.
  aggregate_type: text('aggregate_type').notNull(),  // e.g., "project"
  user_id: uuid('user_id'),  // Who triggered it
  data: jsonb('data').notNull(),  // Full event payload
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').notNull(),  // Event sequence
});

// Indexes for querying
CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_user ON events(user_id);
```

### Querying Event History

```typescript
// Get all events for a project
async function getProjectEventHistory(projectId: string) {
  return db.query.eventsTable.findMany({
    where: and(
      eq(eventsTable.aggregate_type, 'project'),
      eq(eventsTable.aggregate_id, projectId),
    ),
    orderBy: asc(eventsTable.timestamp),
  });
}

// Rebuild project state from events
async function rebuildProjectState(projectId: string) {
  const events = await getProjectEventHistory(projectId);
  
  let project = {};
  for (const event of events) {
    project = applyEventToState(project, event);
  }
  
  return project;
}
```

---

## 5. Real-Time Updates via WebSocket

### Event Broadcasting

Certain events are broadcast to connected clients in real-time:

```typescript
// Backend: Emit event
await eventBus.emit('project:scope_analyzed', {
  projectId,
  analysis: aiResult,
  timestamp: new Date().toISOString(),
});

// Event listener broadcasts to WebSocket
onEvent('project:scope_analyzed', (event) => {
  io.to(`project:${event.projectId}`).emit('scope_analyzed', {
    analysis: event.analysis,
  });
});

// Frontend: Listen for updates
socket.on('scope_analyzed', (data) => {
  // Update UI with AI analysis
  setScopeAnalysis(data.analysis);
});
```

### Real-Time Notifications

```typescript
// Backend: Send notification on important events
onEvent('scope_drift_detected', async (event) => {
  await notificationService.send(event.userId, {
    title: 'Scope Drift Detected',
    message: `New request detected outside original scope`,
    link: `/projects/${event.projectId}`,
  });
});

// Real-time via WebSocket
io.to(`user:${event.userId}`).emit('notification', {
  type: 'scope_drift_detected',
  projectId: event.projectId,
  message: event.suggested_action,
});
```

---

## 6. Background Jobs from Events

### Job Queue Integration

Events trigger async background jobs:

```typescript
// Event triggers job
onEvent('invoice:sent', async (event) => {
  // Schedule email delivery reminder in 3 days
  await jobQueue.add('payment_reminder', {
    invoiceId: event.invoiceId,
    userId: event.userId,
  }, {
    delay: 3 * 24 * 60 * 60 * 1000,  // 3 days
  });
});

// Job processes later
jobQueue.process('payment_reminder', async (job) => {
  const invoice = await getInvoice(job.data.invoiceId);
  if (invoice.status !== 'paid') {
    await sendPaymentReminder(invoice);
  }
});
```

### Job Types from Events

| Event | Job Type | Delay | Purpose |
|-------|----------|-------|---------|
| invoice:sent | send_email | immediate | Send invoice PDF |
| invoice:sent | payment_reminder | 3 days | Remind if not paid |
| invoice:overdue | send_reminder | immediate | Alert client |
| project:completed | create_retrospective | immediate | Prompt user for feedback |
| ai:scope_analysis_completed | store_training_data | immediate | Store for AI learning |

---

## 7. Event Schema & Validation

### Event Structure

Every event must follow:

```typescript
interface Event {
  event: string;              // e.g., "project:created"
  aggregate_id: string;       // UUID of entity (project, invoice, etc.)
  aggregate_type: string;     // e.g., "project"
  user_id?: string;           // Who triggered it (if user action)
  timestamp: string;          // ISO-8601 timestamp
  source: 'user_action' | 'system_auto' | 'ai_system' | 'webhook';
  data: Record<string, any>;  // Event-specific payload
}
```

### Event Validation

```typescript
// Zod schema for event validation
const eventSchema = z.object({
  event: z.string(),
  aggregate_id: z.string().uuid(),
  aggregate_type: z.string(),
  user_id: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  source: z.enum(['user_action', 'system_auto', 'ai_system', 'webhook']),
  data: z.record(z.any()),
});

// Validate before storing
const validEvent = eventSchema.parse(eventData);
await eventBus.emit(validEvent.event, validEvent);
```

---

## 8. Future: Event Sourcing

### Why Event Sourcing?

Event sourcing is a pattern where:
- State is derived from events
- Events are the source of truth
- System is auditable by design
- Can replay history

**Timeline:**
- Year 1: Event-driven (current)
- Year 2: Consider full event sourcing
- Year 3+: Implement if needed for audit/compliance

### Event Sourcing Example

```typescript
// Instead of: UPDATE projects SET status = 'completed'

// Event sourcing: Store events, derive state
await eventBus.emit('project:completed', {
  projectId,
  completedAt: new Date(),
  // ... other data
});

// Rebuild project state from events
function getProjectState(projectId: string) {
  const events = getProjectEvents(projectId);
  let state = initialState;
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}
```

---

## 9. Related Documentation

- See `docs/01-product/business-workflows.md` for business processes that generate events
- See `docs/02-engineering/database.md` for event storage implementation
- See `05-operations-quality.md` for event monitoring and alerting

---

**End of Event Model Documentation**

For questions or updates, contact the engineering team.
