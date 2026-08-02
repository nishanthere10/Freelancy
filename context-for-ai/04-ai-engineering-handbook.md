# AI Engineering Handbook

**Version:** 1.0  
**Last Updated:** August 2, 2026  
**Audience:** AI Coding Agents, Engineers, Technical Contributors

---

## 1. Purpose of This Handbook

This document defines **how engineering is performed** inside Freelance OS. It is the operating manual for both human engineers and AI coding agents.

**This handbook is NOT:**
- Architecture documentation (see `03-engineering-context.md`)
- Product documentation (see `02-product-context.md`)
- Coding style guide (covered here but not exclusively)
- A list of arbitrary rules

**This handbook IS:**
- The definition of production-ready code
- The definition of done
- The process for shipping features
- The philosophy behind engineering decisions
- The behavioral expectations for all engineers (human and AI)

### Who Must Read This Document

- ✅ AI coding agents (before any code modification)
- ✅ New engineers joining the team
- ✅ Code reviewers (before reviewing code)
- ✅ Technical leads (when evaluating architecture)
- ✅ Product managers (when estimating complexity)

### How to Use This Document

**If you're an AI agent:**
1. Read sections 1-8 (principles and workflow)
2. Read section 9 (code review philosophy)
3. Reference section 11-29 (standards and rules)
4. Check section 30-31 (checklists before submitting code)

**If you're a human engineer:**
1. Read sections 1-10 (principles and process)
2. Skim sections 11-29 (reference as needed)
3. Use section 30-31 when reviewing code or shipping features

---

## 2. Engineering Principles

These principles underpin every decision in this handbook.

| Principle | Definition | Why It Matters |
|-----------|-----------|-----------------|
| **Clarity Over Cleverness** | Code should be obvious, not impressive | Maintenance burden falls on future engineers |
| **Explicit Over Implicit** | All behavior should be visible in the code | Prevent subtle bugs and assumptions |
| **Simple Over Complex** | Solve the current problem, not imagined future problems | Premature abstraction creates technical debt |
| **Measurable Over Assumed** | Decisions are data-driven, not opinion-driven | Prevents wasted effort on false optimizations |
| **Tested Over Assumed** | Code is verified to work before shipping | Catches bugs before production |
| **Documented Over Assumed** | Reasoning is explained in code, commits, and PRs | Prevents repeated discussions and decisions |
| **Maintainable Over Optimal** | Code prioritizes readability and future modification | Most code is read more than written |
| **Production-Ready Over Complete** | Partial features are acceptable; broken features are not | Incomplete features can be iterated; broken code breaks trust |

---

## 3. AI Coding Philosophy

This section defines how AI agents should behave when writing code.

### The AI's Role

An AI coding agent is a **junior engineer with perfect recall and the ability to work 24/7**. It should:

- ✅ Understand the codebase completely
- ✅ Follow established patterns
- ✅ Ask for clarification when uncertain
- ✅ Explain architectural choices
- ✅ Avoid premature optimization
- ✅ Write code that's easy to understand
- ✅ Test thoroughly before submitting

An AI should NOT:

- ❌ Invent new patterns or architectures without discussion
- ❌ Cut corners to "ship faster"
- ❌ Disable linting or type checking
- ❌ Duplicate code or utilities
- ❌ Leave TODO comments instead of implementing
- ❌ Ignore TypeScript errors or warnings
- ❌ Make architectural decisions without justification

### AI Coding Workflow

```
User Request
    ↓
Read Context Files (01-04)
    ↓
Search Codebase (existing patterns, components, utilities)
    ↓
Identify Reusable Elements
    ↓
Design Solution (explain reasoning)
    ↓
Implement Following Standards
    ↓
Write Tests
    ↓
Verify Build, Lints, Types
    ↓
Explain Changes
    ↓
Submit for Review
```

### Before You Write Any Code

1. **Search existing code** for similar functionality
2. **Understand the domain** (read relevant business logic)
3. **Check patterns** in the codebase
4. **Verify dependencies** (do they already exist?)
5. **Read relevant tests** (understand expected behavior)
6. **Plan the solution** (mental model before implementation)
7. **Explain your reasoning** before implementation

**Example: Before adding a utility function**
```
SEARCH: grep -r "calculate.*budget" src/
ANALYZE: "Similar functions exist in projects/service.ts and invoices/service.ts"
DECISION: Extract into shared utility (packages/shared/utils/calculations.ts)
REASON: Reduces duplication, centralizes business logic
```

---

## 4. Repository Philosophy

The repository is organized around **domains**, not **types**.

**Why Domain-Driven?**

- Single responsibility (one domain = one business concern)
- Easier to find related code (all projects code together)
- Simpler to reason about dependencies (clear domain boundaries)
- Enables independent scaling (each domain can evolve separately)

### Repository Structure Principles

**Every file has a clear purpose:**

| File Type | Purpose | Example |
|-----------|---------|---------|
| **routes.ts** | Express routes (entry points) | `domains/projects/routes.ts` |
| **service.ts** | Business logic orchestration | `domains/projects/service.ts` |
| **repository.ts** | Data access layer | `domains/projects/repository.ts` |
| **validators.ts** | Input validation schemas | `domains/projects/validators.ts` |
| **types.ts** | TypeScript types | `domains/projects/types.ts` |
| **index.ts** | Export public API | `domains/projects/index.ts` |
| **\*.test.ts** | Unit tests | `domains/projects/service.test.ts` |

**Every domain owns its structure:**

