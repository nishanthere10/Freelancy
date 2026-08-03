# Database Design & Normalization

**Version:** 1.0  
**Last Updated:** August 2, 2026  
**Status:** Production Ready  
**Owner:** Engineering Team

---

## Overview

This document details the database design for Freelance OS, including entity relationships, normalization strategy, and design patterns. It complements `database.md` (which covers technology choices) and `drizzle-schema.md` (which covers implementation).

---

## 1. Core Entity Model

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Users                              │
│  (freelancers, agents, admins)                          │
│  ├─ id (PK)                                             │
│  ├─ email                                               │
│  ├─ name                                                │
│  ├─ gst_registered (Y/N)                               │
│  └─ gst_number                                          │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴────────────┬──────────────────┐
    ↓                     ↓                  ↓
┌─────────┐         ┌──────────┐       ┌──────────────┐
│Projects │         │Invoices  │       │AI Memory     │
│(1:many) │         │(1:many)  │       │(1:many)      │
│         │         │          │       │              │
│ ├─ id   │         │ ├─ id    │       │ ├─ id        │
│ ├─ title│◄────────┤ ├─ amount│       │ ├─ role      │
│ ├─ budget         │ ├─ gst   │       │ ├─ content   │
│ └─ status         │ └─ status        │ └─ timestamp │
└────┬────┘         └──────────┘       └──────────────┘
     │
     ├─────────────┐
     ↓             ↓
┌──────────┐  ┌──────────────┐
│Milestones│  │Scope Analysis│
│(1:many)  │  │(1:1)         │
│          │  │              │
│ ├─ id    │  │ ├─ id        │
│ ├─ title │  │ ├─ requirements
│ ├─ status│  │ ├─ deliverables
│ └─ due_at│  │ ├─ risks
└──────────┘  │ └─ timeline_est
              └──────────────┘
```

### Entity Descriptions

#### Users
- **Purpose:** Store freelancer/agent information
- **Key fields:** email (unique), name, GST registration status, GST number
- **Relationships:** One user has many projects, invoices, AI memories

#### Projects
- **Purpose:** Store project information and track project lifecycle
- **Key fields:** title, description, budget, status (active, completed, archived)
- **Relationships:** One user has many projects; one project has many milestones, invoices, scope analyses

#### Milestones
- **Purpose:** Track project milestones and deliverables
- **Key fields:** title, description, due date, status, deliverables
- **Relationships:** One project has many milestones

#### Invoices
- **Purpose:** Store invoice data for billing
- **Key fields:** invoice number, amount, GST amount, total amount, status
- **Relationships:** One project has many invoices; one user has many invoices

#### Scope Analysis
- **Purpose:** Store AI-generated scope analysis
- **Key fields:** requirements, deliverables, timeline estimate, risks, confidence score
- **Relationships:** One project has one scope analysis (1:1)

#### AI Memory
- **Purpose:** Store AI conversation and context history
- **Key fields:** role (user/assistant), content, timestamp
- **Relationships:** One project has many AI memories

---

## 2. Normalization Strategy

### Why Normalization?

We normalize to 3rd Normal Form (3NF) for these reasons:

| Reason | Benefit |
|--------|---------|
| **Eliminates data duplication** | Update user name in one place |
| **Ensures data consistency** | No contradictory data |
| **Reduces storage** | Don't repeat data unnecessarily |
| **Enables clear relationships** | Foreign keys establish domain model |
| **Supports transactions** | ACID operations work correctly |

### Normalization Example

**❌ WRONG (Denormalized):**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID,
  user_email TEXT,        -- Duplicates users table
  user_name TEXT,         -- Duplicates users table
  user_gst_registered BOOLEAN,  -- Duplicates users table
  project_title TEXT,     -- Duplicates projects table
  amount NUMERIC,
  status TEXT
);
```

**Problems:**
- Changing user email requires updating multiple invoice rows
- Risk of inconsistency (user_email in invoices differs from users table)
- Storage waste (repeating user data for every invoice)

**✅ CORRECT (Normalized to 3NF):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  gst_registered BOOLEAN,
  gst_number TEXT
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  amount NUMERIC,
  status TEXT
);
```

**Benefits:**
- User email updated in one place
- Consistent data across all tables
- Storage efficient
- Clear foreign key relationships

### Denormalization Policy

We **denormalize strategically** only when:

1. **Performance is critical** (measured, not assumed)
2. **Query pattern is repetitive** and cannot be optimized via index
3. **Trade-off is documented** (in code comments or ADR)
4. **Sync strategy is clear** (how to keep denormalized data fresh)

**Example: Storing user_name in invoices**

If queries frequently fetch `invoices WITH user_name`, we might store it:

```sql
-- Denormalized (intentional for performance)
ALTER TABLE invoices ADD COLUMN cached_user_name TEXT;

