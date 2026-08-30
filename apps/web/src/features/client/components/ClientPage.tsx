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
      <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
        <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24">
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
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
      <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-[var(--radius-xl)] bg-[var(--color-teal-light)] text-[var(--color-brand-teal)] flex items-center justify-center font-semibold">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep)] tracking-tight">
                Clients
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-slate-text)] mt-0.5">
                Manage client accounts, contact details, and linked projects.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-full shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Client
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="filter-bar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-steel)]" />
            <Input
              type="text"
              placeholder="Search clients by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-xs bg-white rounded-full border-[var(--color-hairline-strong)]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'active', 'archived'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`pill-tab capitalize ${
                  statusFilter === st ? 'pill-tab-active' : ''
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
          <div className="p-8 text-center text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-[var(--radius-xl)] border border-[var(--color-error-border)] max-w-lg mx-auto">
            <p className="text-sm font-semibold">Failed to load clients</p>
            <p className="text-xs text-[var(--color-error)] opacity-90 mt-1">
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
    </div>
  );
}