```
domains/projects/
├── routes.ts           # Express routes (thin controller)
├── service.ts          # Business logic
├── repository.ts       # Database queries
├── validators.ts       # Zod schemas
├── types.ts            # TypeScript types
├── index.ts            # Public exports
└── __tests__/
    ├── service.test.ts
    └── repository.test.ts
```

---

## 5. Definition of Production Ready

Before any code ships to production, it must meet these criteria:

### Functionality

- ✅ Feature works end-to-end (no partial implementations)
- ✅ All happy paths are tested
- ✅ All error cases are handled
- ✅ Edge cases are considered and handled
- ✅ Integrates with existing features without breaking them

### Code Quality

- ✅ TypeScript strict mode passes (no implicit `any`)
- ✅ Linting passes (Biome)
- ✅ No console errors or warnings in development
- ✅ No commented-out code
- ✅ No unused variables or imports
- ✅ No hard-coded values (use constants or environment variables)

### Testing

- ✅ Unit tests for business logic (> 80% coverage)
- ✅ Integration tests for APIs (all endpoints tested)
- ✅ E2E tests for critical user flows
- ✅ All tests pass locally and in CI

### Performance

- ✅ API responses < 200ms (p95)
- ✅ Database queries < 100ms (p95)
- ✅ No unnecessary database queries (N+1 prevention)
- ✅ Appropriate caching applied
- ✅ Bundle size impact assessed

### Security

- ✅ All user input validated (Zod schemas)
- ✅ Authentication required on protected endpoints
- ✅ Authorization checked (user can only see their own data)
- ✅ No secrets in code or .env files
- ✅ SQL injection/XSS prevention applied

### Documentation

- ✅ Code comments explain WHY, not WHAT
- ✅ Function signatures document parameters and return values
- ✅ Architectural changes documented in ADR
- ✅ README updated if new setup steps needed

### Monitoring

- ✅ Errors are logged and tracked
- ✅ Business metrics are instrumented
- ✅ Performance metrics are tracked
- ✅ No silent failures (errors bubble up)

---

## 6. Definition of Done

A feature is "done" when it meets these criteria:

### Feature Complete

| Criteria | Status | Notes |
|----------|--------|-------|
| Specification written and approved | ✅ | Found in `/docs` or as PR description |
| API designed and documented | ✅ | API endpoints defined, response format specified |
| Database schema created | ✅ | Migration written and tested |
| Frontend implemented | ✅ | UI matches design, all states handled |
| Backend implemented | ✅ | All endpoints functional, business logic correct |
| AI service integrated (if applicable) | ✅ | Workflow defined, tested end-to-end |
| Tests written | ✅ | Unit, integration, E2E as needed |
| Code reviewed and approved | ✅ | At least 1 senior engineer approval |
| Deployed to staging | ✅ | Tested in staging environment |
| Deployed to production | ✅ | Rolled out gradually, no errors |

### Quality Checklist

- ✅ All automated checks pass (linting, types, tests)
- ✅ No TypeScript errors
- ✅ No console errors in dev tools
- ✅ Performance acceptable
- ✅ Security requirements met
- ✅ Documentation updated
- ✅ Related tests updated
- ✅ Dependencies documented

### Stakeholder Sign-off

- ✅ Product manager confirms feature matches spec
- ✅ Engineering lead confirms architecture is sound
- ✅ At least one code reviewer approves
- ✅ QA confirms functionality

---

## 7. Development Workflow

The workflow for developing any feature follows this process:

```
Research & Design
        ↓
Environment Setup
        ↓
Feature Branch
        ↓
Development
        ↓
Testing
        ↓
Commit & Push
        ↓
Pull Request
        ↓
Code Review
        ↓
Merge to Main
        ↓
Deployment
```

### Phase 1: Research & Design

**Before writing any code:**

1. **Understand the requirement** - What problem are we solving?
2. **Research existing code** - What patterns exist?
3. **Design the solution** - What's the simplest implementation?
4. **Identify dependencies** - What already exists?
5. **Plan the work** - Break into logical steps

**Outcome:** Clear understanding of what to build and why.

### Phase 2: Environment Setup

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/project-scope-analysis

# 2. Install dependencies (if needed)
npm install

# 3. Set up .env.local
cp .env.example .env.local
# Update with local values
```

### Phase 3: Development

**Write code following the standards in this handbook.**

- Follow naming conventions (section 22)
- Organize code by domain (section 4)
- Keep functions focused (section 11-29)
- Add comments explaining WHY (section 14)
- Use TypeScript strictly (section 11)

### Phase 4: Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Run E2E tests (critical features)
npm run test:e2e

# Build frontend (catch build-time errors)
npm run build
```

**All must pass before committing.**

### Phase 5: Commit & Push

```bash
# Stage changes
git add <specific files>

# Commit with clear message
git commit -m "feat(projects): add scope analysis engine"

# Push to remote
git push -u origin feature/project-scope-analysis
```

**Commit messages follow Conventional Commits format:**
```
<type>(<scope>): <subject>

<optional body explaining why>

<optional footer with issue reference>
```

**Types:** feat, fix, docs, style, refactor, perf, test, chore

### Phase 6: Pull Request

**Create PR with clear description:**

```markdown
## Description
Implements AI-powered scope analysis for projects.

## Changes
- Added scope analyzer service with LangGraph workflow
- Created `/api/v1/projects/:id/analyze-scope` endpoint
- Added unit tests for analysis logic
- Updated database schema with scope_analysis table

## Testing
- Unit tests pass (scope_analyzer.test.ts)
- Integration tests pass (API endpoints)
- E2E test confirms user flow works

## Performance Impact
- New DB query uses indexed columns (project_id, user_id)
- Response time: 2-3 seconds (acceptable for AI analysis)

## Breaking Changes
None

## Related Issues
Closes #42
```

