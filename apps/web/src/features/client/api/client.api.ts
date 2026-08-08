import { apiDelete, apiGet, apiPatch, apiPost } from '@api/client';
import type {
  ClientResponse,
  CreateClientInput,
  ListClientsFilters,
  UpdateClientInput,
} from './client.types';

export async function getClients(
  workspaceId: string,
  filters?: ListClientsFilters
): Promise<ClientResponse[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.excludeDeleted !== undefined)
    params.append('excludeDeleted', String(filters.excludeDeleted));
  if (filters?.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = `/workspaces/${workspaceId}/clients${queryString ? `?${queryString}` : ''}`;
  return apiGet<ClientResponse[]>(url);
}

export async function getClient(
  workspaceId: string,
  clientId: string
): Promise<ClientResponse> {
  return apiGet<ClientResponse>(`/workspaces/${workspaceId}/clients/${clientId}`);
}

export async function createClient(
  workspaceId: string,
  data: CreateClientInput
): Promise<ClientResponse> {
  return apiPost<ClientResponse>(`/workspaces/${workspaceId}/clients`, data);
}

export async function updateClient(
  workspaceId: string,
  clientId: string,
  data: UpdateClientInput
): Promise<ClientResponse> {
  return apiPatch<ClientResponse>(`/workspaces/${workspaceId}/clients/${clientId}`, data);
}

export async function deleteClient(
  workspaceId: string,
  clientId: string
): Promise<ClientResponse> {
  return apiDelete<ClientResponse>(`/workspaces/${workspaceId}/clients/${clientId}`);
}

export async function restoreClient(
  workspaceId: string,
  clientId: string
): Promise<ClientResponse> {
  return apiPost<ClientResponse>(`/workspaces/${workspaceId}/clients/${clientId}/restore`, {});
}
