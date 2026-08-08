export type ClientStatus = 'active' | 'inactive' | 'archived';

export interface ClientResponse {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  companyName: string | null;
  gstNumber: string | null;
  contactPerson: string | null;
  department: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

export interface CreateClientInput {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  companyName?: string;
  gstNumber?: string;
  contactPerson?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  companyName?: string;
  gstNumber?: string;
  contactPerson?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  status?: ClientStatus;
}

export interface ListClientsFilters {
  status?: ClientStatus | 'all';
  excludeDeleted?: boolean;
  search?: string;
}