### Phase 7: Code Review

**Reviewer checks:**
- Does it match the specification?
- Is the architecture sound?
- Is the code maintainable?
- Are there security issues?
- Are tests adequate?
- Is performance acceptable?

**See section 30 for detailed code review checklist.**

### Phase 8: Merge to Main

```bash
# Ensure branch is up to date
git fetch origin
git rebase origin/main

# Squash and merge to main
git checkout main
git pull origin main
git merge --squash feature/project-scope-analysis
git commit -m "feat(projects): add scope analysis engine"
git push origin main

# Delete feature branch
git branch -D feature/project-scope-analysis
git push origin --delete feature/project-scope-analysis
```

### Phase 9: Deployment

Deployment is triggered automatically by CI/CD:

```
Merge to main
    ↓
GitHub Actions runs (build, test, type-check)
    ↓
Deploy to staging
    ↓
Smoke tests pass?
    ↓
(Manual trigger for production)
    ↓
Deploy to production
    ↓
Monitor error rates
```

---

## 8. Pull Request Workflow

### Before Opening PR

- [ ] All tests pass locally
- [ ] Code is linted and formatted
- [ ] No TypeScript errors
- [ ] Branch is up to date with main
- [ ] Commit messages follow conventions
- [ ] Documentation is updated

### PR Title

Use Conventional Commits format:
```
feat(projects): add AI scope analysis engine
fix(invoices): correct GST calculation for 5% slab
docs(api): update authentication endpoint documentation
```

### PR Description Template

```markdown
## Description
[What does this PR do? Why is it needed?]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Refactoring

## Related Issues
Closes #123

## Changes
- [List major changes]
- [What files were modified]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests pass

## Performance Impact
[Any performance implications? Load testing results?]

## Security Considerations
[Any security implications? Validation added?]

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes (describe):

## Checklist
- [ ] Code follows project standards
- [ ] No console errors or warnings
- [ ] Documentation updated
- [ ] Tests pass locally and in CI
- [ ] No hard-coded values
- [ ] No commented-out code
```

### Responding to Review Feedback

1. **Understand the feedback** - Ask clarifying questions if needed
2. **Make requested changes** - Or explain why you disagree
3. **Commit with clear messages** - `fix: address PR feedback on X`
4. **Force-push is okay** - Keep commit history clean (`git push --force-with-lease`)
5. **Reply to comments** - Acknowledge all feedback

### Merging

Only merge when:
- ✅ All tests pass
- ✅ No conflicts with main
- ✅ At least 1 approval from senior engineer
- ✅ All conversations resolved
- ✅ CI checks pass

---

## 9. Code Review Philosophy

Code review is how we maintain quality and share knowledge.

### What Reviewers Look For

**Functionality**
- Does the code solve the stated problem?
- Are edge cases handled?
- Are error cases handled gracefully?
- Does it integrate well with existing code?

**Architecture**
- Does the code follow established patterns?
- Are responsibilities clearly separated?
- Is the design maintainable?
- Could it be simpler?

**Quality**
- Is the code clear and easy to understand?
- Are there comments explaining complex logic?
- Are variable names descriptive?
- Is there duplicated code?

**Security**
- Is all user input validated?
- Are permissions checked?
- Are secrets handled correctly?
- Could this introduce vulnerabilities?

**Performance**
- Are there obvious performance issues?
- Are database queries optimized?
- Are there N+1 query problems?
- Is caching used appropriately?

**Testing**
- Are tests comprehensive?
- Do tests verify behavior, not implementation?
- Is coverage adequate?
- Could tests be better?

### How to Ask for Changes

**Be specific:**
```
❌ "This doesn't look right"
✅ "This query could cause N+1 problems. Consider using eager loading."
```

**Suggest improvements:**
```
❌ "This is inefficient"
✅ "This could be more efficient by using redis.mget() instead of iterating."
```

**Ask questions:**
```
❌ "Why did you do it this way?"
✅ "Have you considered using the existing utility in packages/shared/utils?
    That might reduce duplication."
```

### Reviewer Responsibilities

| Responsibility | Why |
|----------------|-----|
| Verify requirements met | Catch misunderstandings early |
| Check code quality | Maintain consistency |
| Suggest improvements | Share knowledge |
| Ask clarifying questions | Improve clarity |
| Approve when satisfied | Unblock author |

---

## 10. Refactoring Philosophy

Refactoring is essential for maintaining code quality, but it has rules.

### When to Refactor

✅ **DO refactor when:**
- Code is duplicated (DRY principle)
- Function has multiple responsibilities
- Code is confusing and needs clarity
- Performance needs improvement
- Tests require significant refactoring to add new ones
- Architecture needs improvement

❌ **DON'T refactor when:**
- Feature deadline is approaching
- Code is "good enough" and not causing problems
- You don't fully understand the current code
- It's not directly related to the feature you're building
- There are no tests covering the code

### Refactoring Process

1. **Write tests first** - Ensure current behavior is captured
2. **Refactor incrementally** - Small, focused changes
3. **Verify tests pass** - After each change
4. **Commit clearly** - `refactor: extract utility from X`
5. **Explain reasoning** - In PR description

### Large Refactoring

For large architectural changes:
1. Create an ADR (Architecture Decision Record)
2. Get architecture approval
3. Break work into smaller PRs (if possible)
4. Each PR should be independently reviewable
5. Add detailed comments explaining changes

---

## 11. TypeScript Standards

### Strict Mode: Always Enabled

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Never disable type checking. Ever.** If TypeScript complains, fix it.

### Types: Explicit and Meaningful

