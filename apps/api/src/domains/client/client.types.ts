import type { Client, ClientStatus } from "@repo/database";

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
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
}

export interface CreateClientServiceInput {
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

export interface UpdateClientServiceInput {
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

export interface CreateClientRepositoryInput extends CreateClientServiceInput {
  workspaceId: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateClientRepositoryInput extends UpdateClientServiceInput {
  updatedBy: string;
}

export interface ClientQueryFilters {
  workspaceId: string;
  status?: ClientStatus | "all";
  excludeDeleted?: boolean;
  search?: string;
}
