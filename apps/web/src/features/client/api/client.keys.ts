export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...clientKeys.lists(), workspaceId, filters] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (workspaceId: string, clientId: string) =>
    [...clientKeys.details(), workspaceId, clientId] as const,
} as const;
