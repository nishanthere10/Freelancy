# Sprint 1: Workspace Foundation

**Version:** 1.0  
**Status:** Phase 1 Complete  
**Date:** August 2, 2026

---

## Executive Summary

Sprint 1 Phase 1 implements the Workspace feature - the foundational domain for Freelance OS. This phase covers:

1. **Database Schema** - Workspace and WorkspaceMember tables with relations
2. **Database Migration** - SQL migration for PostgreSQL
3. **Repository Layer** - CRUD operations with Drizzle ORM
4. **Tests** - Unit tests for repository functionality

This is a **backend-only implementation**. No frontend, services, or routes are included in this phase.

---

## What Was Built

### 1. Database Package (`packages/database/`)

**Files Created:**
- `package.json` - Dependencies (Drizzle, postgres driver)
- `tsconfig.json` - TypeScript configuration
- `drizzle.config.ts` - Drizzle kit configuration
- `.env.example` - Environment template

**Schema Files:**
- `src/schema/workspaces.ts` - Workspace tables, enums, relations, types
- `src/schema/index.ts` - Central export

**Migrations:**
- `migrations/0001_init_workspaces.sql` - SQL migration (CREATE TABLE, indexes, constraints)

**What It Provides:**
- Drizzle-managed workspace schema
- pgEnum for workspace roles: `owner`, `editor`, `viewer`
- Type-safe schema inference (`Workspace`, `WorkspaceMember`, `CreateWorkspaceInput`)
- Relationships defined for eager loading
- Soft delete support via `deletedAt` column
- Audit columns: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

### 2. Backend API Package (`apps/api/`)

**Files Created:**
- `package.json` - Express, Drizzle, Zod dependencies
- `tsconfig.json` - TypeScript configuration with strict mode
- `.env.example` - Environment template

**Database Connection:**
- `src/db/client.ts` - Singleton Drizzle instance with schema

**Workspace Domain:**
- `src/domains/workspace/workspace.types.ts` - Input/output types
- `src/domains/workspace/workspace.schema.ts` - Zod validation schemas
- `src/domains/workspace/repository.ts` - CRUD layer:
  - `WorkspaceRepository` (8 methods)
  - `WorkspaceMemberRepository` (10 methods)

**Tests:**
- `src/domains/workspace/__tests__/repository.test.ts` - 50+ test cases

**Utilities:**
- `src/utils/errors.ts` - Custom error classes
- `src/utils/response.ts` - Standard response formatting

**Entry Point:**
- `src/index.ts` - Basic Express setup with health check

---

## Architecture Decisions

### 1. Workspace Isolation

Every operation in the repository layer respects **workspace isolation**:
- Users can only access workspaces they are members of
- Data queries are automatically filtered by `workspace_id`
- Membership validation is explicit and checked at repository level

### 2. Soft Delete Strategy

All business entities support soft delete:
- `deletedAt` column marks deletion without removing data
- Queries automatically exclude deleted records (unless explicitly requested)
- Allows recovery and maintains referential integrity

**Example:**
```typescript
// Automatically excludes deletedAt IS NOT NULL
const workspaces = await repo.list({ ownerId, excludeDeleted: true });

// Explicitly include deleted
const deleted = await repo.getById(id, { includeDeleted: true });
```

### 3. Audit Trail

Every record maintains audit columns:
- `createdAt`, `createdBy` - When and who created
- `updatedAt`, `updatedBy` - When and who last updated
- `deletedAt` - When deleted (soft delete)

This enables complete audit trails and recovery procedures.

### 4. Role-Based Access

Workspace roles are explicit:
- `owner` - Full control, can delete workspace
- `editor` - Can modify projects, invoices
- `viewer` - Read-only access

Roles are enforced at:
1. Database level (via pgEnum)
2. Application level (via Zod validation)
3. Repository level (via explicit checks)

---

## Database Schema

