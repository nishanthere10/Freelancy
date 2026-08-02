# Engineering Context & Handbook

**Version:** 1.0  
**Last Updated:** August 2, 2026  
**Audience:** All engineers, AI agents, and technical contributors

---

## 1. Engineering Philosophy

This section establishes the core engineering principles that guide every technical decision.

### Core Principles

We engineer for **maintainability over cleverness**, **scalability over current optimization**, and **clarity over compression**.

| Principle | Definition | Implication |
|-----------|-----------|-------------|
| **Maintainability First** | Code is read 10x more than written | Accept verbosity for clarity |
| **Scalability Without Premature Optimization** | Build to scale to 100k users; don't optimize for 100 users | Measure, then optimize |
| **Single Responsibility** | Each service, component, function has one reason to change | Split responsibilities when they emerge |
| **Explicit Over Implicit** | Code should be obvious, not clever | No magic or hidden behavior |
| **Fail Fast** | Errors should surface immediately, not propagate | Validate early, propagate errors clearly |
| **Observable by Default** | Every system component should be observable | Logging, metrics, tracing built in from day one |
| **Security by Design** | Security is not added later | Assume all input is hostile; validate everything |
| **Boring Technology** | Choose proven, well-understood tools | Avoid bleeding-edge frameworks and languages |

### Engineering Priorities (in order)

1. **Reliability** - The system works predictably; errors are handled gracefully
2. **Security** - User data and transactions are protected; no preventable breaches
3. **Maintainability** - New engineers can understand and modify code without fear
4. **Performance** - Response times are measured and optimized; no unpleasant surprises
5. **Scalability** - Architecture supports growth without fundamental redesign
6. **Developer Experience** - Tooling, scripts, and workflows reduce friction

### What We Reject

- ❌ Microservices without clear domain boundaries (complexity without benefit)
- ❌ Premature optimization (measure first, optimize second)
- ❌ Frameworks chosen for resume value (use what the team knows)
- ❌ "Magic" abstractions that hide complexity
- ❌ NoSQL databases as default (PostgreSQL for structured data)
- ❌ Sacrificing maintainability for perceived performance
- ❌ Security through obscurity (explicit security patterns)
- ❌ Undocumented architectural decisions

---

## 2. Repository Structure

We use a **monorepo strategy** with clear separation of concerns.

### Why Monorepo?

**Advantages:**
- Single source of truth for dependencies
- Coordinated version releases (frontend and backend evolve together)
- Simpler dependency management (no circular dependencies between repos)
- Atomic commits (related changes stay together)
- Easier for AI agents (all context in one place)

**Disadvantages:**
- Larger repository size (acceptable with proper gitignore)
- More complex deployment (mitigated by clear layer separation)
- Potential for accidental cross-layer dependencies

**Trade-off Decision:**
Monorepo is optimal for startups at this stage. We'll split to polyrepo only if deployment independence becomes essential (likely Year 2+).

### Top-Level Structure

```
Freelance-OS/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── api/                 # Express.js backend
│   └── ai/                  # FastAPI AI service
├── packages/
│   ├── shared/              # Shared types, utilities, constants
│   ├── database/            # Drizzle migrations, schemas
│   └── validation/          # Zod schemas (shared)
├── docs/                    # Project documentation
├── context-for-ai/          # Context files for AI agents
├── .github/                 # GitHub Actions workflows
├── docker-compose.yml       # Local development stack
├── .env.example             # Environment template
└── README.md
```

### Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                    │
│                  (Next.js + Static Assets)              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│                 Cloudflare (CDN + DDoS)                 │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    ┌────────┐    ┌────────┐    ┌────────┐
    │ API    │    │   AI   │    │WebSocket
    │(AWS)   │    │(AWS)   │    │(AWS)
    └────────┘    └────────┘    └────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    ┌────────┐    ┌────────┐    ┌────────┐
    │Postgres│    │ Redis  │    │ BullMQ │
    │        │    │        │    │Workers │
    └────────┘    └────────┘    └────────┘
```

---

## 3. Folder Structure: Detailed View

### Frontend (`apps/web`)

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth-related routes
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/        # Protected routes
│   │   │   ├── projects/
│   │   │   ├── invoices/
│   │   │   └── settings/
│   │   ├── api/                # API routes (thin wrapper)
│   │   │   ├── auth/
│   │   │   └── projects/
│   │   ├── layout.tsx
│   │   └── page.tsx            # Home page
│   │
│   ├── components/             # Reusable React components
│   │   ├── ui/                 # Base components (Button, Card, etc.)
│   │   ├── features/           # Feature-specific components
│   │   │   ├── projects/
│   │   │   ├── invoices/
│   │   │   └── dashboard/
│   │   └── common/             # Headers, footers, navigation
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useProjects.ts
│   │   ├── useInvoices.ts
│   │   └── useAuth.ts
│   │
│   ├── lib/                    # Utilities and helpers
│   │   ├── api.ts              # API client (axios instance)
│   │   ├── auth.ts             # Auth utilities
│   │   ├── validators.ts       # Form validators
│   │   └── utils.ts            # Common utilities
│   │
│   ├── queries/                # TanStack Query definitions
│   │   ├── projects.ts
│   │   ├── invoices.ts
│   │   └── user.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── api.ts              # API response types
│   │   └── domain.ts           # Business domain types
│   │
│   ├── context/                # React Context (UI state only)
│   │   └── SidebarContext.tsx
│   │
│   └── styles/
│       └── globals.css         # Global Tailwind styles
│
├── public/                     # Static assets
├── stories/                    # Storybook stories
├── next.config.js
├── tsconfig.json
└── tailwind.config.js
```

### Backend (`apps/api`)