```typescript
// ❌ Avoid 'any'
function processData(data: any) {
  return data.value;
}

// ✅ Use specific types
function processData(data: ProjectInput) {
  return data.value;
}

// ✅ Use union types for flexibility
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

// ✅ Use generics for reusability
function cache<T>(fn: () => Promise<T>): () => Promise<T> {
  let cached: T;
  return async () => {
    if (!cached) {
      cached = await fn();
    }
    return cached;
  };
}
```

### Type Inference

Use TypeScript's inference when it's clear:

```typescript
// ✅ Clear inference
const user = await db.query.users.findUnique({ where: { id: '123' } });
//    ^ TypeScript knows user is User | undefined

// ✅ Explicit when unclear
const result: ApiResponse<Project> = await api.getProject();

// ✅ Function return types always explicit
function calculateBudget(hourlyRate: number, hours: number): number {
  return hourlyRate * hours;
}
```

### Avoid Type Assertions

Type assertions (`as`) are often a sign of a deeper problem:

```typescript
// ❌ Avoid this
const value = data as Project;

// ✅ Validate instead
const value = projectSchema.parse(data);

// ✅ Use type guards
if (isProject(data)) {
  // TypeScript now knows data is Project
}
```

---

## 12. React Standards

### Prefer Server Components

Server Components are the default in Next.js App Router:

```typescript
// ✅ Server Component (default)
// Can access database, secrets, file system
export default async function ProjectsPage() {
  const projects = await db.query.projects.findMany();
  return <ProjectList projects={projects} />;
}

// ✅ Client Component (explicit opt-in)
'use client';
export default function ProjectFilter({ onFilter }) {
  const [status, setStatus] = useState('active');
  return (
    <select onChange={(e) => onFilter(e.target.value)}>
      <option value="active">Active</option>
      <option value="completed">Completed</option>
    </select>
  );
}
```

**Why Server Components?**
- Smaller JavaScript bundle (no component code sent to browser)
- Direct database access (no API layer needed)
- Secrets stay on server
- Automatic code splitting

### Component Naming

```typescript
// ✅ Components are PascalCase
export default function ProjectCard({ project }) { }

// ✅ Files match component names
// ProjectCard.tsx → export ProjectCard

// ✅ Hooks start with "use"
export function useProjects() { }

// ✅ Utilities are camelCase
export const formatDate = (date: Date) => { }
```

### Props: Explicit and Typed

```typescript
// ✅ Define interface for props
interface ProjectCardProps {
  project: Project;
  onEdit?: (id: string) => void;
  isLoading?: boolean;
}

export function ProjectCard({ project, onEdit, isLoading = false }: ProjectCardProps) {
  return <div>{/* ... */}</div>;
}

// ❌ Avoid spreading props carelessly
function Component(props: any) { }

// ✅ Be specific
function Component({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) { }
```

### Hooks: Use with Purpose

```typescript
// ✅ TanStack Query for server state
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.getProjects(),
});

// ✅ useState for UI state
const [isOpen, setIsOpen] = useState(false);

// ✅ useCallback to prevent unnecessary re-renders
const handleUpdate = useCallback((id: string) => {
  mutate({ id });
}, [mutate]);

// ❌ Avoid useEffect when useQuery works
// ❌ Avoid useEffect for initial data fetching
```

### Components: Keep Them Small

```typescript
// ❌ Too many responsibilities
function ProjectPage() {
  const projects = useProjects();
  const [filter, setFilter] = useState('active');
  const filtered = projects.filter(p => p.status === filter);
  
  return (
    <div>
      <h1>Projects</h1>
      <div>
        <button onClick={() => setFilter('active')}>Active</button>
        <button onClick={() => setFilter('completed')}>Completed</button>
      </div>
      <div>
        {filtered.map(p => (
          <div key={p.id}>{p.title}</div>
        ))}
      </div>
    </div>
  );
}

// ✅ Split into smaller components
export function ProjectPage() {
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  
  return (
    <div>
      <h1>Projects</h1>
      <ProjectFilter filter={filter} onFilterChange={setFilter} />
      <ProjectList filter={filter} />
    </div>
  );
}

function ProjectFilter({ filter, onFilterChange }: ProjectFilterProps) {
  return (
    <div>
      <button onClick={() => onFilterChange('active')}>Active</button>
      <button onClick={() => onFilterChange('completed')}>Completed</button>
    </div>
  );
}

function ProjectList({ filter }: { filter: 'active' | 'completed' }) {
  const { data: projects } = useProjects();
  const filtered = projects?.filter(p => p.status === filter) ?? [];
  
  return (
    <div>
      {filtered.map(p => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
```

---

## 13. Backend Standards

### Service Layer: Business Logic

```typescript
// domains/projects/service.ts
export class ProjectService {
  constructor(private repo = new ProjectRepository()) {}
  
  async createProject(userId: string, data: CreateProjectInput) {
    // Validate business logic
    const existingProject = await this.repo.findByTitle(data.title, userId);
    if (existingProject) {
      throw new ValidationError('Project with this title already exists');
    }
    
    // Create project
    const project = await this.repo.create({
      ...data,
      userId,
      createdAt: new Date(),
    });
    
    // Emit event (for real-time updates, background jobs, etc.)
    eventBus.emit('project:created', project);
    
    return project;
  }
}
```

### Repository Layer: Data Access

```typescript
// domains/projects/repository.ts
export class ProjectRepository {
  async findByUserId(userId: string) {
    // Simple, single-purpose queries
    return db.query.projects.findMany({
      where: eq(projects.userId, userId),
      orderBy: desc(projects.createdAt),
    });
  }
  
  async findWithRelations(projectId: string) {
    // Eager load related data
    return db.query.projects.findUnique({
      where: eq(projects.id, projectId),
      with: {
        invoices: true,
        milestones: true,
      },
    });
  }
}
```