### Workspaces Table

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo VARCHAR(512),
  owner_id UUID NOT NULL,
  settings TEXT DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP -- Soft delete
)
```

**Indexes:**
- `owner_id` - For listing user's workspaces
- `slug` - For slug lookups
- `(slug, deleted_at)` - Unique constraint excluding deleted

### Workspace Members Table

```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role workspace_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP DEFAULT NOW(),
  invited_by UUID,
  left_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP -- Soft delete
)
```

**Indexes:**
- `workspace_id` - For listing members
- `user_id` - For finding user's memberships
- `(workspace_id, user_id)` - Unique membership constraint

**Relationship:**
- `workspace_id` → `workspaces.id` (CASCADE DELETE)

---

## Repository API

### WorkspaceRepository

```typescript
class WorkspaceRepository {
  create(data: CreateWorkspaceInput): Promise<Workspace>
  getById(id: string, options?: { includeDeleted?: boolean }): Promise<Workspace | null>
  getBySlug(slug: string, options?: { includeDeleted?: boolean }): Promise<Workspace | null>
  list(filters?: WorkspaceQueryFilters): Promise<Workspace[]>
  update(id: string, data: UpdateWorkspaceInput, updatedBy: string): Promise<Workspace>
  softDelete(id: string, deletedBy: string): Promise<Workspace>
  restore(id: string, restoredBy: string): Promise<Workspace>
  exists(id: string): Promise<boolean>
}
```

**Key Features:**
- Automatic audit field population
- Soft delete with optional restore
- Type-safe queries with Drizzle
- Consistent error handling

### WorkspaceMemberRepository

```typescript
class WorkspaceMemberRepository {
  create(data: CreateWorkspaceMemberInput): Promise<WorkspaceMember>
  getById(id: string, options?: { includeDeleted?: boolean }): Promise<WorkspaceMember | null>
  getByWorkspaceAndUser(workspaceId: string, userId: string, ...): Promise<WorkspaceMember | null>
  list(filters?: WorkspaceMemberQueryFilters): Promise<WorkspaceMember[]>
  listByUser(userId: string): Promise<WorkspaceMember[]>
  listByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>
  update(id: string, data: UpdateWorkspaceMemberInput): Promise<WorkspaceMember>
  remove(id: string): Promise<WorkspaceMember>
  isMember(workspaceId: string, userId: string): Promise<boolean>
  getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null>
  countMembers(workspaceId: string): Promise<number>
}
```

**Key Features:**
- Member lifecycle management (add, remove, update role)
- Efficient queries for common patterns
- Role introspection
- Membership validation

---

## Validation

### Zod Schemas

**CreateWorkspaceSchema:**
- `name` - 1-255 chars
- `slug` - Lowercase alphanumeric + hyphens, 3-50 chars
- `description` - Optional, max 1000 chars
- `logo` - Optional URL
- `ownerId` - Valid UUID

**UpdateWorkspaceSchema:**
- All fields optional
- Same validation as create where applicable

**WorkspaceMemberSchema:**
- `role` - Enum: owner, editor, viewer
- `workspaceId`, `userId` - Valid UUIDs
- `invitedBy` - Optional UUID

---

## Tests

### Test Coverage

**Repository Tests (50+ cases):**
- ✅ Create operations (valid/invalid input)
- ✅ Read operations (by ID, by slug, list with filters)
- ✅ Update operations (field updates, audit trail)
- ✅ Delete operations (soft delete, restore, edge cases)
- ✅ Query operations (exists, find patterns)
- ✅ Membership operations (add, remove, update role)
- ✅ Access control (role checks, membership validation)
- ✅ Edge cases (UUIDs, null values, concurrent ops)

**Test Patterns:**
- Happy path (valid operations succeed)
- Error cases (invalid input, non-existent records)
- Edge cases (boundary values, soft deletes, audit fields)
- Security (workspace isolation, role checks)

**Running Tests:**
```bash
cd apps/api
npm test                # Run once
npm run test:watch      # Watch mode
```

---

## File Structure

```
Freelance-OS/
├── packages/
│   └── database/
│       ├── src/
│       │   ├── schema/
│       │   │   ├── workspaces.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── migrations/
│       │   └── 0001_init_workspaces.sql
│       ├── package.json
│       ├── tsconfig.json
│       ├── drizzle.config.ts
│       └── .env.example
│
└── apps/
    └── api/
        ├── src/
        │   ├── db/
        │   │   └── client.ts
        │   ├── domains/
        │   │   └── workspace/
        │   │       ├── workspace.types.ts
        │   │       ├── workspace.schema.ts
        │   │       ├── repository.ts
        │   │       └── __tests__/
        │   │           └── repository.test.ts
        │   ├── utils/
        │   │   ├── errors.ts
        │   │   └── response.ts
        │   └── index.ts
        ├── package.json
        ├── tsconfig.json
        └── .env.example