```
apps/api/
├── src/
│   ├── domains/                # Domain-driven architecture
│   │   ├── auth/               # Authentication domain
│   │   │   ├── routes.ts       # Express routes
│   │   │   ├── service.ts      # Business logic
│   │   │   ├── repository.ts   # Data access
│   │   │   ├── types.ts        # Domain types
│   │   │   └── validators.ts   # Input validation
│   │   │
│   │   ├── projects/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   ├── types.ts
│   │   │   └── validators.ts
│   │   │
│   │   ├── invoices/
│   │   ├── payments/
│   │   └── users/
│   │
│   ├── middleware/
│   │   ├── auth.ts             # JWT verification
│   │   ├── error.ts            # Error handling
│   │   ├── validation.ts       # Request validation
│   │   └── logging.ts          # Request logging
│   │
│   ├── utils/
│   │   ├── errors.ts           # Custom error classes
│   │   ├── response.ts         # Standard response format
│   │   └── helpers.ts          # Common utilities
│   │
│   ├── db/
│   │   └── client.ts           # Database connection
│   │
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   │
│   └── app.ts                  # Express app setup
│
├── tests/                      # Test files (mirror src structure)
├── .env.example
├── tsconfig.json
└── package.json
```

### AI Service (`apps/ai`)

```
apps/ai/
├── src/
│   ├── services/
│   │   ├── scope_analyzer.py       # Scope analysis workflow
│   │   ├── risk_detector.py        # Risk detection
│   │   ├── milestone_generator.py  # Milestone generation
│   │   └── embeddings.py           # Embedding management
│   │
│   ├── workflows/
│   │   ├── scope_analysis.py       # LangGraph workflow
│   │   ├── risk_analysis.py
│   │   └── estimation.py
│   │
│   ├── prompts/
│   │   ├── scope_analysis.py       # Prompt templates
│   │   ├── risk_detection.py
│   │   └── milestone_generation.py
│   │
│   ├── llm/
│   │   ├── client.py               # LLM integration
│   │   ├── models.py               # Model configurations
│   │   └── retry_logic.py          # Resilience patterns
│   │
│   ├── db/
│   │   ├── client.py               # Database connection
│   │   └── repositories.py         # Data access
│   │
│   ├── api/
│   │   ├── routes.py               # FastAPI routes
│   │   ├── schemas.py              # Pydantic schemas
│   │   └── dependencies.py         # FastAPI dependencies
│   │
│   ├── config/
│   │   └── settings.py             # Configuration
│   │
│   └── main.py                     # FastAPI app
│
├── tests/                      # Test files
├── .env.example
└── requirements.txt
```

### Shared Packages (`packages/`)

```
packages/
├── shared/
│   ├── src/
│   │   ├── types/
│   │   │   ├── api.ts              # API response types
│   │   │   ├── domain.ts           # Business types
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── errors.ts
│   │   │   └── config.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       └── helpers.ts
│   └── package.json
│
├── database/
│   ├── src/
│   │   ├── schema/
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   ├── invoices.ts
│   │   │   └── index.ts
│   │   └── migrations/
│   │       ├── 001_init.sql
│   │       └── 002_add_projects.sql
│   └── package.json
│
└── validation/
    ├── src/
    │   ├── auth.ts                 # Zod schemas
    │   ├── projects.ts
    │   ├── invoices.ts
    │   └── index.ts
    └── package.json
```

---

## 4. Frontend Architecture

### Technology Stack Rationale

| Technology | Choice | Why | Alternative | Trade-off |
|-----------|--------|-----|-------------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR, SSG, API routes, built-in optimizations | Remix, Nuxt, Astro | Opinionated; less flexibility |
| **Language** | TypeScript | Type safety catches bugs early; better DX | JavaScript, Flow | Build step required |
| **Styling** | Tailwind CSS | Utility-first, predictable, fast | Styled Components, CSS Modules | Large HTML class names |
| **State (Server)** | TanStack Query | Server state complexity; caching; sync | Redux, SWR | Learning curve |
| **State (UI)** | React Context | Simple UI state management | Redux, Zustand, Recoil | Not for complex state |
| **Forms** | React Hook Form + Zod | Minimal re-renders; validation | Formik, Final Form | Less feature-rich than Formik |
| **Components** | shadcn/ui | Accessible, unstyled, copy-paste | Material-UI, Chakra | Requires component maintenance |

### Next.js App Router: Structure

**Server Components (Default)**

```typescript
// app/dashboard/projects/page.tsx - This is a Server Component
export default async function ProjectsPage() {
  // Can access database directly
  const projects = await db.query.projects.findMany();
  
  return (
    <div>
      <ProjectList projects={projects} />
    </div>
  );
}
```

**When to Use Client Components**

```typescript
'use client';  // Mark as client component

// Use for:
// - React hooks (useState, useContext, etc.)
// - Event listeners
// - TanStack Query (useQuery, useMutation)
// - Interactive UI

export default function ProjectForm() {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate } = useMutation(...);
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutate(...);
    }}>
      {/* Form fields */}
    </form>
  );
}
```

**Server Components vs. Client Components**

| Aspect | Server | Client |
|--------|--------|--------|
| **Direct DB Access** | ✅ Yes | ❌ No |
| **Secrets** | ✅ Safe | ❌ Exposed |
| **Large Libraries** | ✅ Smaller bundle | ❌ Larger bundle |
| **Hooks** | ❌ No | ✅ Yes |
| **Real-time** | ❌ No | ✅ Yes |

**Rule:** Default to Server Components. Use Client Components only when necessary.

### State Management Strategy

```
Global State Layer (Rarely used)
         ↓
Feature-level State (TanStack Query for server data)
         ↓
Component-level State (useState for UI)
         ↓
Local Variables
```

**TanStack Query Usage:**

