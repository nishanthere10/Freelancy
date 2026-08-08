/**
 * Workspace API functions
 * All workspace API calls centralized here
 */

import { apiDelete, apiGet, apiPatch, apiPost } from '@api/client';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceResponse } from './workspace.types';

/**
 * Get all workspaces for current user
 */
export async function getWorkspaces(): Promise<WorkspaceResponse[]> {
  return apiGet<WorkspaceResponse[]>('/workspaces');
}

/**
 * Get single workspace by ID
 */
export async function getWorkspace(id: string): Promise<WorkspaceResponse> {
  return apiGet<WorkspaceResponse>(`/workspaces/${id}`);
}

/**
 * Create new workspace
 */
export async function createWorkspace(data: CreateWorkspaceInput): Promise<WorkspaceResponse> {
  return apiPost<WorkspaceResponse>('/workspaces', data);
}

/**
 * Update workspace
 */
export async function updateWorkspace(
  id: string,
  data: UpdateWorkspaceInput
): Promise<WorkspaceResponse> {
  return apiPatch<WorkspaceResponse>(`/workspaces/${id}`, data);
}

/**
 * Delete workspace (soft delete)
 */
export async function deleteWorkspace(id: string): Promise<WorkspaceResponse> {
  return apiDelete<WorkspaceResponse>(`/workspaces/${id}`);
}

/**
 * Restore workspace (from soft delete)
 */
async function restoreWorkspace(id: string): Promise<WorkspaceResponse> {
  return apiPost<WorkspaceResponse>(`/workspaces/${id}/restore`, {});
}
