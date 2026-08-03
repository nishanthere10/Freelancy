# Database Design & Strategy

**Version:** 1.0  
**Last Updated:** August 2, 2026  
**Status:** Production Ready  
**Owner:** Engineering Team

---

## 1. Database Choice: Neon PostgreSQL

### Why PostgreSQL?

We chose PostgreSQL as our primary database for these reasons:

| Reason | Benefit | Why It Matters |
|--------|---------|-----------------|
| **ACID Transactions** | Guarantees data consistency | Critical for financial data (invoices, payments) |
| **Strong Schema Enforcement** | Prevents invalid data at the database level | Catches bugs early, before they reach users |
| **Powerful Query Language** | Complex queries possible without denormalization | Reduces application complexity |
| **Mature Ecosystem** | 20+ years of proven performance | Can handle 100k+ concurrent users |
| **Native JSON Support** | Store semi-structured data when needed | Flexibility without sacrificing integrity |
| **Advanced Features** | Full-text search, arrays, ranges, custom types | Enables sophisticated queries |
| **Open Source** | No vendor lock-in | Can self-host if needed |

### Why Neon (Managed PostgreSQL)?

We chose Neon instead of self-hosted PostgreSQL:

| Feature | Benefit |
|---------|---------|
| **Serverless** | Auto-scaling, no ops overhead |
| **Connection Pooling** | Built-in PgBouncer for connection management |
| **Branching** | Create database copies for dev/staging |
| **Automated Backups** | Daily backups, point-in-time recovery |
| **CLI Integration** | Local development matches production |
| **Web Console** | Easy database administration |
| **Managed Updates** | PostgreSQL version updates handled automatically |

### Alternatives Considered

| Alternative | Why We Didn't Choose It |
|-------------|------------------------|
| **Self-Hosted PostgreSQL** | Requires DevOps expertise; harder to scale; more operational burden |
| **Supabase** | Good but adds auth/realtime we don't need; Neon is more lightweight |
| **PlanetScale (MySQL)** | Optimized for sharding; we don't need sharding at our scale |
| **MongoDB** | Document-based; freelancer data is highly structured; PostgreSQL is better |
| **DynamoDB** | Expensive at our query patterns; PostgreSQL is more cost-effective |

### Trade-offs

**Advantages of Neon:**
- ✅ Minimal operational overhead
- ✅ Auto-scaling built-in
- ✅ Cost-effective for startup
- ✅ Easy local development

**Disadvantages:**
- ❌ Less control than self-hosted
- ❌ Vendor lock-in (though PostgreSQL is portable)
- ❌ Some features require professional tier

**Decision:** The simplicity and cost-effectiveness outweigh the control trade-off at startup stage.

---

## 2. ORM Choice: Drizzle

### Why Drizzle ORM?

We chose Drizzle over other ORMs for these reasons:

| Criterion | Drizzle | Prisma | TypeORM | Winner |
|-----------|---------|--------|---------|--------|
| **Type Safety** | Excellent (generates from schema) | Good | Good | Drizzle |
| **SQL Control** | Full control; write SQL when needed | Limited | Full control | Drizzle |
| **Performance** | ~10KB bundle; minimal overhead | ~100KB; some overhead | ~200KB | Drizzle |
| **Learning Curve** | SQL knowledge sufficient | Very beginner-friendly | Steep | Prisma |
| **Ecosystem** | Growing, modern | Massive, mature | Large | Prisma |
| **Migration Support** | Manual or automatic | Automatic | Manual | Prisma |
| **Relationships** | Explicit relations | Auto-inferred | Decorators | Tie |

### Why Drizzle Won

```
Drizzle Score: SQL-first + Type-safe + Lightweight + Full control = Best fit
Prisma Score: Beginner-friendly + Automatic migrations, but less control
TypeORM Score: Full control but heavy, steep learning curve
```

For a startup building a complex domain (freelancer projects, invoicing, AI context), Drizzle provides:
- ✅ Full SQL control when needed
- ✅ Excellent type safety
- ✅ Small bundle size (important for serverless)
- ✅ Perfect for DDD (Domain-Driven Design) approach

---

## 3. Database Schema

### Core Entities

```
Users
  ├── Freelancers (1:1)
  └── Clients (1:1)

Projects (User → Projects 1:many)
  ├── Milestones (Project → Milestones 1:many)
  ├── Scope Analysis (Project → Scope 1:1)
  └── Invoices (Project → Invoices 1:many)

Invoices (User → Invoices 1:many)
  ├── Line Items (Invoice → LineItems 1:many)
  └── Payments (Invoice → Payments 1:many)

AI Memory (Project → AI Memory 1:many)
  └── Conversation history, context
```

### Schema Design Principles

#### 1. Normalization (3NF)

Data is normalized to reduce redundancy:

```sql
-- ✅ GOOD: Normalized
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

-- ❌ BAD: Denormalized
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  user_email TEXT,      -- Duplicates users table
  user_name TEXT,       -- Duplicates users table
  title TEXT NOT NULL
);
```

**Why normalization?**
- Reduces data duplication
- Prevents inconsistencies
- Easier to update data
- DENORMALIZATION added only when measured to improve performance

#### 2. Explicit Type System

Every column has a clear, specific type:

```typescript
// ✅ GOOD: Explicit types
id: uuid('id').primaryKey().defaultRandom(),
email: text('email').notNull().unique(),
budget: numeric('budget', { precision: 12, scale: 2 }).notNull(),  // 12 digits, 2 decimals
status: text('status').notNull().default('active'),  // Specific values
createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),

// ❌ BAD: Vague types
data: text('data').notNull(),  // What's in this data?
value: numeric('value'),       // Is it money? Units? Percentage?
meta: jsonb('meta'),           // Undocumented structure
```

#### 3. Audit Columns

Every business entity has audit columns:

```typescript
export const projectsTable = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  budget: numeric('budget', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('active'),
  
  // Audit columns (on every entity)
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid('created_by'),  // Who created it?
  updatedBy: uuid('updated_by'),  // Who last modified it?
  deletedAt: timestamp('deleted_at', { withTimezone: true }),  // Soft delete
});
```

**Why audit columns?**
- Track when data changed
- Track who made changes
- Enable reversibility
- Support compliance/audit trails

#### 4. Soft Deletes

Data is never permanently deleted; instead marked as deleted:

```typescript
// Soft delete: Mark record as deleted
async deleteProject(id: string) {
  return db.update(projectsTable)
    .set({ deletedAt: new Date() })
    .where(eq(projectsTable.id, id));
}

// Always filter out deleted records
async getActiveProjects(userId: string) {
  return db.query.projectsTable.findMany({
    where: and(
      eq(projectsTable.userId, userId),
      isNull(projectsTable.deletedAt)  // Exclude deleted
    ),
  });
}
```

**Why soft deletes?**
- Users can recover deleted data
- Audit trail remains intact
- References to deleted records don't break
- Compliance requirements (keep data for audit period)

#### 5. Foreign Keys

All relationships are enforced at the database level:

```typescript
export const projectsTable = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    // ... other columns
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',  // If user deleted, cascade delete projects
    }),
  ]
);
```

**Why foreign keys?**
- Prevents orphaned records (project without user)
- Database enforces referential integrity
- No need for manual validation

---

## 4. Relationships & Queries

### One-to-Many Relationships

```typescript
export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  // Each project belongs to one user
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  
  // Each project has many milestones
  milestones: many(milestonesTable),
  
  // Each project has many invoices
  invoices: many(invoicesTable),
}));

export const milestonesRelations = relations(milestonesTable, ({ one, many }) => ({
  // Each milestone belongs to one project
  project: one(projectsTable, {
    fields: [milestonesTable.projectId],
    references: [projectsTable.id],
  }),
}));
```

### Eager Loading

Query related data in a single query:

```typescript
// ✅ GOOD: Eager load related data (single query)
const projects = await db.query.projectsTable.findMany({
  where: eq(projectsTable.userId, userId),
  with: {
    user: true,           // Include user details
    milestones: true,     // Include all milestones
    invoices: true,       // Include all invoices
  },
});

// ❌ BAD: N+1 queries (one query per project)
const projects = await db.query.projectsTable.findMany();
for (const project of projects) {
  const milestones = await db.query.milestonesTable.findMany({
    where: eq(milestonesTable.projectId, project.id),
  });
}
```

### Pagination

All list endpoints support pagination:

```typescript
// Query with pagination
const pageSize = 20;
const page = (req.query.page as number) || 1;
const offset = (page - 1) * pageSize;

const [projects, total] = await Promise.all([
  db.query.projectsTable.findMany({
    where: eq(projectsTable.userId, userId),
    limit: pageSize,
    offset,
  }),
  db.select({ count: sql<number>`count(*)` })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId)),
]);

return {
  success: true,
  data: projects,
  pagination: {
    total: total[0].count,
    page,
    pageSize,
    pages: Math.ceil(total[0].count / pageSize),
  },
};
```

---

## 5. Indexes

### When to Index

Index columns that are:
- ✅ Frequently searched (WHERE clause)
- ✅ Frequently sorted (ORDER BY clause)
- ✅ Used in joins (ON clause)
- ✅ Foreign keys (automatically indexed by Neon)

### Index Strategy

```sql
-- Indexes for common queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- Composite indexes for common query combinations
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);

-- Partial indexes (only index non-deleted records)
CREATE INDEX idx_projects_active ON projects(user_id) 
  WHERE deleted_at IS NULL;
```

### Index Monitoring