### Routes: Thin Controllers

```typescript
// domains/projects/routes.ts
import { Router } from 'express';

const router = Router();
const service = new ProjectService();

router.get('/', async (req, res, next) => {
  try {
    const projects = await service.getUserProjects(req.user.id);
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);  // Pass to error middleware
  }
});

router.post('/', validateInput(createProjectSchema), async (req, res, next) => {
  try {
    const project = await service.createProject(req.user.id, req.body);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Validation: At Boundaries

```typescript
// domains/projects/validators.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(10).max(5000),
  budget: z.number().positive(),
  clientId: z.string().uuid(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Use in routes
router.post('/', validateInput(createProjectSchema), async (req, res) => {
  // req.body is now guaranteed to be CreateProjectInput
});
```

---

## 14. Error Handling

### Explicit Error Classes

```typescript
// utils/errors.ts
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

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
```

### Error Middleware

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
  
  // Default to 500
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
```

### Error Handling in Async Code

```typescript
// ✅ Always handle async errors
router.get('/:id', async (req, res, next) => {
  try {
    const project = await service.getProject(req.params.id);
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);  // Pass to middleware
  }
});

// ❌ Don't forget catch blocks
router.get('/:id', async (req, res) => {
  const project = await service.getProject(req.params.id);  // If this throws, request hangs
  res.json({ success: true, data: project });
});
```

---

## 15. Logging Standards

### Structured Logging

```typescript
// Always use JSON format with context
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
  timestamp: new Date().toISOString(),
});

logger.error('Payment processing failed', {
  projectId: project.id,
  amount: payment.amount,
  userId: payment.userId,
  error: error.message,
  stack: error.stack,
  retryAttempt: attempt,
});
```

### What to Log

| Event | What to Log | Example |
|-------|-----------|---------|
| **Errors** | Error message, stack, context | `{ userId, projectId, amount }` |
| **API Requests** | Method, path, response time, status | `{ method, path, duration, status }` |
| **Database Operations** | Query type, duration, rows affected | `{ query: 'SELECT', duration: 45, rows: 10 }` |
| **External API Calls** | Service, endpoint, response status | `{ service: 'openai', endpoint: '/completions', status: 200 }` |
| **Business Events** | Event type, relevant IDs | `{ event: 'invoice:created', invoiceId, projectId }` |

### What NOT to Log

❌ **Never log:**
- User passwords
- API keys or secrets
- Credit card numbers
- Personally identifiable information (unless necessary)
- Entire request/response bodies (log selectively)

---

## 16. API Standards

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* ... */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

**Paginated Response:**
```json
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

### Status Codes

| Code | Use Case | Example |
|------|----------|---------|
| **200** | Request succeeded | GET project details |
| **201** | Resource created | POST project |
| **400** | Invalid input | Missing required field |
| **401** | Unauthenticated | Missing/invalid token |
| **403** | Unauthorized | No permission to resource |
| **404** | Resource not found | Project ID doesn't exist |
| **409** | Conflict | Project already exists |
| **429** | Rate limited | Too many requests |
| **500** | Server error | Unexpected failure |

### API Naming

```
GET    /api/v1/projects              # List projects
POST   /api/v1/projects              # Create project
GET    /api/v1/projects/:id          # Get single project
PUT    /api/v1/projects/:id          # Update project
DELETE /api/v1/projects/:id          # Delete project

# Nested resources
GET    /api/v1/projects/:id/invoices # List project invoices
POST   /api/v1/projects/:id/invoices # Create invoice for project
```

---

## 17. Testing Standards

### Unit Tests (70-80% of coverage)

Test business logic in isolation:

```typescript
// domains/projects/service.test.ts
import { describe, it, expect } from 'vitest';
import { ProjectService } from './service';
import { MockRepository } from './__mocks__/repository';

describe('ProjectService', () => {
  it('should create project with valid input', async () => {
    const repo = new MockRepository();
    const service = new ProjectService(repo);
    
    const project = await service.createProject('user-123', {
      title: 'New Project',
      budget: 50000,
    });
    
    expect(project.title).toBe('New Project');
    expect(project.budget).toBe(50000);
    expect(repo.create).toHaveBeenCalled();
  });
  
  it('should throw error if project already exists', async () => {
    const repo = new MockRepository();
    repo.findByTitle.mockResolvedValue({ id: '1', title: 'Project' });
    
    const service = new ProjectService(repo);
    
    await expect(
      service.createProject('user-123', { title: 'Project' })
    ).rejects.toThrow('Project with this title already exists');
  });
});
```

### Integration Tests (15-20% of coverage)

Test API contracts and service interactions:

```typescript
describe('POST /api/v1/projects', () => {
  it('should create project and return 201', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'New Project',
        budget: 50000,
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('New Project');
  });
});
```

### E2E Tests (5-10% of coverage)

Test critical user flows end-to-end:

```typescript
test('user can create and invoice a project', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button:has-text("Login")');
  
  // Create project
  await page.goto('/dashboard');
  await page.click('button:has-text("New Project")');
  await page.fill('input[placeholder="Title"]', 'My Project');
  await page.click('button:has-text("Create")');
  
  // Create invoice
  await page.click('button:has-text("Invoice")');
  await page.click('button:has-text("Create")');
  
  // Verify
  await expect(page).toHaveURL(/\/invoices\/.*[/]?$/);
});
```

### Mocking Strategy

```typescript
// ✅ Use MSW for API mocking
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/v1/projects', () => {
    return HttpResponse.json({
      success: true,
      data: [{ id: '1', title: 'Project 1' }],
    });
  })
);

