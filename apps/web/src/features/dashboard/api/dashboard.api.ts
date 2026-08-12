import { apiGet } from '@api/client';
import type { DashboardResponse } from './dashboard.types';

export async function getDashboard(workspaceId: string): Promise<DashboardResponse> {
  return apiGet<DashboardResponse>(`/workspaces/${workspaceId}/dashboard`);
}