-- Must keep in sync
CREATE TRIGGER update_invoice_user_name
AFTER UPDATE ON users
FOR EACH ROW
UPDATE invoices SET cached_user_name = NEW.name WHERE user_id = NEW.id;
```

---

## 3. Key Relationships

### One-to-Many (Project → Milestones)

```
One user has MANY projects
│
└─→ One project has MANY milestones
    └─→ One milestone belongs to ONE project
```

**Implementation:**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL
);

CREATE TABLE milestones (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE
);
```

**Query pattern:**
```typescript
// Get all milestones for a project (eager loading)
const project = await db.query.projects.findUnique({
  where: { id: projectId },
  with: { milestones: true }  // Single query
});
```

### One-to-One (Project → Scope Analysis)

```
One project has ONE scope analysis
One scope analysis belongs to ONE project
```

**Implementation:**
```sql
CREATE TABLE scope_analyses (
  id UUID PRIMARY KEY,
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id),
  requirements JSONB,
  deliverables TEXT[],
  risks JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Query pattern:**
```typescript
// Get project with scope analysis
const project = await db.query.projects.findUnique({
  where: { id: projectId },
  with: { scopeAnalysis: true }  // Single query
});
```

### Many-to-Many (Future: Collaborators)

When we add team collaboration:

```
One project has MANY collaborators
One user can collaborate on MANY projects
```

**Implementation:**
```sql
CREATE TABLE project_collaborators (
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'viewer',  -- editor, viewer, owner
  PRIMARY KEY (project_id, user_id)
);
```

---

## 4. Design Patterns

### Soft Deletes

All business entities support soft deletes:

```sql
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;

-- Mark as deleted (not actually deleted)
UPDATE projects SET deleted_at = NOW() WHERE id = '...';

-- Always filter in queries
SELECT * FROM projects WHERE deleted_at IS NULL;

-- Restore deleted
UPDATE projects SET deleted_at = NULL WHERE id = '...';
```

**Benefits:**
- Users can recover deleted projects
- Audit trail preserved
- References to deleted records still valid
- Comply with retention policies

### Audit Columns

Every business entity has audit columns:

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  
  -- Audit columns
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP
);
```

**Query to see who changed what:**
```sql
SELECT created_by, created_at, updated_by, updated_at
FROM projects WHERE id = '...';
```

### Status Enum Pattern

Use constrained types for status fields:

```sql
-- Option 1: Check constraint
ALTER TABLE projects ADD CONSTRAINT project_status_check
CHECK (status IN ('active', 'completed', 'archived'));

-- Option 2: PostgreSQL enum
CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');
ALTER TABLE projects ADD COLUMN status project_status DEFAULT 'active';

-- Option 3: Text with validation (in application)
-- Validate in Drizzle schema (preferred for flexibility)
```

**Benefits:**
- Database enforces valid values
- Prevents invalid status
- Clear documentation of valid states

---

## 5. Indexes Strategy

### Query Patterns & Indexes

Based on expected queries, create indexes:

```sql
-- High-frequency queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);

-- Composite indexes for combined searches
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);

-- Partial indexes (only index active records)
CREATE INDEX idx_projects_active ON projects(user_id)
WHERE deleted_at IS NULL;

-- Reverse sort by date (common pattern)
CREATE INDEX idx_projects_created_desc ON projects(user_id, created_at DESC)
WHERE deleted_at IS NULL;
```

### Index Monitoring

```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Find missing indexes (from slow query log)
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 6. Transactions

### ACID Compliance

PostgreSQL guarantees ACID properties within transactions:

```typescript
// Transaction: Create project and emit event
async function createProjectWithEvent(userId: string, data: CreateProjectInput) {
  return db.transaction(async (tx) => {
    // All-or-nothing: Either both succeed or both fail
    
    const [project] = await tx.insert(projectsTable).values({
      userId,
      title: data.title,
      budget: data.budget,
      createdAt: new Date(),
    }).returning();
    
    // If this fails, entire transaction rolls back
    await eventBus.emit('project:created', {
      projectId: project.id,
      userId,
    });
    
    return project;
  });
}
```

**Isolation Levels:**

| Level | Use Case | Trade-off |
|-------|----------|-----------|
| **READ UNCOMMITTED** | N/A (PostgreSQL treats as READ COMMITTED) | - |
| **READ COMMITTED** | Default; sufficient for most operations | May see phantom reads |
| **REPEATABLE READ** | Prevent non-repeatable reads | Slightly slower |
| **SERIALIZABLE** | Financial transactions; strictest | Slowest; most conflicts |

### Transaction Size

Keep transactions small:

```typescript
// ✅ GOOD: Small, focused transaction
async function updateProjectStatus(projectId: string) {
  return db.transaction(async (tx) => {
    const [project] = await tx.update(projectsTable)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId))
      .returning();
    
    return project;
  });
}

