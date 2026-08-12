'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard.api';
import { dashboardKeys } from '../api/dashboard.keys';

export function useDashboard(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.detail(workspaceId),
    queryFn: () => getDashboard(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}
