import { apiDelete, apiGet, apiPatch, apiPost } from '@api/client';
import type {
  CreateProjectInput,
  ListProjectsFilters,
  ProjectResponse,
  ProjectStatus,
  UpdateProjectInput,
} from './project.types';

export async function getProjects(
  workspaceId: string,
  filters?: ListProjectsFilters
): Promise<ProjectResponse[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.clientId) params.append('clientId', filters.clientId);
  if (filters?.excludeDeleted !== undefined)
    params.append('excludeDeleted', String(filters.excludeDeleted));
  if (filters?.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = `/workspaces/${workspaceId}/projects${queryString ? `?${queryString}` : ''}`;
  return apiGet<ProjectResponse[]>(url);
}

export async function getProject(
  workspaceId: string,
  projectId: string
): Promise<ProjectResponse> {
  return apiGet<ProjectResponse>(`/workspaces/${workspaceId}/projects/${projectId}`);
}

export async function createProject(
  workspaceId: string,
  data: CreateProjectInput
): Promise<ProjectResponse> {
  return apiPost<ProjectResponse>(`/workspaces/${workspaceId}/projects`, data);
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  data: UpdateProjectInput
): Promise<ProjectResponse> {
  return apiPatch<ProjectResponse>(`/workspaces/${workspaceId}/projects/${projectId}`, data);
}

export async function updateProjectStatus(
  workspaceId: string,
  projectId: string,
  status: ProjectStatus
): Promise<ProjectResponse> {
  return apiPatch<ProjectResponse>(`/workspaces/${workspaceId}/projects/${projectId}/status`, { status });
}

export async function deleteProject(
  workspaceId: string,
  projectId: string
): Promise<ProjectResponse> {
  return apiDelete<ProjectResponse>(`/workspaces/${workspaceId}/projects/${projectId}`);
}

export async function restoreProject(
  workspaceId: string,
  projectId: string
): Promise<ProjectResponse> {
  return apiPost<ProjectResponse>(`/workspaces/${workspaceId}/projects/${projectId}/restore`, {});
}
