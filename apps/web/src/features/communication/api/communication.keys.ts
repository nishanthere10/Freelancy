export const communicationKeys = {
  all: ["communications"] as const,
  lists: () => [...communicationKeys.all, "list"] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...communicationKeys.lists(), workspaceId, { filters }] as const,
};