```typescript
// hooks/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });
}

// In a component
'use client';

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  
  if (isLoading) return <LoadingSketch />;
  if (error) return <ErrorBoundary error={error} />;
  
  return <ProjectList projects={projects} />;
}
```

### Form Handling

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema in shared package
const createProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  budget: z.number().positive(),
});

type CreateProjectInput = z.infer<typeof createProjectSchema>;

export default function CreateProjectForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  });
  
  const { mutate } = useMutation({
    mutationFn: (data) => api.post('/projects', data),
  });
  
  return (
    <form onSubmit={handleSubmit((data) => mutate(data))}>
      {/* Form fields */}
    </form>
  );
}
```

### Routing Strategy

- `/app/(auth)/login` - Public routes
- `/app/(dashboard)` - Protected routes (require authentication)
- Middleware handles redirects to login if unauthenticated

### Error Boundaries & Fallbacks

```typescript
// app/error.tsx - Catches errors in this route
'use client';

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// Render in App Router based on error type
// - Thrown from component → Error boundary
// - Thrown from server component → Not-found page
```

### Performance Optimization

**Code Splitting:**
- Automatic via Next.js (route-based)
- Manual via dynamic imports for heavy libraries

**Image Optimization:**
- Always use `next/image` (automatic format conversion, lazy loading)
- Never use `<img>` tag for responsive images

**Lazy Loading:**
```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
});
```

**Caching Strategy:**
- Static routes → Static generation (cache forever)
- Dynamic routes → ISR (revalidate every X seconds)
- User-specific routes → No caching (dynamic)

---

## 5. Backend Architecture

### Express.js Setup & Philosophy

We use Express as a minimal framework, then layer our own architecture on top.

**Why Express?**
- Minimal and unopinionated (we control our structure)
- Massive ecosystem (middleware, libraries)
- Lightweight (no unnecessary overhead)
- Well-understood by most developers
- Not tied to specific patterns

**Alternative:** NestJS (more opinionated, includes DI container, decorators)

**Trade-off:** NestJS provides more structure but is heavier. Express requires discipline but gives flexibility.

### Domain-Driven Architecture

Each domain (auth, projects, invoices) is organized as a vertical slice:

```typescript
// domains/projects/routes.ts
import { Router } from 'express';
import { ProjectService } from './service';

const router = Router();
const projectService = new ProjectService();