```sql
-- Find missing indexes (slow queries without indexes)
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 6. Transactions

### ACID Transactions

PostgreSQL guarantees ACID properties within transactions:

```typescript
// Transaction: Create project and emit event
async function createProjectWithEvent(userId: string, data: CreateProjectInput) {
  return db.transaction(async (tx) => {
    // Create project
    const [project] = await tx.insert(projectsTable).values({
      ...data,
      userId,
      createdAt: new Date(),
    }).returning();
    
    // Emit event (triggers notification, background jobs, etc.)
    await eventBus.emit('project:created', {
      projectId: project.id,
      userId,
      title: project.title,
    });
    
    return project;
  });
}
```

**If either step fails:**
- Project creation is rolled back
- Event is not emitted
- User sees error; no partial state

### When to Use Transactions

Use transactions when:
- ✅ Multiple statements must succeed together
- ✅ Financial operations (invoice + payment must both succeed)
- ✅ Data consistency is critical
- ✅ Cascading effects needed

Don't over-use transactions:
- ❌ Single-statement operations (automatic)
- ❌ Read-only operations
- ❌ Operations that call external services (takes too long)

---

## 7. Migrations

### Migration Strategy

Migrations are version-controlled and tracked:

```
migrations/
  ├── 001_init.sql          # Initial schema
  ├── 002_add_projects.sql  # Add projects table
  ├── 003_add_invoices.sql  # Add invoices table
  └── 004_add_scope_analysis.sql
```

### Zero-Downtime Migrations

Production migrations must be zero-downtime:

**Adding Columns (safe):**
```sql
-- Always include DEFAULT for new NOT NULL columns
ALTER TABLE projects ADD COLUMN description TEXT DEFAULT '';

-- Make column NOT NULL after populating existing rows
UPDATE projects SET description = '' WHERE description IS NULL;
ALTER TABLE projects ALTER COLUMN description SET NOT NULL;
```

**Removing Columns (requires care):**
```sql
-- Step 1: Stop application from using column
-- Step 2: Deploy application changes
-- Step 3: Remove column from database
ALTER TABLE projects DROP COLUMN legacy_field;
```

**Adding Constraints (requires care):**
```sql
-- Don't add constraints to columns with NULL values
-- Step 1: Add column with DEFAULT
ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';

-- Step 2: Populate existing rows
UPDATE projects SET status = 'active';

-- Step 3: Add constraint
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
```

### Migration Testing

```bash
# Run migrations locally
npm run db:migrate

# Verify migrations work
npm run db:migrate:verify

# Test rollback
npm run db:migrate:rollback

# Verify rollback worked
npm run db:migrate:verify
```

---

## 8. Backup & Disaster Recovery

### Backup Strategy

| Backup Type | Frequency | Retention | Purpose |
|-------------|-----------|-----------|---------|
| **Automated** | Hourly | 30 days | Point-in-time recovery |
| **Daily** | Once per day | 90 days | Long-term retention |
| **Weekly** | Once per week | 1 year | Compliance/audit |

### Point-in-Time Recovery (PITR)

```bash
# Neon automatically keeps 30 days of WAL (Write-Ahead Logs)
# Can recover to any point within 30 days

# Example: Recover to specific timestamp
neon database restore \
  --database freelance-os \
  --timestamp 2026-08-02T10:30:00Z
```

### Disaster Recovery SLA

- **RTO (Recovery Time Objective):** < 30 minutes
- **RPO (Recovery Point Objective):** < 1 hour

---

## 9. Performance Optimization

### Query Optimization

**Identify slow queries:**
```sql
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 20;
```

**Optimize using indexes:**
```typescript
// Before: Slow query (no index)
const projects = await db.query.projectsTable.findMany({
  where: eq(projectsTable.status, 'active'),
});
// Query time: 500ms (full table scan)

// After: With index (much faster)
CREATE INDEX idx_projects_status ON projects(status);
// Query time: 2ms (index scan)
```

### Connection Pooling

Neon includes built-in PgBouncer for connection management:

```typescript
// Connection pooling handled automatically
// Max connections in pool: 20 (Vercel Free tier)
// Idle timeout: 30 seconds

// Drain connections gracefully on shutdown
process.on('SIGTERM', async () => {
  await db.close();
  process.exit(0);
});
```

### Caching Strategy

```typescript
// Cache frequently-accessed data
const getCachedUser = async (userId: string) => {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const user = await db.query.usersTable.findUnique({
    where: eq(usersTable.id, userId),
  });
  
  // Cache for 1 hour
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
  
  return user;
};

