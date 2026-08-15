'use client';

import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/components';
import { Plus, MagnifyingGlass, Users } from '@phosphor-icons/react';
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
      <div className="p-6 bg-[var(--color-canvas,#f8fafc)] min-h-screen">
        <ClientDetail
          workspaceId={workspaceId}
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
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 bg-[var(--color-canvas,#f8fafc)] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-semibold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-ink-deep,#0f172a)] tracking-tight">
              Clients
            </h1>
            <p className="text-xs text-[var(--color-slate-text,#64748b)]">
              Manage client directory, contact information, and project engagements.
            </p>
          </div>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="shadow-xs">
          <Plus className="h-4 w-4 mr-1.5" /> Add Client
        </Button>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by client name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-sm rounded-xl border-gray-200 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['active', 'inactive', 'archived', 'all'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Content Body */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-700 bg-red-50/80 rounded-2xl border border-red-200 max-w-lg mx-auto">
          <p className="text-sm font-semibold">Failed to load clients</p>
          <p className="text-xs text-red-600 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
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
