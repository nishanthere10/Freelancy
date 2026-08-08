# Client Management Feature (`apps/web/src/features/client`)

Client feature slice for Freelance OS.

## Architecture

This feature adheres strictly to the vertical slice pattern established by the Workspace feature:

- `api/`: Centralized API calls (`client.api.ts`), query keys (`client.keys.ts`), and DTO types (`client.types.ts`).
- `hooks/`: TanStack Query wrapper hooks for query and mutation state (`useClients`, `useClient`, `useCreateClient`, etc.).
- `schemas/`: Zod validation schemas for React Hook Form integration (`client.schema.ts`).
- `components/`: UI components (`ClientPage`, `ClientList`, `ClientCard`, `ClientDetail`, `CreateClientDialog`, `EditClientDialog`, `ClientEmptyState`).

## Usage

```tsx
import { ClientPage } from '@/features/client';

export default function WorkspaceClientsPage({ params }: { params: { workspaceId: string } }) {
  return <ClientPage workspaceId={params.workspaceId} />;
}
```
