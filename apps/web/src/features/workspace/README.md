# Workspace Feature

## Purpose

The Workspace feature is the foundational organizational layer of Freelance OS. It enables users to manage projects, clients, and invoices under a named workspace.

**Key Goals:**
- Organize user data under named workspaces
- Enable multi-tenancy for future team collaboration
- Provide a clean, focused interface for workspace management
- Maintain data isolation between workspaces

## Architecture

### Folder Structure

```
workspace/

api/
  ├── workspace.api.ts       # API functions (getWorkspaces, createWorkspace, etc.)
  ├── workspace.keys.ts      # TanStack Query key factory
  ├── workspace.types.ts     # TypeScript types
  └── index.ts               # Public exports

hooks/
  ├── useWorkspaces.ts       # Query hook: fetch all workspaces
  ├── useWorkspace.ts        # Query hook: fetch single workspace
  ├── useCreateWorkspace.ts  # Mutation hook: create workspace
  └── index.ts               # Public exports

schemas/
  ├── createWorkspace.schema.ts # Zod validation schema
  └── index.ts                  # Public exports

components/
  ├── WorkspacePage.tsx           # Main page component
  ├── WorkspaceHeader.tsx         # Page header with title + CTA
  ├── WorkspaceGrid.tsx           # Grid layout for workspace cards
  ├── WorkspaceCard.tsx           # Individual workspace display
  ├── WorkspaceEmptyState.tsx     # Empty state UI
  ├── CreateWorkspaceDialog.tsx   # Dialog wrapper
  ├── CreateWorkspaceForm.tsx     # Form component
  ├── WorkspaceToolbar.tsx        # Placeholder for future toolbar
  ├── __tests__/                  # Component tests
  └── index.ts                    # Public exports

README.md (this file)
index.ts (feature exports)
```

## Components

### WorkspacePage
Main entry point for the workspace feature. Fetches workspaces, manages dialog state, renders grid or empty state.

**Props:** None  
**State:** Dialog open/close state, workspaces data from hook

### WorkspaceHeader
Page header with title, description, and "Create Workspace" button.

**Props:** `onCreateClick: () => void`

### WorkspaceGrid
Responsive grid layout for workspace cards. Shows skeleton loaders while fetching.

**Props:** `workspaces: WorkspaceResponse[]`, `isLoading?: boolean`

### WorkspaceCard
Displays individual workspace info: name, description, slug (with copy button), creation date, owner badge.

**Props:** `workspace: WorkspaceResponse`

### WorkspaceEmptyState
Friendly empty state shown when user has no workspaces. Includes icon, message, and CTA.

**Props:** `onCreateClick: () => void`

### CreateWorkspaceDialog
Accessible modal dialog wrapping the create form. Handles mutation, shows loading state, closes on success.

**Props:** `open: boolean`, `onOpenChange: (open: boolean) => void`

### CreateWorkspaceForm
React Hook Form + Zod form component. Fields: name, slug, description. Handles validation and submission.

**Props:** `onSubmit: (data) => Promise<void>`, `isLoading?: boolean`, `onCancel?: () => void`

## Hooks

### useWorkspaces
Fetches all workspaces for current user.

```typescript
const { data, isLoading, error } = useWorkspaces();
```

**Features:**
- 5-minute cache time
- Automatic error handling
- Returns array of `WorkspaceResponse`

### useWorkspace
Fetches single workspace by ID.

```typescript
const { data, isLoading, error } = useWorkspace(id);
```

**Features:**
- Conditional: only runs if `id` is provided
- 5-minute cache time
- Returns single `WorkspaceResponse`

### useCreateWorkspace
Mutation hook for creating new workspace.

```typescript
const { mutate, isPending, error } = useCreateWorkspace();
mutate({ name, slug, description });
```

**Features:**
- Automatic list invalidation on success
- Success toast with workspace name
- Error toast on failure
- Sets new workspace in query cache

## API Layer

All API calls are centralized in `api/workspace.api.ts`.

### Functions

