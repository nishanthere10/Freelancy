'use client';

import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/components';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useClients } from '../hooks';
import type { ClientResponse, ClientStatus } from '../api';
import { ClientList } from './ClientList';
import { ClientDetail } from './ClientDetail';
import { ClientEmptyState } from './ClientEmptyState';
import { CreateClientDialog } from './CreateClientDialog';
import { EditClientDialog } from './EditClientDialog';

interface ClientPageProps {
  workspaceId: string;
}

export function ClientPage({ workspaceId }: ClientPageProps) {
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientResponse | null>(null);

  const { data: clients, isLoading, error } = useClients(workspaceId, {
    status: statusFilter,
    search,
  });

  if (selectedClient) {
    return (
      <div className="p-6">
        <ClientDetail
          client={selectedClient}
          onBack={() => setSelectedClient(null)}
          onEdit={(c) => setEditingClient(c)}
        />
        <EditClientDialog
          workspaceId={workspaceId}
          client={editingClient}
          open={Boolean(editingClient)}
          onOpenChange={(open) => !open && setEditingClient(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink-deep)]">Clients</h1>
          <p className="text-sm text-[var(--color-slate-text)]">
            Manage client records, contact details, and billing settings.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Client
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[var(--color-hairline)] shadow-sm">
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(['active', 'inactive', 'archived', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-[var(--color-brand-yellow)] text-black font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl">
          Failed to load clients: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : !clients || clients.length === 0 ? (
        <ClientEmptyState onCreateClick={() => setCreateDialogOpen(true)} />
      ) : (
        <ClientList
          workspaceId={workspaceId}
          clients={clients}
          onSelectClient={(c) => setSelectedClient(c)}
          onEditClient={(c) => setEditingClient(c)}
        />
      )}

      <CreateClientDialog
        workspaceId={workspaceId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditClientDialog
        workspaceId={workspaceId}
        client={editingClient}
        open={Boolean(editingClient)}
        onOpenChange={(open) => !open && setEditingClient(null)}
      />
    </div>
  );
}
