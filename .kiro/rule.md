# AI Context Entry Point

**This document must be read first by every AI agent before any work begins.**

---

## Reading Order (Mandatory)

All AI agents must read these files in this exact order:
0. .agents\skillpnpm installs\caveman\SKILL.md
1. **01-project-context.md** - Vision, mission, product philosophy, market opportunity
2. **02-product-context.md** - Product features, roadmap, user personas, differentiators
3. **03-engineering-context.md** - Technical architecture, tech stack, database design
4. **04-ai-engineering-handbook.md** - Development process, coding standards, checklists
5. **05-operations-quality.md** - Production readiness, CI/CD, monitoring, incident response

**Location:** `context-for-ai/`

**Why this order?**
- Start with the business (what and why)
- Understand the product (features and users)
- Learn the technology (architecture and patterns)
- Master the process (how we build)
- Know production (how we operate)

---

## Core Principles

### 1. Immutable Context Files

Files in `context-for-ai/` are the **single source of truth**.

- ✅ Always read before making decisions
- ✅ Never contradict them
- ✅ Never ignore them
- ✅ Never invent information that conflicts with them

### 2. Documentation is Derived

Files in `docs/` are generated from the immutable context.

- `docs/00-Foundation/` - Vision, mission, goals, personas
- `docs/01-product/` - Product specs, roadmaps, user stories
- `docs/02-engineering/` - Architecture, database, API, deployment
- `docs/03-ai/` - Agent design, memory, prompts, evaluation
- `docs/04-development/` - Standards, testing, folder structure, workflow
- `docs/05-features/` - Individual feature specifications
- `docs/06-ADRs/` - Architecture Decision Records
- `docs/07-quality/` - Production readiness, checklists, security

### 3. Documentation Generation Policy

Never generate documentation pre-emptively.

Generate documentation ONLY when implementing a feature.

**Examples:**

```
Implementing authentication?
  → Generate docs/05-features/authentication.md first
  
Implementing projects?
  → Generate docs/05-features/projects.md first
  
Implementing invoices?
  → Generate docs/05-features/invoices.md first
  
Changing database strategy?
  → Generate docs/06-ADRs/ADR-XXX-new-database.md first
```

### 4. ADR Policy

Major architectural decisions require an ADR before implementation.

**What requires an ADR:**
- ✅ Database changes
- ✅ Framework changes
- ✅ Authentication strategy changes
- ✅ Caching strategy changes
- ✅ Deployment strategy changes
- ✅ AI architecture changes
- ✅ Major refactoring
- ✅ Dependency decisions

**What does NOT require an ADR:**
- ❌ New features (use feature spec instead)
- ❌ Bug fixes
- ❌ Small refactoring
- ❌ Minor optimizations

---

## Before You Start Any Work

### Step 1: Read the Immutable Context (5-10 min)

Read the 5 files in order. Take notes. Understand the big picture.

```
Read 01-project-context.md
   ↓
Read 02-product-context.md
   ↓
Read 03-engineering-context.md
   ↓
Read 04-ai-engineering-handbook.md
   ↓
Read 05-operations-quality.md
```

### Step 2: Check for Existing Documentation (2-5 min)

Before implementing, check if documentation exists.

```
Feature implementation?
  → Check docs/05-features/FEATURE_NAME.md
  
Architecture question?
  → Check docs/02-engineering/
  
Database question?
  → Check docs/02-engineering/database.md
  
Quality question?
  → Check docs/07-quality/
```

### Step 3: Generate Missing Documentation

If documentation doesn't exist, generate it now (before coding).

```
Document goes in appropriate docs/ folder
Follow the folder structure defined above
Use professional markdown
Include specification details
Include examples
Include links to related docs
```

### Step 4: Implement the Feature

Only after documentation is complete, implement.

```
Implement following standards from 04-ai-engineering-handbook.md
Write tests (unit, integration, E2E as needed)
Follow coding standards (TypeScript strict, Zod validation, etc.)
Ensure build/lint/type-check all pass
Update documentation as implementation reveals details
```

### Step 5: Summarize Changes

Explain what was done and why.

```
What was implemented?
Why this approach?
What trade-offs were made?
Links to relevant documentation
Links to related ADRs (if any)
```

---

## Implementation Workflow

```
START
  ↓
Read Immutable Context (5 files)
  ↓
Read Existing Documentation
  ↓
Check for Missing Documentation
  ↓
Generate Missing Documentation
  ↓
Design Solution
  ↓
Implement Code
  ↓
Write Tests
  ↓
Run Quality Checks
  ↓
Update Documentation
  ↓
Summarize Changes
  ↓
DONE
```

---

## Quality Standards

Every implementation must satisfy:

- ✅ Biome (formatting + linting)
- ✅ TypeScript (strict mode, no `any`)
- ✅ Zod (input validation)
- ✅ Vitest (unit tests > 80% coverage)
- ✅ Playwright (E2E tests for user flows)
- ✅ Knip (no unused dependencies)
- ✅ Type Coverage (95%+ explicit types)
- ✅ React Scan (no unnecessary re-renders)
- ✅ React Doctor (no anti-patterns)
- ✅ Dependency Cruiser (no circular dependencies)
- ✅ CodeRabbit (recommendations addressed)
- ✅ Build passes (no compile errors)
- ✅ No dead code (unused functions/variables removed)
- ✅ No duplicated logic (reuse existing utilities)

---

## Definition of Done

A task is complete ONLY when:

- ✅ Immutable context files reviewed
- ✅ Existing documentation read
- ✅ Missing documentation generated
- ✅ Implementation complete
- ✅ Tests written and passing
- ✅ Build passes
- ✅ Lint passes (Biome)
- ✅ Type checking passes (TypeScript)
- ✅ Coverage adequate (> 80%)
- ✅ No unnecessary code
- ✅ No duplicated logic
- ✅ Architecture respected
- ✅ Documentation updated
- ✅ Changes summarized

---

## Key Principles

### 1. Prefer Maintainability Over Speed

- Code is read 10x more than written
- Optimize for future maintenance
- Prioritize clarity over cleverness

### 2. Search Before Creating

- Check if component exists
- Check if utility exists
- Check if hook exists
- Reuse before building

### 3. Keep Architecture Clear

- Business logic in services
- Data access in repositories
- UI in components
- One responsibility per function

### 4. Document Decisions

- Major decisions → ADR
- Feature specs → Feature documentation
- Architecture → Architecture docs
- Implementation details → Code comments (WHY, not WHAT)

### 5. Quality is Non-Negotiable

- Never disable linting
- Never bypass type checking
- Never skip tests
- Never merge without review

---

## Common Scenarios

### Scenario 1: Adding a New Feature

```
1. Read the 5 immutable context files
2. Check if docs/05-features/FEATURE.md exists
3. If not, create it with specification
4. Implement following standards
5. Write tests
6. Update feature documentation
7. Summarize changes
```

### Scenario 2: Making an Architectural Change

```
1. Read the 5 immutable context files
2. Create docs/06-ADRs/ADR-XXX-decision.md
3. Explain context, decision, alternatives, trade-offs
4. Get approval
5. Update immutable context if approved
6. Implement changes
7. Update docs/02-engineering/
```

### Scenario 3: Implementing Database Changes

```
1. Read context-for-ai/03-engineering-context.md (Database section)
2. Create ADR documenting change
3. Create database migration
4. Update docs/02-engineering/database.md
5. Implement changes
6. Test migration (forward and rollback)
7. Update feature documentation
```

### Scenario 4: Fixing a Bug

```
1. Read immutable context relevant to bug
2. Check existing documentation
3. Implement fix
4. Write regression test
5. Update documentation if needed
6. Summarize what was wrong and how it was fixed
```

### Scenario 5: Refactoring Code

```
1. Read 04-ai-engineering-handbook.md (Refactoring section)
2. Ensure tests exist for current behavior
3. Refactor incrementally
4. Verify tests pass
5. Update documentation if architecture changed
6. Summarize refactoring rationale
```

---

## When to Ask Questions

Ask for clarification when:

- ❓ Immutable context doesn't address situation
- ❓ Conflicting guidance exists
- ❓ Major decision needed without clear guidance
- ❓ Uncertain about trade-offs
- ❓ Need approval for architectural change

**Don't:**
- ❌ Ignore the context and do what feels right
- ❌ Contradict established principles without discussion
- ❌ Make major decisions silently
- ❌ Skip steps in the workflow

---

## Documentation Locations

```
context-for-ai/
  ├── 01-project-context.md
  ├── 02-product-context.md
  ├── 03-engineering-context.md
  ├── 04-ai-engineering-handbook.md
  └── 05-operations-quality.md

docs/
  ├── 00-Foundation/
  │   ├── glossary.md
  │   ├── problem-statement.md
  │   ├── success-metrics.md
  │   ├── target-users.md
  │   └── vision.md
  │
  ├── 01-product/
  │   ├── feature-roadmap.md
  │   ├── mvp-definition.md
  │   ├── prd.md
  │   ├── user-flows.md
  │   └── user-stories.md
  │
  ├── 02-engineering/
  │   ├── api-design.md
  │   ├── architecture.md
  │   ├── database.md
  │   ├── deployment.md
  │   ├── realtime.md
  │   └── tech-stack.md
  │
  ├── 03-ai/
  │   ├── agent-design.md
  │   ├── evaluation.md
  │   ├── guardrails.md
  │   ├── memory.md
  │   ├── overview.md
  │   └── prompts.md
  │
  ├── 04-development/
  │   ├── ai-agent-rules.md
  │   ├── coding-standards.md
  │   ├── folder-structure.md
  │   ├── git-workflow.md
  │   ├── performance.md
  │   ├── project-rules.md
  │   ├── security.md
  │   └── testing.md
  │
  ├── 05-features/
  │   ├── ai-scope-analysis.md
  │   ├── authentication.md
  │   ├── invoices.md
  │   ├── notifications.md
  │   ├── payments.md
  │   └── projects.md
  │
  ├── 06-ADRs/
  │   ├── ADR-001-tech-stack.md
  │   ├── ADR-002-fastapi.md
  │   ├── ADR-003-neon.md
  │   └── ADR-004-socketio.md
  │
  └── 07-quality/
      ├── code-review-checklist.md
      ├── performance-checklist.md
      ├── production-readiness.md
      └── release-checklist.md
```

---

## Quick Reference

**Before you code:**
1. Read rule.md (this file)
2. Read 5 immutable context files
3. Check docs for existing documentation
4. Generate missing documentation
5. Design the solution
6. Implement

**While you code:**
- Follow standards from 04-ai-engineering-handbook.md
- Keep tests updated
- Run quality checks
- Update documentation

**After you code:**
- Ensure all quality gates pass
- Update all affected documentation
- Summarize what was done and why

---

**Version:** 1.0  
**Last Updated:** August 2, 2026  
**Audience:** All AI Agents & Engineers

**Read this first. Always.**