router.get('/', async (req, res, next) => {
  try {
    const projects = await projectService.getUserProjects(req.user.id);
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

export default router;
```

```typescript
// domains/projects/service.ts
import { ProjectRepository } from './repository';

export class ProjectService {
  private repo = new ProjectRepository();
  
  async getUserProjects(userId: string) {
    return this.repo.findByUserId(userId);
  }
  
  async createProject(userId: string, data: CreateProjectInput) {
    // Business logic
    const project = await this.repo.create({
      ...data,
      userId,
      createdAt: new Date(),
    });
    return project;
  }
}
```

```typescript
// domains/projects/repository.ts
import { db } from '@/db/client';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class ProjectRepository {
  async findByUserId(userId: string) {
    return db.query.projects.findMany({
      where: eq(projects.userId, userId),
    });
  }
  
  async create(data: CreateProjectInput) {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }
}
```

### Controller Pattern

Routes are thin controllers; business logic lives in services.

**Route Responsibilities:**
- Parse request (body, params, query)
- Call service
- Format response
- Error handling (pass to middleware)

**Service Responsibilities:**
- All business logic
- Orchestrate repository calls
- Validation (beyond input validation)
- Transaction management

**Repository Responsibilities:**
- Data access layer
- SQL query building
- No business logic

### Validation Strategy

Validation happens in layers:

```typescript
// 1. Input validation (at routes level)
import { validateInput } from '@/middleware/validation';
import { createProjectSchema } from '@/domains/projects/validators';

router.post('/projects', 
  validateInput(createProjectSchema),  // Zod validation
  async (req, res, next) => {
    try {
      const project = await projectService.createProject(req.user.id, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }
);

// 2. Business logic validation (in service)
async createProject(userId: string, data: CreateProjectInput) {
  // Check if user has remaining quota
  const activeProjects = await this.repo.countActiveByUser(userId);
  if (activeProjects >= MAX_PROJECTS) {
    throw new ValidationError('Project limit reached');
  }
  
  return this.repo.create({ ...data, userId });
}

// 3. Database constraints (last resort)
// Foreign key, unique constraints catch edge cases
```

**Zod Schema Example:**

```typescript
// domains/projects/validators.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(10),
  budget: z.number().positive(),
  clientId: z.string().uuid(),
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

### Error Handling

All errors flow through centralized error middleware:

```typescript
// middleware/error.ts
export function errorMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    userId: req.user?.id,
    path: req.path,
  });
  
  // Handle known errors
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message,
      details: error.details,
    });
  }
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: error.message,
    });
  }
  
  if (error instanceof AuthorizationError) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'You do not have permission',
    });
  }
  
  // Default to 500
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}
```

### Standard Response Format

All API responses follow a consistent format:

```typescript
// Success response
{
  "success": true,
  "data": { /* ... */ }
}

// Error response
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": { /* optional details */ }
}

// Paginated response
{
  "success": true,
  "data": [ /* ... */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "pages": 5
  }
}
```

### Application Setup

```typescript
// app.ts
import express from 'express';
import authRoutes from '@/domains/auth/routes';
import projectRoutes from '@/domains/projects/routes';
import { authMiddleware } from '@/middleware/auth';
import { errorMiddleware } from '@/middleware/error';
import { loggingMiddleware } from '@/middleware/logging';

const app = express();

// Middleware
app.use(loggingMiddleware);
app.use(express.json());

// Public routes
app.use('/api/v1/auth', authRoutes);

// Protected routes
app.use(authMiddleware);
app.use('/api/v1/projects', projectRoutes);

// Error handling (must be last)
app.use(errorMiddleware);

export default app;
```

---

## 6. Database Architecture

### Neon PostgreSQL

**Why PostgreSQL?**
- ACID transactions (critical for financial data)
- Strong schema enforcement (prevents bugs)
- Powerful query language (no denormalization needed)
- Mature ecosystem (tools, extensions)
- Scalable (proven at massive scale)

**Why Neon?**
- Serverless PostgreSQL (auto-scaling)
- Connection pooling (handles bursty traffic)
- Branching (dev/staging/prod branches)
- Neon CLI integration (local development)

**Alternatives:**
- Self-hosted PostgreSQL (more control, more ops work)
- Supabase (PostgreSQL + auth + realtime)
- PlanetScale (MySQL, sharding-focused)

**Trade-off:** Neon is managed, so less control, but significantly reduces ops burden.

### Drizzle ORM

**Why Drizzle?**

| Aspect | Drizzle | Prisma | TypeORM |
|--------|---------|--------|---------|
| **Type Safety** | Excellent (generates from schema) | Good | Good |
| **SQL Control** | Full control | Limited | Full control |
| **Performance** | Minimal overhead | Some overhead | Minimal overhead |
| **Bundle Size** | ~10KB | ~100KB | ~200KB |
| **Learning Curve** | Low | Very low | Medium |
| **Ecosystem** | Growing | Massive | Large |

**Drizzle Schema Example:**

```typescript
// packages/database/src/schema/projects.ts
import { pgTable, text, serial, timestamp, numeric, uuid, foreignKey } from 'drizzle-orm/pg-core';
import { usersTable } from './auth';

export const projectsTable = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    budget: numeric('budget', { precision: 12, scale: 2 }).notNull(),
    status: text('status').notNull().default('active'),
    
    // Audit columns
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),  // Soft delete
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
    }),
  ]
);

export type Project = typeof projectsTable.$inferSelect;
export type CreateProjectInput = typeof projectsTable.$inferInsert;
```

### Database Relationships

```typescript
// Define relationships for eager loading
export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  
  milestones: many(milestonesTable),
  invoices: many(invoicesTable),
}));

// Usage with eager loading
const projects = await db.query.projectsTable.findMany({
  with: {
    user: true,
    milestones: true,
    invoices: true,
  },
});
```

### Indexes

Indexes are created explicitly for performance-critical queries:

```typescript
// In migration files
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);

// Composite index for common queries
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);
```

### Soft Deletes

All business entities support soft deletes:

```typescript
// Repository pattern
async delete(id: string) {
  // Mark as deleted, don't actually delete
  return db.update(projectsTable)
    .set({ deletedAt: new Date() })
    .where(eq(projectsTable.id, id));
}

// Always filter out deleted records in queries
async findActive() {
  return db.query.projectsTable.findMany({
    where: isNull(projectsTable.deletedAt),
  });
}
```

### Audit Columns

Every record has `createdAt`, `updatedAt`, `deletedAt` columns:

```typescript
// Automatic updates via middleware or triggers
await db.update(projectsTable)
  .set({
    ...updateData,
    updatedAt: new Date(),  // Always update this
  })
  .where(eq(projectsTable.id, id));
```

### Transactions

Multi-step operations use explicit transactions:

```typescript
// Transaction example: Create project and emit event
async function createProjectWithEvent(userId: string, data: CreateProjectInput) {
  return db.transaction(async (tx) => {
    // Create project
    const [project] = await tx.insert(projectsTable).values({
      ...data,
      userId,
    }).returning();
    
    // Emit event (or any side effect)
    await eventBus.emit('project:created', project);
    
    return project;
  });
}
```

---

## 7. API Design Philosophy

### REST Endpoints

We follow REST conventions strictly:

```
GET    /api/v1/projects              # List projects
POST   /api/v1/projects              # Create project
GET    /api/v1/projects/:id          # Get single project
PUT    /api/v1/projects/:id          # Update project
DELETE /api/v1/projects/:id          # Delete project

GET    /api/v1/projects/:id/invoices # List project invoices
POST   /api/v1/projects/:id/invoices # Create invoice for project
```

**Naming Conventions:**
- Resources are plurals: `/projects`, not `/project`
- IDs are slugs or UUIDs: `/projects/abc-123-def-456`
- Use query params for filtering/pagination: `/projects?status=active&page=1`

### Validation & Error Codes

```typescript
// All POST/PUT requests require Zod validation
router.post('/projects', validateInput(createProjectSchema), async (req, res, next) => {
  // ...
});

// Error response codes
{
  "success": false,
  "error": "VALIDATION_ERROR",  // Input invalid
  "error": "NOT_FOUND",          // Resource doesn't exist
  "error": "UNAUTHORIZED",       // No valid auth token
  "error": "FORBIDDEN",          // Auth but no permission
  "error": "CONFLICT",           // Resource already exists
  "error": "RATE_LIMITED",       // Rate limit exceeded
  "error": "INTERNAL_ERROR",     // Unexpected server error
}
```

### Pagination

```typescript
// Query parameters
GET /api/v1/projects?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Response format
{
  "success": true,
  "data": [ /* ... */ ],
  "pagination": {
    "total": 250,
    "page": 1,
    "pageSize": 20,
    "pages": 13,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Filtering & Sorting

```typescript
// Example: GET /api/v1/projects?status=active&client=acme&budget_gte=100000

// Implementation in repository
async findFiltered(filter: ProjectFilter) {
  let query = db.select().from(projectsTable);
  
  if (filter.status) {
    query = query.where(eq(projectsTable.status, filter.status));
  }
  
  if (filter.budget_gte) {
    query = query.where(gte(projectsTable.budget, filter.budget_gte));
  }
  
  if (filter.sortBy) {
    query = query.orderBy(
      filter.sortOrder === 'asc' 
        ? asc(projectsTable[filter.sortBy])
        : desc(projectsTable[filter.sortBy])
    );
  }
  
  return query;
}
```

### API Versioning

- Current version: `v1`
- Breaking changes → new version (`v2`)
- Old versions sunset after 6-month notice
- Both versions run in parallel during transition

### Authentication

```typescript
// JWT token in Authorization header
Authorization: Bearer <token>

// Middleware validates and attaches user
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = verifyToken(token);
  req.user = user;
  next();
});
```

### Rate Limiting

```typescript
// Per user: 1000 requests per hour
// Per IP: 10000 requests per hour
// Per endpoint: Vary by sensitivity

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 1000,                 // 1000 requests
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many requests',
});

app.use('/api/v1/', limiter);
```

---

## 8. AI Service Architecture

### FastAPI + LangGraph

**Why FastAPI?**
- Modern async/await (handles real-time requests)
- Auto-generated OpenAPI docs
- Extremely fast (Uvicorn server)
- Type hints enforced via Pydantic

**Why LangGraph?**
- Orchestrates multi-step AI workflows
- Deterministic and reproducible
- State persistence (PostgreSQL)
- Handles tool calling and retry logic

### AI Workflow Example: Scope Analysis

```python
# apps/ai/src/workflows/scope_analysis.py
from langgraph.graph import StateGraph, END
from typing import TypedDict
import anthropic

class ScopeAnalysisState(TypedDict):
    project_description: str
    requirements: list[str]
    deliverables: list[str]
    timeline_estimate: int
    risks: list[str]
    confidence_score: float

def analyze_requirements(state: ScopeAnalysisState) -> ScopeAnalysisState:
    """First step: Parse and structure requirements"""
    client = anthropic.Anthropic()
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Analyze these project requirements and extract structured information:\n{state['project_description']}"
        }]
    )
    
    # Parse response and update state
    state['requirements'] = extract_requirements(message.content[0].text)
    return state

