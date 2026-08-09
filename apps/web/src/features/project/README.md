# Project Management Feature Layer

Frontend architecture for the Project vertical slice in Freelance-OS.

## Structure

```text
project/
├── api/
│   ├── project.types.ts    # TypeScript interfaces (ProjectResponse, etc.)
│   ├── project.keys.ts     # Query key factory
│   ├── project.api.ts      # Typed fetcher functions calling /api/v1/workspaces/:workspaceId/projects
│   └── index.ts
├── hooks/                  # TanStack Query hooks (useProjects, useProject, etc.)
├── schemas/                # React Hook Form + Zod schemas (projectFormSchema)
├── components/             # Feature UI components (Sprint 3.5)
└── index.ts
```