// ✅ Mock services with vitest
const mockRepo = {
  findByUserId: vi.fn(),
  create: vi.fn(),
};

// ❌ Avoid mocking implementation details
// ❌ Avoid testing implementation instead of behavior
```

### When Tests Are Mandatory

| Scenario | Tests Required | Why |
|----------|----------------|-----|
| **Business Logic** | Unit tests (70%+ coverage) | Ensures correctness |
| **API Endpoints** | Integration tests (all endpoints) | Ensures contracts |
| **Critical User Flows** | E2E tests | Ensures user experience |
| **Bug Fixes** | Regression test | Prevents relapse |
| **Database Changes** | Migration tests | Ensures data safety |
| **Authentication** | Security tests | Prevents vulnerabilities |

---

## 18. Performance Standards

### Frontend Performance

**Target Metrics:**

| Metric | Target | Tool |
|--------|--------|------|
| **First Contentful Paint (FCP)** | < 1.8s | Lighthouse |
| **Largest Contentful Paint (LCP)** | < 2.5s | Lighthouse |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse |
| **Time to Interactive (TTI)** | < 3.8s | Lighthouse |
| **Bundle Size (JS)** | < 200KB gzipped | Bundle Analyzer |

**How to Optimize:**

```typescript
// ✅ Use dynamic imports for heavy components
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
});

// ✅ Use next/image for optimization
import Image from 'next/image';
<Image src={url} alt="" priority={false} />

// ✅ Code split by route automatically in Next.js
// Each route gets its own JS bundle

// ✅ Memoize expensive computations
const MemoizedComponent = memo(HeavyComponent);

// ✅ Use useCallback for event handlers
const handleUpdate = useCallback(() => { }, [dependencies]);
```

### Backend Performance

**Target Metrics:**

| Metric | Target | How Measured |
|--------|--------|--------------|
| **API Response Time (p95)** | < 200ms | New Relic/Datadog |
| **Database Query Time (p95)** | < 100ms | Query logs |
| **Error Rate** | < 0.1% | Sentry |
| **Memory Usage** | < 512MB | CloudWatch |

**How to Optimize:**

```typescript
// ✅ Use database indexes on frequently-queried columns
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);

// ✅ Eager load related data (prevent N+1)
const projects = await db.query.projects.findMany({
  with: { invoices: true, milestones: true }  // Single query
});

// ✅ Cache frequently-accessed data
const cached = await redis.get(`projects:${userId}`);
if (cached) return JSON.parse(cached);

// ✅ Use connection pooling
const pool = new Pool({ max: 20, idleTimeoutMillis: 30000 });

// ✅ Paginate large result sets
const page = query.page || 1;
const pageSize = 20;
const offset = (page - 1) * pageSize;
```

---

## 19. Security Standards

### Input Validation

All user input must be validated using Zod:

```typescript
// ❌ Don't trust user input
const project = await db.query.projects.findUnique({
  where: { id: req.query.id }  // Could be anything
});

// ✅ Validate first
const schema = z.object({ id: z.string().uuid() });
const { id } = schema.parse(req.query);
const project = await db.query.projects.findUnique({ where: { id } });
```

### Authentication

```typescript
// ✅ Require authentication on protected endpoints
router.get('/projects', authMiddleware, async (req, res) => {
  // req.user is now guaranteed to exist
  const projects = await service.getUserProjects(req.user.id);
  res.json({ success: true, data: projects });
});

// ✅ Use JWT for stateless authentication
const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '24h' });

// ❌ Never store secrets in code
// const SECRET = 'hardcoded-secret';  // WRONG!

// ✅ Use environment variables
const SECRET = process.env.JWT_SECRET;
```

### Authorization

```typescript
// ✅ Check permissions before operating
async function updateProject(projectId: string, userId: string, data: any) {
  const project = await db.query.projects.findUnique({
    where: { id: projectId }
  });
  
  if (project.userId !== userId) {
    throw new AuthorizationError('You cannot modify this project');
  }
  
  return db.update(projects).set(data).where(eq(projects.id, projectId));
}

// ❌ Don't assume user can access resource
// Just because they sent the ID doesn't mean they own it
```

### Secrets Management

```typescript
// ✅ Use environment variables
const API_KEY = process.env.OPENAI_API_KEY;

// ✅ Never commit .env files
// .env.local goes in .gitignore

