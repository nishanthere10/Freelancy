'use client';

import { Card, Button } from '@shared/components';
import { Buildings, EnvelopeSimple, Phone, PencilSimple, Archive, ArrowClockwise } from '@phosphor-icons/react';
import type { ClientResponse } from '../api';
import { useDeleteClient, useRestoreClient } from '../hooks';

interface ClientCardProps {
  workspaceId: string;
  client: ClientResponse;
  onSelect?: (client: ClientResponse) => void;
  onEdit?: (client: ClientResponse) => void;
}

export function ClientCard({ workspaceId, client, onSelect, onEdit }: ClientCardProps) {
  const { mutate: deleteClient, isPending: isDeleting } = useDeleteClient(workspaceId);
  const { mutate: restoreClient, isPending: isRestoring } = useRestoreClient(workspaceId);

  const isArchived = client.status === 'archived' || Boolean(client.deletedAt);

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Archive client "${client.name}"?`)) {
      deleteClient(client.id);
    }
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    restoreClient(client.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(client);
  };

  return (
    <Card
      className="p-5 hover:shadow-md transition-shadow cursor-pointer relative flex flex-col justify-between"
      onClick={() => onSelect?.(client)}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[var(--color-brand-yellow)] text-black flex items-center justify-center font-bold text-sm">
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-ink-deep)] text-base leading-tight">
                {client.name}
              </h3>
              {client.companyName && (
                <p className="text-xs text-[var(--color-slate-text)] flex items-center gap-1">
                  <Buildings className="h-3 w-3" /> {client.companyName}
                </p>
              )}
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isArchived
                ? 'bg-gray-100 text-gray-600'
                : client.status === 'active'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {client.status}
          </span>
        </div>

        <div className="space-y-1 my-3 text-xs text-[var(--color-slate-text)]">
          <div className="flex items-center gap-1.5">
            <EnvelopeSimple className="h-3.5 w-3.5" />
            <span>{client.email}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.gstNumber && (
            <div className="text-[10px] font-mono text-gray-500 mt-1">
              GST: {client.gstNumber}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-hairline)]">
        {!isArchived ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              className="h-8 px-2 text-xs"
            >
              <PencilSimple className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleArchive}
              disabled={isDeleting}
              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Archive className="h-3.5 w-3.5 mr-1" /> Archive
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRestore}
            disabled={isRestoring}
            className="h-8 px-2 text-xs"
          >
            <ArrowClockwise className="h-3.5 w-3.5 mr-1" /> Restore
          </Button>
        )}
      </div>
    </Card>
  );
}