```

---

## What Was NOT Built (Phase 1)

Intentionally excluded for future phases:

- ❌ Routes/Controllers (Phase 2)
- ❌ Services/Business Logic (Phase 2)
- ❌ Middleware (authentication, validation, error handling)
- ❌ Frontend components
- ❌ Other domains (Projects, Invoices, Payments, etc.)
- ❌ AI features
- ❌ Real-time features
- ❌ WebSockets

---

## Next Steps (Phase 2)

After Phase 1 acceptance, continue with:

1. **Create Service Layer**
   - `WorkspaceService` - Business logic and validation
   - Implement workspace creation workflow (auto-add owner as member)
   - Implement membership management (adding/removing members)

2. **Create Controller/Routes**
   - REST endpoints: `POST /api/v1/workspaces`, `GET /api/v1/workspaces/:id`, etc.
   - Request validation middleware
   - Response formatting middleware
   - Error handling middleware

3. **Add Authentication**
   - JWT validation middleware
   - User context injection
   - Role-based access control

4. **Add Other Domains**
   - Projects (Phase 3)
   - Clients (Phase 3)
   - Invoices (Phase 4)
   - And so on...

---

## Success Criteria (Phase 1)

- ✅ Workspace table exists with correct schema
- ✅ WorkspaceMember table exists with relationships
- ✅ Migration runs successfully
- ✅ Repository methods are fully implemented
- ✅ Tests pass (happy path and edge cases)
- ✅ TypeScript strict mode passes
- ✅ Build passes
- ✅ No console errors or warnings

---

## Technical Details

### Technology Stack (Phase 1)

| Layer | Technology | Why |
|-------|-----------|-----|
| Database | PostgreSQL (Neon) | ACID, proven, scalable |
| ORM | Drizzle | Type-safe, SQL-first |
| Backend | Express + TypeScript | Minimal, flexible |
| Validation | Zod | Type-safe schemas |
| Testing | Vitest | Fast, modern |

### Key Principles Applied

1. **Domain-Driven Design** - Workspace is a vertical slice
2. **Type Safety** - Full TypeScript with strict mode
3. **Auditability** - Complete audit trail on every record
4. **Isolation** - Workspace isolation enforced at DB and app level
5. **Testability** - Repository layer is easily testable
6. **Maintainability** - Clear separation of concerns

---

## How to Run

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
```

### Development

```bash
# In apps/api
npm run dev                    # Start dev server
npm run type-check             # TypeScript check
npm test                       # Run tests
npm run lint                   # Biome linting
```

### Database

```bash
# Create migrations (auto-generated from schema)
cd packages/database
npm run migrate:generate

# Apply migrations
npm run migrate:deploy

# Push to database
npm run db:push
```

---

## Documentation References

- **Architecture:** `docs/02-engineering/architecture.md`
- **Database Design:** `docs/02-engineering/database-design.md`
- **API Design:** `docs/02-engineering/api-design.md`
- **Engineering Context:** `context-for-ai/03-engineering-context.md`
- **Product Workflows:** `docs/01-product/business-workflows.md`

---

## Phase 1 Summary

This phase delivers the **foundational database and repository layer** for Freelance OS. It establishes:

- ✅ Clear domain boundaries (Workspace domain)
- ✅ Type-safe data access patterns
- ✅ Soft delete and audit trail support
- ✅ Workspace isolation enforcement
- ✅ Testable repository layer
- ✅ Solid foundation for Phase 2 (Services)

The next phase will layer services, controllers, and routes on top of this foundation.

---

**Status:** Ready for Phase 2 Approval

**Date:** August 2, 2026  
**By:** Lead Engineer (AI-assisted)  
**Review:** Pending
