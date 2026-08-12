export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (workspaceId: string) => [...dashboardKeys.all, workspaceId] as const,
};
