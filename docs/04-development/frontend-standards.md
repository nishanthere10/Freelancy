# Frontend Standards

**Document Version:** 1.0
**Status:** Immutable (Requires ADR for Changes)
**Owner:** Frontend Engineering
**Last Updated:** August 2026

---

# 1. Purpose

This document defines the engineering standards, architectural patterns, coding conventions, and implementation rules for the frontend codebase.

Unlike `design-language.md` and `design-system.md`, which define how the product should look and behave, this document defines **how frontend code should be written**.

It is the engineering handbook for every frontend developer and AI coding agent.

---

# 2. Engineering Philosophy

Every line of frontend code should optimize for:

* Readability
* Maintainability
* Reusability
* Predictability
* Performance
* Accessibility
* Scalability

Optimize for long-term maintainability, not short-term implementation speed.

---

# 3. Architecture

The frontend follows a **Feature-First Architecture**.

```
src/

app/
features/
shared/
providers/
api/
styles/
config/
types/
```

Each feature owns its:

* API
* Components
* Hooks
* Schemas
* Types
* Utilities
* Tests

Avoid organizing by file type globally.

---

# 4. Feature Structure

Every feature follows the same structure.

```
features/

workspace/

api/

components/

hooks/

schemas/

types/

utils/

README.md

index.ts
```

Future features must follow the exact same convention.

---

# 5. Component Architecture

Components are divided into three layers.

```
Pages

↓

Feature Components

↓

Shared Components

↓

packages/ui

↓

shadcn/ui
```

Feature components should never replace shared components.

Always compose existing primitives.

---

# 6. Component Rules

A component should:

* Have one responsibility
* Be reusable when appropriate
* Remain small
* Avoid business logic
* Receive data through props
* Avoid unnecessary state

A component should never:

* Fetch data directly
* Contain API logic
* Know backend implementation details
* Mutate global state

---

# 7. Server State

All server state must use **TanStack Query**.

Never use:

```
useEffect

↓

fetch()

↓

setState()
```

Instead:

```
useQuery()

↓

useMutation()
```

All queries must live inside feature hooks.

Example:

```
hooks/

useWorkspace()

useWorkspaces()

useCreateWorkspace()
```

---

# 8. Query Standards

Every feature owns its own query keys.

Example:

```typescript
export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (id: string) => ['workspaces', id] as const,
};
```

Never hardcode query keys.

Always invalidate using centralized keys.

---

# 9. API Standards

Every feature owns its API layer.

```
workspace/

api/

workspace.api.ts

workspace.keys.ts

workspace.types.ts

index.ts
```

The shared API layer contains only:

* Axios instance
* Interceptors
* Error normalization
* Generic helpers

Never mix API logic with UI components.

---

# 10. Forms

Every form must use:

* React Hook Form
* Zod
* Shared Form components

Validation belongs inside schemas.

Never validate manually.

Never duplicate validation rules already defined by the backend.

Whenever possible, share validation logic between frontend and backend.

---

# 11. State Management

Use the smallest possible state scope.

| State Type      | Solution                            |
| --------------- | ----------------------------------- |
| Local UI State  | React State                         |
| Form State      | React Hook Form                     |
| Server State    | TanStack Query                      |
| URL State       | Next.js Router                      |
| Global UI State | React Context (only when necessary) |

Avoid unnecessary Context Providers.

Avoid large global stores until there is a proven need.

---

# 12. Rendering Strategy

Prefer **Server Components** whenever interactivity is not required.

Use **Client Components** only when necessary.

Examples requiring Client Components:

* Forms
* Dialogs
* Local state
* Event handlers
* Browser APIs
* TanStack Query

Default to Server Components.

---

# 13. Performance Guidelines

Always optimize for:

* Minimal JavaScript
* Lazy loading
* Code splitting
* Memoization only when necessary
* Stable component trees

Avoid premature optimization.

Measure before optimizing.

---

# 14. Data Fetching Rules

Never fetch data directly inside components.

Wrong:

```tsx
useEffect(() => {
  fetch(...)
})
```

Correct:

```
Component

↓

Feature Hook

↓

API Layer

↓

Axios Client
```

This keeps concerns separated.

---

# 15. Error Handling

Every async feature must support:

* Loading
* Empty
* Error
* Success

Unexpected errors should fall back to the global Error Boundary.

Never expose backend error messages directly.

Always normalize API errors.

---

# 16. Loading Strategy

Prefer:

* Skeletons
* Progressive rendering
* Disabled controls

Avoid full-page spinners unless absolutely necessary.

Loading indicators should preserve layout stability.

---

# 17. Accessibility Standards

Every feature must support:

* Keyboard navigation
* Focus management
* Screen readers
* Semantic HTML
* Proper labels
* WCAG AA contrast

Accessibility is part of the definition of done.

---

# 18. File Naming

Components

```
WorkspaceCard.tsx
```

Hooks

```
useWorkspace.ts
```

API

```
workspace.api.ts
```

Schemas

```
createWorkspace.schema.ts
```

Types

```
workspace.types.ts
```

Avoid abbreviations.

Use explicit names.

---

# 19. Imports

Prefer feature-local imports.

Use path aliases.

Avoid long relative paths.

Good:

```typescript
import { Button } from "@shared/components";
```

Avoid:

```typescript
../../../components/Button
```

---

# 20. Testing Standards

Every feature should include:

* Unit tests
* Integration tests
* Playwright E2E tests (where applicable)

Shared components should have:

* Render tests
* Interaction tests
* Accessibility checks

---

# 21. Definition of Done

A frontend feature is complete only when:

* UI implemented
* API integrated
* Loading state handled
* Empty state handled
* Error state handled
* Success state handled
* TypeScript passes
* Biome passes
* Tests pass
* Responsive
* Accessible

---

# 22. Code Review Checklist

Before merging, verify:

* Single Responsibility Principle followed
* No duplicated logic
* No unnecessary state
* Shared components reused
* Feature boundaries respected
* API layer isolated
* Hooks reusable
* No hardcoded values
* No `any`
* No `@ts-ignore`
* No dead code

---

# 23. AI Implementation Workflow

Every AI coding agent must follow this workflow.

```
Read Feature Spec

↓

Read Design Language

↓

Read Design System

↓

Read Frontend Standards

↓

Review Existing Feature

↓

Plan Implementation

↓

Implement Incrementally

↓

Run TypeScript

↓

Run Biome

↓

Run Tests

↓

Summarize Changes

↓

Wait For Review
```

Never skip the planning stage.

Never generate code without understanding the existing architecture.

---

# 24. AI Rules

Always:

* Reuse components
* Reuse hooks
* Reuse API clients
* Reuse schemas
* Reuse utilities
* Follow folder conventions
* Respect feature boundaries

Never:

* Create duplicate components
* Create duplicate hooks
* Create duplicate utilities
* Invent new design patterns
* Modify shared components unnecessarily
* Add business logic to shared code
* Bypass TanStack Query
* Bypass React Hook Form
* Bypass Zod

Consistency is more valuable than creativity.

---

# 25. Future Evolution

The frontend architecture is expected to evolve.

Future additions may include:

* Offline support
* Optimistic updates
* Feature flags
* Internationalization (i18n)
* Command palette
* Theme customization
* Real-time collaboration
* AI-assisted UI

These capabilities should extend the existing architecture rather than replacing it.

Any architectural changes should be documented through an ADR before implementation.