def generate_deliverables(state: ScopeAnalysisState) -> ScopeAnalysisState:
    """Second step: Generate deliverables based on requirements"""
    # Similar to above
    pass

def estimate_timeline(state: ScopeAnalysisState) -> ScopeAnalysisState:
    """Third step: Estimate timeline"""
    pass

def detect_risks(state: ScopeAnalysisState) -> ScopeAnalysisState:
    """Fourth step: Identify risks"""
    pass

# Build workflow
workflow = StateGraph(ScopeAnalysisState)
workflow.add_node("analyze", analyze_requirements)
workflow.add_node("deliverables", generate_deliverables)
workflow.add_node("timeline", estimate_timeline)
workflow.add_node("risks", detect_risks)

workflow.add_edge("analyze", "deliverables")
workflow.add_edge("deliverables", "timeline")
workflow.add_edge("timeline", "risks")
workflow.add_edge("risks", END)

workflow.set_entry_point("analyze")
graph = workflow.compile()

# Use with PostgreSQL persistence
from langgraph.checkpoint.postgres import PostgresSaver

with PostgresSaver.from_conn_string(DATABASE_URL) as checkpointer:
    graph.with_config(checkpointer=checkpointer).invoke(initial_state)
```

### LLM Integration

```python
# apps/ai/src/llm/client.py
import anthropic
from functools import lru_cache