// ✅ Validate required secrets on startup
if (!process.env.JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

// ❌ Never log secrets
logger.info('API Key:', apiKey);  // WRONG!
logger.info('Calling OpenAI API');  // RIGHT
```

### SQL Injection Prevention

Drizzle ORM prevents SQL injection through parameterized queries:

```typescript
// ✅ Safe (parameterized)
const project = await db.query.projects.findUnique({
  where: eq(projects.id, userId)
});

// ❌ Never build SQL strings
const query = `SELECT * FROM projects WHERE id = '${projectId}'`;  // VULNERABLE!
```

---

## 20. Naming Conventions

### Files

```
// Components
ProjectCard.tsx          (PascalCase)
ProjectForm.tsx
useProjects.ts          (camelCase, starts with 'use')

// Utilities
calculateBudget.ts      (camelCase)
formatDate.ts
validators.ts           (plural for collections)
constants.ts

// Tests
service.test.ts         (mirror source name)
ProjectCard.test.tsx

// Domains
domains/projects/
  routes.ts             (always lowercase)
  service.ts
  repository.ts
  validators.ts
```

### Variables & Functions

```typescript
// Components (PascalCase)
function ProjectCard() { }
const ProjectList = memo(Component);

// Variables (camelCase)
const project = { };
let isLoading = false;
const MAX_PROJECTS = 10;  // Constants (UPPER_SNAKE_CASE)

// Functions (camelCase)
function calculateBudget() { }
const formatDate = (date) => { };
const handleClick = () => { };  // Event handlers start with 'handle'
const onUpdate = (id) => { };   // Callbacks start with 'on'

// Booleans (is/has/can prefix)
const isLoading = false;
const hasPermission = true;
const canDelete = true;
```

### Database Columns

```sql
-- Snake case
user_id              -- Foreign keys end with _id
project_id
created_at           -- Timestamps
updated_at
deleted_at           -- Soft delete marker
is_active            -- Booleans start with is_
has_notification
can_edit
```

### API Endpoints

```
GET    /api/v1/projects           -- Plural nouns
POST   /api/v1/projects
PUT    /api/v1/projects/:id       -- Use :id for path params
DELETE /api/v1/projects/:id

GET    /api/v1/projects/:id/invoices  -- Nested resources
```

---

## 21. Dependency Guidelines

### Adding Dependencies

Before adding any dependency, ask:

1. **Is it necessary?** - Does the problem justify the complexity?
2. **Is it maintained?** - Active development, recent updates?
3. **Is it popular?** - Large community, StackOverflow answers?
4. **Is it lightweight?** - What's the bundle size impact?
5. **Could we build it?** - Is this simple enough to implement ourselves?

| Dependency | Acceptable | Why |
|-----------|-----------|-----|
| **React** | ✅ Yes | Essential framework |
| **Next.js** | ✅ Yes | Solves routing, SSR, optimization |
| **TanStack Query** | ✅ Yes | Solves complex server state |
| **Zod** | ✅ Yes | Solves validation at scale |
| **Lodash** | ❌ No | Use native JS instead |
| **Moment.js** | ❌ No | Use native Date or date-fns |
| **10kb-date-lib** | ❌ No | Probably too niche |

### Version Pinning

Use exact versions, not ranges:

```json
{
  "dependencies": {
    "react": "19.0.0",           // ✅ Exact
    "next": "^14.0.0",           // ❌ Range
    "zod": "~3.22.0"             // ❌ Range
  }
}
```

**Why?** Exact versions prevent "works on my machine" issues.

### Dependency Review

Every new dependency is reviewed for:
- Bundle size impact (use `npm ls` to check)
- Security vulnerabilities (Snyk)
- Maintenance status (GitHub activity)
- Compatibility (Node.js, React version)

---

## 22. Quality Toolchain

### Biome (Formatting & Linting)

**Purpose:** Enforce code style and catch bugs

**When it runs:**
- On every commit (pre-commit hook)
- In CI/CD pipeline
- In IDE (on save)

**Configuration:**

```json
{
  "formatter": {
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

**Common Issues & Fixes:**

```bash
# Check formatting
biome check --write .

# Fix linting errors
biome lint --fix .
```

### TypeScript (Type Safety)

**Purpose:** Catch type errors at compile time

**Mandatory Configuration:**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**Workflow:**
```bash
# Check types (no emit)
tsc --noEmit

# Never ignore type errors
// @ts-ignore  ❌ FORBIDDEN
```

### Vitest (Unit Testing)

**Purpose:** Test business logic in isolation

**Workflow:**
```bash
# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Target: 80%+ coverage for business logic
```

### Playwright (E2E Testing)

**Purpose:** Test user workflows end-to-end

**Critical Flows to Test:**
- User authentication (login, signup)
- Create project
- Generate invoice
- Scope analysis workflow

### Knip (Unused Dependencies)

**Purpose:** Find and remove unused packages

**Workflow:**
```bash
npx knip

# Review suggestions and remove unused deps
npm uninstall <unused-package>
```

### Type Coverage

**Purpose:** Ensure explicit types (avoid implicit `any`)

**Target:** 95%+ explicit types

```bash
# Check coverage
type-coverage --at-least 95
```

### React Scan & React Doctor

**Purpose:** Detect rendering performance issues and anti-patterns

**Use in development:**
- Open React DevTools Profiler
- Identify unnecessary re-renders
- Use `memo`, `useCallback` to optimize

---

## 23. AI Agent Specific Rules

### Before Any Code Generation

1. ✅ **Read the relevant context files** (01-project-context.md, 03-engineering-context.md)
2. ✅ **Search the codebase** for similar functionality
3. ✅ **Check existing patterns** in the domain
4. ✅ **Verify dependencies** already exist
5. ✅ **Understand the architecture** before coding

### Code Generation Rules

| Rule | Why |
|------|-----|
| **Always search before creating** | Avoid duplicating existing utilities |
| **Reuse existing components** | Reduces code duplication |
| **Never disable TypeScript strict mode** | Catches bugs early |
| **Never silence linting errors** | Enforces standards |
| **Never skip tests** | Ensures quality |
| **Always explain architectural changes** | Helps reviewers understand |
| **Keep functions focused and small** | Easier to test and maintain |
| **Prefer composition over inheritance** | More flexible |
| **Use explicit typing** | Prevents bugs |

### Common Mistakes to Avoid

```typescript
// ❌ Creating new component when one exists
// Search first: grep -r "ProjectCard" src/

// ❌ Using 'any' type
function process(data: any) { }

// ✅ Use specific types
function process(data: Project) { }

// ❌ Duplicating utilities
function calculateBudget() { }  // Same as another utility

// ✅ Reuse existing utilities
import { calculateBudget } from '@/lib/calculations';

// ❌ Not validating input
async function updateProject(data) { }

// ✅ Validate all input
async function updateProject(data: UpdateProjectInput) {
  const validated = updateProjectSchema.parse(data);
  // ...
}

// ❌ Silent failures
try {
  await riskyOperation();
} catch (error) {
  console.log('oops');  // Never silently fail
}

// ✅ Explicit error handling
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new OperationError('Failed to complete operation');
}
```

---

## 24. Definition of "Done": Comprehensive Checklist

### Pre-Implementation Checklist

- [ ] Requirement fully understood
- [ ] Specification reviewed and approved
- [ ] Architecture designed
- [ ] API endpoints defined (if applicable)
- [ ] Database schema planned (if applicable)
- [ ] No similar functionality exists in codebase
- [ ] Estimated effort and timeline communicated

### Implementation Checklist

- [ ] Code written following standards in this handbook
- [ ] All TypeScript strict mode rules pass
- [ ] All linting rules pass (Biome)
- [ ] No console errors or warnings
- [ ] No hard-coded values
- [ ] No commented-out code
- [ ] No unused imports or variables
- [ ] Comments explain WHY, not WHAT
- [ ] Meaningful function/variable names used

### Testing Checklist

- [ ] Unit tests written (business logic)
- [ ] Integration tests written (API endpoints)
- [ ] E2E tests written (critical user flows)
- [ ] Test coverage > 80% (business logic)
- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] Mocking/fixtures set up properly

### Performance Checklist

- [ ] No N+1 database queries
- [ ] Appropriate indexes created
- [ ] Database queries optimized
- [ ] No unnecessary re-renders (React)
- [ ] Code splitting applied where needed
- [ ] Bundle size impact assessed
- [ ] Performance metrics within targets
- [ ] Load testing completed (if applicable)

### Security Checklist

- [ ] All user input validated with Zod
- [ ] Authentication required on protected endpoints
- [ ] Authorization checks in place
- [ ] No secrets in code
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Rate limiting applied (if applicable)
- [ ] Audit logging for sensitive operations

### Documentation Checklist

- [ ] Code comments explain complex logic
- [ ] Function JSDoc includes parameters and return type
- [ ] Architecture changes documented in ADR (if applicable)
- [ ] README updated (if setup changed)
- [ ] API endpoints documented (if new endpoints)
- [ ] Migration documentation updated (if database changed)

### Code Review Checklist

- [ ] PR description is clear and complete
- [ ] All commits follow Conventional Commits format
- [ ] Related issues/tickets are referenced
- [ ] No merge conflicts
- [ ] Follows the coding standards in this handbook
- [ ] Architecture is sound
- [ ] No obvious bugs or issues

### Deployment Checklist

- [ ] All CI checks pass
- [ ] Feature works as expected in staging
- [ ] No regressions in other features
- [ ] Error rates normal
- [ ] Performance metrics normal
- [ ] Deployed successfully to production
- [ ] Monitoring/alerting configured
- [ ] Rollback plan documented (if needed)

---

## 25. Code Review Checklist

When reviewing code, use this checklist:

### Functionality

- [ ] Code solves the stated problem
- [ ] All requirements are met
- [ ] Edge cases handled
- [ ] Error cases handled gracefully
- [ ] Integrates well with existing code
- [ ] No breaking changes

### Code Quality

- [ ] Follows standards in this handbook
- [ ] TypeScript strict mode passes
- [ ] No linting errors
- [ ] Clear variable/function names
- [ ] Functions are small and focused
- [ ] No duplicated code
- [ ] Comments explain WHY, not WHAT

### Architecture

- [ ] Follows established patterns
- [ ] Uses existing utilities/components
- [ ] Appropriate separation of concerns
- [ ] No unnecessary abstractions
- [ ] Database schema is normalized
- [ ] API design follows REST conventions

### Performance

- [ ] No N+1 queries
- [ ] Appropriate indexes on database
- [ ] No unnecessary re-renders
- [ ] Caching used appropriately
- [ ] Bundle size impact acceptable

### Security

- [ ] All user input validated
- [ ] Authentication on protected endpoints
- [ ] Authorization checks in place
- [ ] No secrets in code
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

### Testing

- [ ] Adequate test coverage (> 80%)
- [ ] Tests verify behavior, not implementation
- [ ] All edge cases tested
- [ ] Error cases tested
- [ ] Mocks appropriate

### Documentation

- [ ] Code comments explain complex logic
- [ ] Function signatures documented
- [ ] Architectural changes documented
- [ ] README updated if needed

---

## 26. Open Questions

**Questions requiring decision:**

1. **Caching Strategy** - Should Redis caching be applied to all read operations or only high-frequency queries?
2. **Feature Flags** - Should we implement feature flags for gradual rollouts?
3. **Error Recovery** - What's the retry strategy for failed background jobs?
4. **Database Backup** - What's the backup and recovery SLA?

---

## 27. TODOs

- [ ] Set up Code Climate for code quality metrics
- [ ] Configure Sentry for error tracking
- [ ] Set up performance monitoring dashboard
- [ ] Create runbook for common incidents
- [ ] Document deployment process
- [ ] Set up staging environment parity checklist

---

## 28. Summary: How to Use This Handbook

**For AI Agents:**
Read before any coding task. Reference sections 3, 11-21 continuously.

**For Code Reviews:**
Use checklists in sections 24-25. Reference relevant standards.

**For Engineering Leads:**
Use to onboard new team members. Reference when making architectural decisions.

**For Contributors:**
Bookmark and reference when uncertain. Ask before deviating from patterns.

---

**End of AI Engineering Handbook**

Last Updated: August 2, 2026  
Next Review: November 2, 2026