// ❌ BAD: Large transaction with external service call
async function updateProjectStatus(projectId: string) {
  return db.transaction(async (tx) => {
    // ... update project
    
    // DON'T call external API inside transaction
    // If API is slow, locks database for longer
    await callExternalAPI();  // ← WRONG
    
    return project;
  });
}
```

---

## 7. Data Types & Constraints

### Choosing Correct Data Types

| Field | Type | Why | Example |
|-------|------|-----|---------|
| **IDs** | UUID | Globally unique, not sequential | `'550e8400-e29b-41d4-a716-446655440000'` |
| **Email** | TEXT + UNIQUE | Standard, indexed | `'user@example.com'` |
| **Money** | NUMERIC(12,2) | Exact precision for financial | `'9999999999.99'` |
| **Status** | TEXT or ENUM | Constrained values | `'active'` |
| **Dates** | TIMESTAMP | With timezone recommended | `'2026-08-02T10:30:00Z'` |
| **JSON Data** | JSONB | Queryable, indexed | `'{"key": "value"}'` |
| **Arrays** | TEXT[] or JSONB | For lists of data | `'["item1", "item2"]'` |

### Field Constraints

```sql
CREATE TABLE users (
  -- NOT NULL: Field required
  id UUID PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,  -- UNIQUE: No duplicates
  
  -- DEFAULT: Automatic value if not provided
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- CHECK: Validate value at database level
  gst_percentage INT CHECK (gst_percentage IN (0, 5, 12, 18, 28))
);
```

---

## 8. Foreign Key Strategy

### Cascading Deletes

```sql
-- Option 1: CASCADE (delete child records)
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
  -- If user deleted, all projects deleted
);

-- Option 2: SET NULL (nullify foreign key)
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL
  -- If user deleted, invoices.user_id becomes NULL
);

-- Option 3: RESTRICT (prevent deletion)
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT
  -- Cannot delete invoice if payments reference it
);
```

**Strategy for Freelance OS:**
- User → Projects: CASCADE (delete user's projects)
- Project → Invoices: CASCADE (delete project's invoices)
- Invoice → Payments: RESTRICT (prevent invoice deletion if payments exist)
- AI Memory: CASCADE (cleanup on project deletion)

---

## 9. Backup & Recovery

### Backup Strategy

Neon provides automated backups:

```
Daily backup at 2 AM UTC
├─ Point-in-time recovery: 30 days
├─ Retention: 90 days
└─ Can restore to any timestamp
```

### Recovery Procedures

**Restore entire database:**
```bash
neon database restore \
  --database freelance-os \
  --timestamp 2026-08-01T10:00:00Z
```

**Export specific tables:**
```bash
pg_dump -h neon.tech \
  -U postgres \
  -d freelance-os \
  -t projects \
  > projects_backup.sql
```

---

## 10. Scaling Considerations

### Current Limitations

```
Single PostgreSQL instance → Can handle 10k-100k concurrent users
├─ Connections: 100-500 max
├─ QPS (queries/sec): 5k-10k
└─ Storage: ~1TB before performance degradation
```

### Future Scaling Path

**Year 1 (Current):**
- Single Neon instance
- Vertical scaling only
- Read replicas via Neon

**Year 2:**
- Separate read replica for analytics
- Redis caching layer
- Connection pooling optimization

**Year 3+:**
- Sharding by user_id (if needed)
- Separate analytics database
- Event sourcing for audit trail

---

## 11. Design Decisions (ADRs)

### ADR-001: 1:1 Foreign Keys vs. Shared Table

**Decision:** Use separate `scope_analyses` table with foreign key to `projects`

**Rationale:**
- Scope analysis is large (JSONB with requirements, risks, etc.)
- Not always needed in project queries
- Clear separation of concerns

**Alternative:** Store scope analysis directly in projects table (added complexity)

### ADR-002: Soft Deletes vs. Hard Deletes

**Decision:** Use soft deletes for all business entities

**Rationale:**
- Users can recover deleted data
- Audit trail preserved
- Compliance with retention policies

**Trade-off:** Must always filter WHERE deleted_at IS NULL (handled by repository layer)

### ADR-003: Enum Fields vs. Check Constraints

**Decision:** Use Drizzle schema enums (application-level) instead of PostgreSQL enums

**Rationale:**
- Easier to add new statuses
- Can deprecate statuses
- More flexible for evolution

**Trade-off:** Less database-level validation (but caught by application)

---

## 12. Related Documentation

- See `database.md` for technology choices and ORM selection
- See `drizzle-schema.md` for implementation details
- See `event-model.md` for events triggered by data changes
- See `01-product/business-workflows.md` for business processes that drive schema design

---

**End of Database Design Documentation**

For questions or updates, contact the engineering team.
