'use client';

import { ClientCard } from './ClientCard';
import type { ClientResponse } from '../api';

interface ClientListProps {
  workspaceId: string;
  clients: ClientResponse[];
  onSelectClient?: (client: ClientResponse) => void;
  onEditClient?: (client: ClientResponse) => void;
}

export function ClientList({
  workspaceId,
  clients,
  onSelectClient,
  onEditClient,
}: ClientListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          workspaceId={workspaceId}
          client={client}
          onSelect={onSelectClient}
          onEdit={onEditClient}
        />
      ))}
    </div>
  );
}