- `getWorkspaces()` - GET `/workspaces` - Fetch all workspaces
- `getWorkspace(id)` - GET `/workspaces/{id}` - Fetch single workspace
- `createWorkspace(data)` - POST `/workspaces` - Create workspace
- `updateWorkspace(id, data)` - PATCH `/workspaces/{id}` - Update workspace
- `deleteWorkspace(id)` - DELETE `/workspaces/{id}` - Soft delete
- `restoreWorkspace(id)` - POST `/workspaces/{id}/restore` - Restore deleted

### Query Keys

Centralized in `workspace.keys.ts` using TanStack Query factory pattern:

```typescript
workspaceKeys.all           // ['workspaces']
workspaceKeys.list()        // ['workspaces', 'list']
workspaceKeys.detail(id)    // ['workspaces', 'detail', id]
```

**Rule:** Never hardcode query keys in components.

## Validation

Form validation uses Zod schema in `schemas/createWorkspace.schema.ts`:

- **name:** 3-100 characters, required
- **slug:** 3-50 characters, lowercase + hyphens only, required
- **description:** 0-500 characters, optional

Backend validation is authoritative; frontend validation provides UX feedback only.

## Testing

### Unit Tests
- `components/__tests__/WorkspaceCard.test.tsx` - Component rendering, slug copy
- `hooks/__tests__/useWorkspaces.test.ts` - Query logic, caching
- `hooks/__tests__/useCreateWorkspace.test.ts` - Mutation, invalidation, error handling

### Integration Tests
- `components/__tests__/WorkspacePage.test.tsx` - Page states (loading, empty, error)

### E2E Tests
- `e2e/workspace.spec.ts` - Full user journey (Playwright)
  - Empty state display
  - Dialog open/close
  - Form submission
  - Validation
  - Keyboard navigation

Run tests:
```bash
npm run test              # Unit + integration tests
npm run test:e2e          # Playwright E2E tests
```

## Shared Components

The workspace feature uses these shared UI components from `@shared/components`:

- `Button` - Action buttons with variants (primary, secondary, ghost, danger)
- `Card` - Container for workspace display
- `Dialog` - Modal for create workspace form
- `FormField` - Form field with React Hook Form integration
- `Input` - Text input with validation
- `Skeleton` - Loading placeholder

## State Management

- **Server State:** TanStack Query (workspaces data)
- **Form State:** React Hook Form (create form)
- **UI State:** React `useState` (dialog open/close)
- **Query Keys:** Centralized factory pattern

**Rule:** Components never call `useQuery` or `useMutation` directly. Always use feature hooks.

## Future Extensions

### V2: Team Collaboration
- Multiple workspaces per user
- Workspace switcher in navigation
- Member invite + role-based access
- Member management UI

### V3: Advanced Features
- Workspace-level analytics
- Custom permissions
- Workspace templates
- Integrations (Slack, Zapier)

### V4: Agency Features
- Revenue sharing
- Financial reporting
- Sub-teams
- Client portal

## Implementation Notes

### Data Isolation
All queries include workspace ID to ensure data isolation. Pattern:

```typescript
const result = await getWorkspace(id, userId);
// Backend validates: workspace belongs to user
```

### Error Handling
- API errors normalized by client interceptor
- Form errors displayed inline
- Network errors shown in error boundary
- All mutations have success/error toasts

### Performance
- Query caching: 5 minutes
- Skeleton loaders for list
- Minimal client components
- Server component first approach

### Accessibility
- Semantic HTML (`<dialog>`, proper headings)
- ARIA labels for dialog
- Keyboard navigation (Tab, ESC)
- Focus management
- Screen reader support

## Debugging

### Check Query State
```typescript
// In component
const { data, isLoading, error } = useWorkspaces();
console.log('data:', data, 'loading:', isLoading, 'error:', error);
```

### Check API Calls
- Open DevTools Network tab
- Look for `/api/v1/workspaces` requests
- Verify request/response payloads

### Clear Query Cache
```typescript
// In console
queryClient.invalidateQueries({ queryKey: ['workspaces'] })
```

## Related Documentation

- `docs/01-product/design-language.md` - Design philosophy
- `docs/01-product/design-system.md` - Component standards
- `docs/04-development/frontend-standards.md` - Frontend patterns
- `docs/05-features/workspace.md` - Product requirements

---

**Last Updated:** August 2026  
**Maintainer:** Product Engineering Team