// Invalidate cache on updates
await db.update(usersTable).set(updates).where(...);
await redis.del(`user:${userId}`);
```

---

## 10. Monitoring & Observability

### Key Database Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Query Time (p95)** | < 100ms | > 250ms for 5 min |
| **Query Time (p99)** | < 250ms | > 500ms for 5 min |
| **Active Connections** | < 50 | > 80 connections |
| **Replication Lag** | < 1s | > 10s for 5 min |
| **Cache Hit Ratio** | > 90% | < 80% |
| **Disk Usage** | < 80% | > 90% |
| **Transaction Rollbacks** | ~0 | > 0 per minute |

### Logging Queries

```typescript
// Log all queries in development
if (process.env.NODE_ENV === 'development') {
  db.on('query', (query) => {
    console.log('Query:', query.sql);
    console.log('Duration:', query.duration, 'ms');
  });
}

// Log slow queries in production
db.on('query', (query) => {
  if (query.duration > 1000) {
    logger.warn('Slow query', {
      sql: query.sql,
      duration: query.duration,
      timestamp: new Date(),
    });
  }
});
```

---

## 11. Database Schema Example

Complete example schema for reference:

```typescript
// packages/database/src/schema/index.ts
import { pgTable, text, uuid, timestamp, numeric, relations } from 'drizzle-orm/pg-core';
import { eq, isNull } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  gstRegistered: text('gst_registered').default('no'),  // 'yes' or 'no'
  gstNumber: text('gst_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Projects table
export const projectsTable = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    budget: numeric('budget', { precision: 12, scale: 2 }).notNull(),
    status: text('status').notNull().default('active'),  // active, completed, archived
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
  ]
);

// Invoices table
export const invoicesTable = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),
    invoiceNumber: text('invoice_number').notNull().unique(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    gstAmount: numeric('gst_amount', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: text('status').notNull().default('draft'),  // draft, sent, paid, overdue
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projectsTable.id],
      onDelete: 'cascade',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      onDelete: 'cascade',
    }),
  ]
);

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  projects: many(projectsTable),
  invoices: many(invoicesTable),
}));

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  invoices: many(invoicesTable),
}));

export const invoicesRelations = relations(invoicesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [invoicesTable.projectId],
    references: [projectsTable.id],
  }),
  user: one(usersTable, {
    fields: [invoicesTable.userId],
    references: [usersTable.id],
  }),
}));
```

---

## 12. Common Queries

### Create with Relationships

```typescript
async createProjectWithMilestones(userId: string, data: {
  title: string;
  budget: number;
  milestones: Array<{ title: string; dueDate: Date }>;
}) {
  return db.transaction(async (tx) => {
    // Create project
    const [project] = await tx.insert(projectsTable).values({
      userId,
      title: data.title,
      budget: data.budget,
    }).returning();
    
    // Create milestones
    const milestones = await tx.insert(milestonesTable).values(
      data.milestones.map(m => ({
        projectId: project.id,
        title: m.title,
        dueDate: m.dueDate,
      }))
    ).returning();
    
    return { project, milestones };
  });
}
```

### Update with Validation

```typescript
async updateProject(projectId: string, userId: string, data: Partial<Project>) {
  // Verify user owns project
  const project = await db.query.projectsTable.findUnique({
    where: eq(projectsTable.id, projectId),
  });
  
  if (project.userId !== userId) {
    throw new AuthorizationError('You cannot modify this project');
  }
  
  // Update
  const [updated] = await db.update(projectsTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, projectId))
    .returning();
  
  return updated;
}
```

### Query with Filtering

```typescript
async getFilteredProjects(userId: string, filters: {
  status?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}) {
  let query = db.query.projectsTable.findMany({
    where: and(
      eq(projectsTable.userId, userId),
      isNull(projectsTable.deletedAt),
    ),
  });
  
  if (filters.status) {
    query = query.where(eq(projectsTable.status, filters.status));
  }
  
  if (filters.createdAfter) {
    query = query.where(gte(projectsTable.createdAt, filters.createdAfter));
  }
  
  if (filters.createdBefore) {
    query = query.where(lte(projectsTable.createdAt, filters.createdBefore));
  }
  
  return query.orderBy(desc(projectsTable.createdAt));
}
```

---

## 13. Future Scaling

### Current Limitations

- Single PostgreSQL instance: ~10k concurrent connections
- Storage: ~1TB before performance degradation
- Query throughput: ~10k queries/second

### Scaling Path (Year 2+)

```
Year 1 (Current)
  Single Neon instance
  Vertical scaling only
  
Year 2
  Read replicas for analytics
  Connection pooling optimization
  Caching layer (Redis)
  
Year 3+
  Sharding by user_id
  Separate analytics database
  Event sourcing for audit trail
```

---

## 14. Related Documentation

- See `03-engineering-context.md` for database architecture decisions
- See `05-operations-quality.md` for backup and disaster recovery
- See `06-ADRs/ADR-003-neon.md` for detailed rationale on Neon choice

---

**End of Database Documentation**

For questions or updates, contact the engineering team.
