# Design System

**Document Version:** 1.0
**Status:** Immutable (Requires ADR for Changes)
**Owner:** Frontend Engineering & Product Design

---

# 1. Purpose

This document defines the implementation rules for the product's user interface.

While `design-language.md` defines the visual identity and philosophy, this document defines **how that philosophy is translated into code**.

It serves as the single source of truth for:

* Frontend Engineers
* Product Designers
* UX Designers
* AI Coding Agents
* Contributors

Every UI implementation must follow this document.

---

# 2. Technology Stack

The frontend design system is built on the following technologies.

## Framework

* Next.js (App Router)

---

## Styling

* Tailwind CSS v4

---

## Component Foundation

* shadcn/ui

---

## Icons

* Lucide React

---

## Animations

* Framer Motion

---

## Forms

* React Hook Form
* Zod

---

## Data Fetching

* TanStack Query

---

## Tables

* TanStack Table

---

## Charts

* Recharts

---

## Notifications

* Sonner

---

## Theme

* next-themes

---

## Utilities

* clsx
* tailwind-merge
* cn()

---

# 3. Design System Architecture

The component hierarchy must always follow this structure.

```text
Feature UI

↓

Shared Components

↓

packages/ui

↓

shadcn/ui

↓

Tailwind CSS

↓

Design Tokens
```

Business components must never directly modify shadcn primitives.

---

# 4. Component Philosophy

Components should be:

* Reusable
* Composable
* Predictable
* Accessible
* Stateless whenever possible

Prefer composition over inheritance.

Avoid feature-specific customization inside shared components.

---

# 5. shadcn/ui Rules

shadcn/ui is the foundation of the design system.

It is **not** the application.

## Rules

Never modify generated shadcn components unless absolutely necessary.

Never place business logic inside shadcn primitives.

Never duplicate shadcn components.

If additional behavior is required:

1. Compose the component.
2. Wrap it if necessary.
3. Only modify the primitive as a last resort.

---

# 6. Shared Component Layer

All reusable components belong inside the shared UI package.

Examples:

* Button
* Card
* Input
* Textarea
* Dialog
* Drawer
* Popover
* Tooltip
* Badge
* Alert
* Skeleton
* Spinner
* Table
* Tabs
* Accordion
* Command
* Calendar
* DropdownMenu
* Form
* FormField

These components must remain domain-agnostic.

---

# 7. Feature Components

Feature-specific components belong inside:

```text
features/<feature>/components
```

Examples:

* WorkspaceCard
* WorkspaceGrid
* CreateWorkspaceDialog
* ProjectTimeline
* ClientAvatar

Feature components should be built using shared components.

---

# 8. Component Creation Rules

Before creating a new component:

1. Check the current feature.
2. Check shared components.
3. Check packages/ui.
4. Check shadcn/ui.
5. Only create a new shared component if no suitable component exists.

Never duplicate functionality.

---

# 9. Styling Rules

Always use:

* Tailwind utilities
* Design tokens
* CSS variables
* `cn()` utility

Never use:

* Inline styles
* CSS Modules
* styled-components
* Emotion
* Hardcoded colors
* Hardcoded spacing
* Hardcoded typography

---

# 10. Forms

All forms must use:

* React Hook Form
* Zod
* Shared Form components

Validation must never be implemented manually.

Every field must display:

* Label
* Description (if applicable)
* Validation error

---

# 11. Data Fetching

All server state must use TanStack Query.

Feature-specific hooks should wrap TanStack Query.

Examples:

* `useWorkspaces()`
* `useWorkspace()`
* `useCreateWorkspace()`

Components should never call the API directly.

---

# 12. API Layer

Every feature owns its API module.

Structure:

```text
features/
└── workspace/
    └── api/
        ├── workspace.api.ts
        ├── workspace.keys.ts
        ├── workspace.types.ts
        └── index.ts
```

The shared API layer contains only:

* Axios/fetch client
* Interceptors
* Error normalization
* Generic helpers

---

# 13. Query Keys

Each feature defines its own query keys.

Example:

```ts
export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (id: string) => ['workspaces', id] as const,
};
```

Never hardcode query keys inside components.

---

# 14. State Management

Guidelines:

* Local UI state → React state
* Server state → TanStack Query
* Form state → React Hook Form
* URL state → Next.js routing
* Global UI state → Context (only when truly global)

Avoid unnecessary global state.

---

# 15. Error Handling

Every feature should provide:

* Loading state
* Empty state
* Error state
* Retry action

Unexpected errors should be handled by the global Error Boundary.

---

# 16. Accessibility Standards

Every component must support:

* Keyboard navigation
* Screen readers
* Visible focus states
* Proper semantic HTML
* ARIA attributes where necessary

Accessibility is mandatory.

---

# 17. Motion Guidelines

Use Framer Motion.

Animations should:

* Communicate state
* Feel responsive
* Never distract

Recommended duration:

150–250ms

Avoid decorative animations.

---

# 18. File & Folder Conventions

Every feature follows the same structure:

```text
features/
└── workspace/
    ├── api/
    ├── components/
    ├── hooks/
    ├── schemas/
    ├── types/
    ├── utils/
    ├── README.md
    └── index.ts
```

Every feature should expose a clean public API through `index.ts`.

---

# 19. Naming Conventions

Components:

* PascalCase

Hooks:

* `useXxx`

Files:

* kebab-case or descriptive names following project conventions

Avoid abbreviations.

Prefer explicit names.

---

# 20. Testing Standards

Every shared component should include:

* Rendering test
* Accessibility checks where appropriate
* Interaction tests
* Edge case coverage

Business features should include:

* Unit tests
* Integration tests
* Playwright end-to-end tests

---

# 21. AI Implementation Rules

AI coding agents must follow these rules.

## Always

* Reuse existing components.
* Follow the shared design system.
* Use design tokens.
* Use shared hooks.
* Keep components focused.
* Prefer composition.
* Keep business logic outside shared components.

## Never

* Invent colors.
* Invent spacing.
* Duplicate components.
* Modify shadcn primitives unnecessarily.
* Add feature logic to shared UI.
* Bypass TanStack Query.
* Bypass React Hook Form.
* Bypass Zod validation.

---

# 22. Future Evolution

The design system is expected to grow over time.

Future additions may include:

* Data Grid
* Rich Text Editor
* File Upload
* Charts
* Kanban Board
* Command Palette
* AI Chat Components
* Timeline Components
* Calendar Views

These should extend the existing system rather than replacing it.

---

# 23. Definition of Success

The design system is successful when:

* Every feature feels visually consistent.
* Components are reusable.
* New screens can be built rapidly.
* AI agents generate predictable UI.
* Developers rarely need to reinvent components.
* The codebase remains maintainable as the product grows.

This document is considered part of the project's immutable engineering foundation. Any changes should be proposed through an ADR and reviewed before adoption.