@lru_cache(maxsize=1)
def get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def call_llm(
    prompt: str,
    model: str = "claude-3-5-sonnet-20241022",
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """
    Call LLM with retry logic and error handling
    """
    client = get_client()
    
    for attempt in range(3):  # Retry up to 3 times
        try:
            message = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text
        
        except anthropic.RateLimitError:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
        
        except anthropic.APIError as e:
            logger.error(f"API error: {e}")
            raise
    
    return ""
```

### Memory & Context

```python
# Persistent memory in PostgreSQL
class ProjectMemory:
    def __init__(self, project_id: str):
        self.project_id = project_id
    
    async def add_message(self, role: str, content: str):
        """Store conversation message"""
        await db.execute(
            """
            INSERT INTO ai_memory (project_id, role, content)
            VALUES ($1, $2, $3)
            """,
            self.project_id, role, content
        )
    
    async def get_context(self, limit: int = 10) -> str:
        """Retrieve recent conversation for context"""
        messages = await db.fetch(
            """
            SELECT role, content FROM ai_memory
            WHERE project_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            self.project_id, limit
        )
        
        # Format as context string
        context = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in reversed(messages)
        ])
        return context
```

### FastAPI Routes

```python
# apps/ai/src/api/routes.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class AnalyzeScopeRequest(BaseModel):
    project_description: str
    project_id: str

@app.post("/api/v1/analyze-scope")
async def analyze_scope(request: AnalyzeScopeRequest):
    """
    Analyze project requirements and generate structured scope
    """
    try:
        # Retrieve existing context
        memory = ProjectMemory(request.project_id)
        context = await memory.get_context()
        
        # Run workflow
        initial_state = {
            "project_description": request.project_description,
            "requirements": [],
            "deliverables": [],
            "timeline_estimate": 0,
            "risks": [],
            "confidence_score": 0.0
        }
        
        result = graph.invoke(initial_state)
        
        # Store result
        await memory.add_message("ai", str(result))
        
        return {
            "success": True,
            "data": {
                "requirements": result["requirements"],
                "deliverables": result["deliverables"],
                "timeline_estimate": result["timeline_estimate"],
                "risks": result["risks"],
                "confidence_score": result["confidence_score"]
            }
        }
    
    except Exception as e:
        logger.error(f"Scope analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")
```

---

## 9. Real-Time Architecture

### Socket.io

**Why Socket.io?**
- Battle-tested in production (millions of concurrent users)
- Automatic fallback to HTTP long-polling
- Room/namespace support for multi-user scenarios
- Tight Express integration
- Well-documented, large community

**Alternatives:**
- Raw WebSockets (more control, more complexity)
- Pusher (managed service, $$)
- Ably (managed service, better features but expensive)

**Trade-off:** Socket.io is simpler than raw WebSockets, but less feature-rich than managed services.

### Socket.io Setup

```typescript
// Backend: Setup with Express
import { Server as HTTPServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import express from 'express';

const app = express();
const httpServer = new HTTPServer(app);
const io = new IOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Redis adapter for scaling (allows multiple server instances)
import { createAdapter } from '@socket.io/redis-adapter';
import redis from 'redis';

const pubClient = redis.createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);
  
  if (!user) {
    return next(new Error('Unauthorized'));
  }
  
  socket.user = user;
  next();
});

// Connection handler
io.on('connection', (socket: Socket) => {
  console.log(`User ${socket.user.id} connected`);
  
  // Join user-specific room
  socket.join(`user:${socket.user.id}`);
  
  // Listen for events
  socket.on('project:update', async (data) => {
    // Validate and update project
    await updateProject(data);
    
    // Broadcast to all users in the project
    io.to(`project:${data.projectId}`).emit('project:updated', data);
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.id} disconnected`);
  });
});

export { io, httpServer };
```

### Frontend: Socket.io Client

```typescript
'use client';

import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export function useProjectSocket(projectId: string) {
  const socketRef = useRef<any>(null);
  
  useEffect(() => {
    // Connect on mount
    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: {
        token: getAuthToken(),
      },
    });
    
    // Join project room
    socketRef.current.emit('join:project', { projectId });
    
    // Listen for updates
    socketRef.current.on('project:updated', (data) => {
      // Update UI (maybe invalidate query)
      queryClient.invalidateQueries(['project', projectId]);
    });
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, [projectId]);
  
  return socketRef.current;
}
```

### Use Cases

| Use Case | Mechanism | Benefit |
|----------|-----------|---------|
| **Project Updates** | Emit on update, broadcast to room | All collaborators see changes instantly |
| **Notifications** | Send to user-specific room | User sees alerts across all tabs |
| **Presence** | Emit online/offline events | See who's actively viewing |
| **Typing Indicators** | Send on every keystroke, debounce | Know who's editing |
| **Collaborative Editing** | CRDT (Yjs) + Socket.io | Real-time document collaboration |

---

## 10. Background Jobs & Workers

### BullMQ

**Why BullMQ?**
- Built on Redis (fast, reliable)
- Job persistence (Redis AOF)
- Automatic retry logic
- Job scheduling
- Priority queues

**Alternatives:**
- Celery (Python-focused, more features)
- pg-boss (PostgreSQL-backed, simpler)
- RabbitMQ (heavy, more complex)

**Trade-off:** BullMQ is simpler than Celery but less feature-rich.

### Job Definition

```typescript
// workers/jobs/sendEmailJob.ts
import { Queue, Worker } from 'bullmq';
import redis from 'redis';

const connection = redis.createClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
});

export const emailQueue = new Queue('emails', { connection });

// Define job
interface SendEmailJob {
  userId: string;
  email: string;
  template: string;
  data: Record<string, any>;
}

export async function enqueueEmail(job: SendEmailJob) {
  await emailQueue.add('send', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,  // Start with 2s, exponential backoff
    },
    removeOnComplete: true,
  });
}

// Process jobs
const worker = new Worker('emails', async (job) => {
  const { email, template, data } = job.data;
  
  try {
    await sendEmailViaProvider(email, template, data);
    return { success: true };
  } catch (error) {
    // Will retry automatically
    throw error;
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`Email sent to ${job.data.email}`);
});

worker.on('failed', (job) => {
  console.error(`Email job failed: ${job?.id}`, job?.failedReason);
});
```

### Job Scheduling

```typescript
// Schedule recurring tasks
import { QueueScheduler } from 'bullmq';

const scheduler = new QueueScheduler('reports', { connection });

// Run daily report generation at 2 AM
await emailQueue.add(
  'generate-daily-report',
  { userId: 'all' },
  {
    repeat: {
      pattern: '0 2 * * *',  // Cron pattern
    },
  }
);
```

### Job Types

| Job Type | Example | Delay |
|----------|---------|-------|
| **Immediate** | Send email on signup | < 1 second |
| **Delayed** | Send reminder in 1 hour | Specified delay |
| **Scheduled** | Daily report | Cron pattern |
| **Recurring** | Check scope drift | Every N minutes |

---

## 11. Caching Strategy

### Redis Caching Layers

```
Request
   ↓
Application Cache (Memory)
   ↓
Redis Cache (Shared, 5-30 min TTL)
   ↓
Database Query
```

### Implementation

```typescript
// Example: Cache user projects
async function getUserProjects(userId: string) {
  const cacheKey = `user:${userId}:projects`;
  
  // Try Redis first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const projects = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
  });
  
  // Store in Redis (30 min expiration)
  await redis.setex(cacheKey, 30 * 60, JSON.stringify(projects));
  
  return projects;
}

// Invalidate on update
async function updateProject(projectId: string, data: any) {
  const project = await db.update(projectsTable)
    .set(data)
    .where(eq(projectsTable.id, projectId))
    .returning()
    .then(r => r[0]);
  
  // Invalidate cache
  await redis.del(`user:${project.userId}:projects`);
  
  return project;
}
```

### Cache Busting Strategy

| Event | Cache Key | TTL |
|-------|-----------|-----|
| **User project list** | `user:{id}:projects` | 30 min |
| **Single project** | `project:{id}` | 5 min |
| **Invoices** | `user:{id}:invoices` | 5 min |
| **Settings** | `user:{id}:settings` | 1 hour |
| **Public data** | `public:data` | 1 hour |

---

## 12. Deployment & Infrastructure

### Deployment Architecture

```
┌─────────────────────────────────────┐
│     GitHub (Source of Truth)        │
│  (Git Push + PR Merge Triggers CI)  │
└────────────────────┬────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │   GitHub Actions CI    │
        │  (Run Tests + Build)   │
        └────────────┬───────────┘
                     │
        ┌────────────┴───────────┐
        ↓                        ↓
   ┌────────────┐         ┌────────────┐
   │  Vercel    │         │   AWS ECS  │
   │ (Frontend) │         │  (Backend) │
   └────────────┘         └────────────┘
        │                        │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │  Neon PostgreSQL       │
        │  (Database)            │
        └────────────────────────┘
```

### Frontend Deployment (Vercel)

```typescript
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "nodeVersion": "20.x"
}
```

**Process:**
1. Merge to `main` → Vercel auto-deploys to production
2. Open PR → Vercel creates preview deployment
3. Auto-generated preview URL in PR comments
4. Rollback: Redeploy previous commit

### Backend Deployment (AWS ECS)

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY apps/api ./

# Build TypeScript
RUN npm run build

# Start server
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

**Deployment Process:**
1. Build Docker image
2. Push to Amazon ECR (registry)
3. Update ECS task definition
4. ECS automatically rolls out new containers
5. Old containers drain gracefully

### Environment Variables

```bash
# .env.example (committed to repo)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=YOUR_SECRET_HERE
NEXT_PUBLIC_API_URL=https://api.freelance-os.com
ANTHROPIC_API_KEY=sk-...

# Production .env (NOT committed)
# Managed via AWS Secrets Manager or Vercel Secrets
```

---

## 13. Monitoring & Observability

### Structured Logging

```typescript
// Backend logging
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
});

logger.error('Payment failed', {
  projectId: project.id,
  amount: payment.amount,
  error: error.message,
  stack: error.stack,
});
```

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/node';

// Initialize
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Capture error
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}
```

### Metrics & Monitoring

| Metric | Target | Tool |
|--------|--------|------|
| **API Response Time (p95)** | < 200ms | Vercel Analytics |
| **Database Query Time (p95)** | < 100ms | New Relic / CloudWatch |
| **Error Rate** | < 0.1% | Sentry |
| **Uptime** | > 99.9% | StatusPage.io |
| **Deployment Frequency** | 2-3x per week | GitHub Actions |
| **Lead Time** | < 1 hour | GitHub / Vercel |

---

## 14. Security

### Input Validation

All user input is validated before processing:

```typescript
// At API boundary
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Middleware validates
router.post('/auth/login', validateInput(schema), async (req, res) => {
  // req.body is guaranteed to match schema
});
```

### Authentication

```typescript
// JWT-based authentication
import jwt from 'jsonwebtoken';

function generateToken(userId: string) {
  return jwt.sign(
    { userId, iat: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = verifyToken(token);
  req.user = user;
  next();
});
```

### Authorization

```typescript
// Check permissions before operations
async function updateProject(projectId: string, userId: string) {
  const project = await db.query.projects.findUnique({
    where: eq(projects.id, projectId),
  });
  
  if (project.userId !== userId) {
    throw new AuthorizationError('You cannot modify this project');
  }
  
  // Proceed with update
}
```

### SQL Injection Prevention

Drizzle ORM prevents SQL injection through parameterized queries:

```typescript
// Safe (parameterized)
db.query.projects.findMany({
  where: eq(projects.userId, userId),
});

// Never do string interpolation
// ❌ WRONG: `SELECT * FROM projects WHERE user_id = '${userId}'`
```

### Secrets Management

```typescript
// Never commit secrets
// .env.local (in .gitignore)
DATABASE_URL=postgresql://user:password@host/db
JWT_SECRET=supersecret

// Use environment variables
const dbUrl = process.env.DATABASE_URL;
const secret = process.env.JWT_SECRET;

if (!dbUrl || !secret) {
  throw new Error('Missing required environment variables');
}
```

---

## 15. Performance Optimization

### Database Query Optimization

```typescript
// ❌ N+1 queries (BAD)
const projects = await db.query.projects.findMany();
for (const project of projects) {
  const invoices = await db.query.invoices.findMany({  // Queries in loop!
    where: eq(invoices.projectId, project.id),
  });
}

// ✅ Eager loading (GOOD)
const projects = await db.query.projects.findMany({
  with: {
    invoices: true,  // Single query with join
  },
});
```

### Index Usage

```typescript
// Add indexes for frequently-queried columns
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_projects_status ON projects(status);

// Composite index for combined filters
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);
```

### Frontend Performance

**Code Splitting:**
```typescript
// Lazy load heavy components
const HeavyChart = dynamic(
  () => import('@/components/HeavyChart'),
  { loading: () => <ChartSkeleton /> }
);
```

**Image Optimization:**
```typescript
// Always use next/image
import Image from 'next/image';

export default function ProjectCard({ project }) {
  return (
    <Image
      src={project.imageUrl}
      alt={project.title}
      width={300}
      height={200}
      priority={false}  // Lazy load below fold
    />
  );
}
```

---

## 16. Testing Philosophy

### Test Pyramid

```
           / \
          /   \ E2E (5-10%)
         /     \ Critical user flows
        /-------\
       /         \ Integration (20-30%)
      /           \ API contracts
     /-------------\
    /               \ Unit (60-70%)
   /                 \ Business logic
```

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { calculateProjectBudget } from '@/services/projects';

describe('calculateProjectBudget', () => {
  it('should calculate budget correctly', () => {
    const budget = calculateProjectBudget({
      hourlyRate: 1000,
      estimatedHours: 40,
    });
    
    expect(budget).toBe(40000);
  });
  
  it('should add GST', () => {
    const budget = calculateProjectBudget({
      hourlyRate: 1000,
      estimatedHours: 40,
      includeGST: true,
    });
    
    expect(budget).toBe(47200);  // 40000 * 1.18
  });
});
```

### Integration Tests

```typescript
describe('POST /api/v1/projects', () => {
  it('should create project', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'New Project',
        budget: 50000,
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('New Project');
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can create project', async ({ page, context }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to projects
  await page.goto('/dashboard/projects');
  
  // Create project
  await page.click('button:has-text("New Project")');
  await page.fill('input[placeholder="Project title"]', 'My Project');
  await page.click('button:has-text("Create")');
  
  // Verify
  await expect(page).toHaveURL(/\/dashboard\/projects\/.*[/]?$/);
  await expect(page.locator('h1')).toContainText('My Project');
});
```

---

## 17. Documentation

Every significant piece of code should have documentation.

### Function Documentation

```typescript
/**
 * Calculate total project budget including GST
 * 
 * @param params - Calculation parameters
 * @param params.hourlyRate - Base hourly rate in INR
 * @param params.estimatedHours - Total estimated hours
 * @param params.includeGST - Whether to add GST (default: true)
 * @returns Total budget in INR
 * 
 * @example
 * calculateProjectBudget({
 *   hourlyRate: 1000,
 *   estimatedHours: 40,
 * })  // Returns 47200 (with 18% GST)
 */
export function calculateProjectBudget(params: {
  hourlyRate: number;
  estimatedHours: number;
  includeGST?: boolean;
}): number {
  // Implementation
}
```

### README Documentation

Each domain should have a README explaining its purpose:

```markdown
# Projects Domain

## Purpose
Manages project lifecycle: creation, tracking, updates, closure.

## Key Files
- `routes.ts` - Express routes
- `service.ts` - Business logic
- `repository.ts` - Database access

## API Endpoints
- `GET /api/v1/projects` - List user projects
- `POST /api/v1/projects` - Create new project

## Data Model
See `schema.ts` for database schema.
```

---

## 18. Scalability Strategy

### Horizontal Scaling

As load increases:

```
Users:         1k      →  10k        →  100k+
┌──────┐    ┌──────┐    ┌──────┐
│ API  │    │ API  │    │ API  │ (Multiple instances)
└──────┘    └──────┘    └──────┘
     │          │ │ │        │ │ │ │
     └──────────┴─┴┴────────┴─┴─┴─┴──
                 │
           ┌─────────────┐
           │ Load Balancer
           │  (Vercel/AWS)
           └─────────────┘
```

**Redis Adapter for Socket.io:**

```typescript
// Without Redis: Socket.io connections isolated per instance
// With Redis: Connections shared across instances

import { createAdapter } from '@socket.io/redis-adapter';
import redis from 'redis';

const pubClient = redis.createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Now Socket.io works across multiple server instances
```

### Database Scaling

PostgreSQL can handle 100k+ concurrent users:
- Connection pooling (Neon)
- Read replicas for analytics queries
- Vertical scaling (larger instances)
- Sharding (if needed, Year 3+)

---

## 19. Disaster Recovery

### Backup Strategy

```
PostgreSQL backups:
- Daily backups (AWS RDS automated backups)
- 30-day retention
- Point-in-time restore (PITR)

Redis backups:
- AOF (Append-Only File) for durability
- RDB snapshots every 6 hours
```

### Failover Plan

| Component | Failure Mode | Recovery |
|-----------|--------------|----------|
| **API Server** | Crashes | Auto-restart (ECS) |
| **Database** | Primary fails | Automatic failover to replica |
| **Redis** | Loses data | Rebuild from source |
| **Frontend** | Build failure | Previous deployment restored |

---

## 20. Future Architecture Evolution

### Phase 2 (Year 2)

- GraphQL for complex queries
- Microservices for AI (separate service)
- Event sourcing for audit trails
- Multiple region deployment

### Phase 3 (Year 3)

- Kubernetes for container orchestration
- Service mesh (Istio) for inter-service communication
- CQRS (Command Query Responsibility Segregation)
- Event streaming (Apache Kafka)

### Phase 4+ (Year 4+)

- Autonomous AI agents
- Real-time data warehouse
- Advanced analytics
- Multi-tenant architecture

---

## 21. Open Questions & TODOs

**Questions:**

1. **Caching Strategy** - Should we implement Redis caching for all read operations or only high-frequency queries?
2. **Rate Limiting** - Per-endpoint limits or global limits?
3. **File Storage** - Where should project documents be stored (local, S3, GCS)?
4. **Email Provider** - Which email provider (SendGrid, Resend, AWS SES)?

**TODOs:**

- [ ] Set up observability dashboard (Grafana)
- [ ] Configure CloudWatch alarms
- [ ] Document API specifications (OpenAPI/Swagger)
- [ ] Set up automated database backups
- [ ] Create incident response runbook
- [ ] Set up security scanning (SAST)

---

## 22. Quick Reference

### Technology Versions

```
Node.js:      20.x LTS
React:        19.x
Next.js:      14.x
TypeScript:   5.x
Drizzle:      0.29.x
Express:      4.18.x
FastAPI:      0.109.x
PostgreSQL:   16.x
```

### Key Endpoints

```
Frontend:     https://freelance-os.com
API:          https://api.freelance-os.com
AI Service:   https://ai.freelance-os.com
```

### Important Links

- [Next.js Docs](https://nextjs.org/docs)
- [Express Docs](https://expressjs.com)
- [Drizzle Docs](https://orm.drizzle.team)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph)
- [PostgreSQL Docs](https://www.postgresql.org/docs)

---

**End of Engineering Context**

For updates or clarifications, please create an issue or contact the engineering lead.