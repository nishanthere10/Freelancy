import type { Client } from "@repo/database";
import type { ClientResponse } from "./client.types";

export function mapClientToResponse(client: Client): ClientResponse {
  return {
    id: client.id,
    workspaceId: client.workspaceId,
    name: client.name,
    email: client.email,
    phone: client.phone,
    website: client.website,
    companyName: client.companyName,
    gstNumber: client.gstNumber,
    contactPerson: client.contactPerson,
    department: client.department,
    address: client.address,
    city: client.city,
    state: client.state,
    postalCode: client.postalCode,
    country: client.country,
    status: client.status,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    createdBy: client.createdBy,
    updatedBy: client.updatedBy,
    deletedAt: client.deletedAt,
  };
}

export function mapClientsToResponse(clients: Client[]): ClientResponse[] {
  return clients.map(mapClientToResponse);
}
