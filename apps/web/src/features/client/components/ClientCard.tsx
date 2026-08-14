'use client';

import { Card, Button } from '@shared/components';
import {
  Buildings,
  EnvelopeSimple,
  Phone,
  PencilSimple,
  Archive,
  ArrowClockwise,
  User,
} from '@phosphor-icons/react';
import type { ClientResponse } from '../api';
import { useDeleteClient, useRestoreClient } from '../hooks';

interface ClientCardProps {
  workspaceId: string;
  client: ClientResponse;
  onSelect?: (client: ClientResponse) => void;
  onEdit?: (client: ClientResponse) => void;
}

export function ClientCard({
  workspaceId,
  client,
  onSelect,
  onEdit,
}: ClientCardProps) {
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
      className="p-6 rounded-[var(--radius-xl)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 cursor-pointer relative flex flex-col justify-between border border-[var(--color-hairline-soft)] border-t-4 border-t-[var(--color-brand-teal)] bg-white group hover:-translate-y-1"
      onClick={() => onSelect?.(client)}
    >
      <div className="space-y-4">
        {/* Header with avatar & status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-[var(--radius-lg)] bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/20 flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-[var(--color-ink-deep)] text-base leading-snug group-hover:text-[var(--color-brand-teal)] transition-colors">
                {client.name}
              </h3>
              {client.companyName ? (
                <p className="text-xs font-medium text-[var(--color-slate-text,#64748b)] flex items-center gap-1.5 mt-0.5">
                  <Buildings className="h-3.5 w-3.5 text-amber-500" />
                  <span>{client.companyName}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span>Individual Client</span>
                </p>
              )}
            </div>
          </div>

          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
              isArchived
                ? 'bg-gray-100 text-gray-600 border-gray-200'
                : client.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {client.status}
          </span>
        </div>

        {/* Contact Snippets */}
        <div className="space-y-2 text-xs text-[var(--color-slate-text,#64748b)] pt-1">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-gray-50 text-gray-400">
              <EnvelopeSimple className="h-3.5 w-3.5" />
            </div>
            <span className="truncate font-medium text-gray-700">{client.email}</span>
          </div>

          {client.phone && (
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-gray-50 text-gray-400">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-gray-700">{client.phone}</span>
            </div>
          )}

          {client.gstNumber && (
            <div className="text-[10px] font-mono text-gray-400 pt-1">
              GST: <span className="text-gray-600 font-semibold">{client.gstNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-100">
        <span className="text-[11px] font-medium text-amber-600 hover:underline">
          View details &rarr;
        </span>

        <div className="flex items-center gap-1.5">
          {!isArchived ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEdit}
                className="h-7 px-2.5 text-xs rounded-xl"
              >
                <PencilSimple className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleArchive}
                disabled={isDeleting}
                className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
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
              className="h-7 px-2.5 text-xs rounded-xl"
            >
              <ArrowClockwise className="h-3.5 w-3.5 mr-1" /> Restore
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
