'use client';

import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/components';
import {
  Plus,
  MagnifyingGlass,
  Receipt,
  CheckCircle,
  Clock,
  CurrencyInr,
} from '@phosphor-icons/react';
import { useInvoices } from '../hooks';
import type { InvoiceResponse, InvoiceStatus } from '../api';
import { InvoiceList } from './InvoiceList';
import { InvoiceDetailView } from './InvoiceDetailView';
import { InvoiceEmptyState } from './InvoiceEmptyState';
import { CreateInvoiceDialog } from './CreateInvoiceDialog';

interface InvoicePageProps {
  workspaceId: string;
}

export function InvoicePage({ workspaceId }: InvoicePageProps) {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: invoices, isLoading, error } = useInvoices(workspaceId, {
    status: statusFilter,
    search,
  });

  // Calculate overview metrics from invoices list
  const totalBilled = invoices
    ? invoices.reduce((acc, inv) => (inv.status !== 'cancelled' ? acc + Number(inv.totalAmount) : acc), 0)
    : 0;
  const totalCollected = invoices
    ? invoices.reduce((acc, inv) => acc + Number(inv.amountPaid), 0)
    : 0;
  const totalPending = invoices
    ? invoices.reduce((acc, inv) => (inv.status !== 'cancelled' ? acc + Number(inv.amountDue) : acc), 0)
    : 0;

  if (selectedInvoice) {
    return (
      <div className="p-6">
        <InvoiceDetailView
          workspaceId={workspaceId}
          invoice={selectedInvoice}
          onBack={() => setSelectedInvoice(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink-deep)]">Invoices</h1>
          <p className="text-sm text-[var(--color-slate-text)]">
            Issue professional invoices, calculate GST tax, track due dates, and record payments.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
      </div>

      {/* Metrics Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[var(--color-hairline)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Invoiced</div>
            <div className="text-2xl font-black text-[var(--color-ink-deep)] mt-1 flex items-center">
              <CurrencyInr className="h-5 w-5 mr-0.5" />
              {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[var(--color-hairline)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Collected</div>
            <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center">
              <CurrencyInr className="h-5 w-5 mr-0.5" />
              {totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[var(--color-hairline)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Outstanding Balance</div>
            <div className="text-2xl font-black text-amber-600 mt-1 flex items-center">
              <CurrencyInr className="h-5 w-5 mr-0.5" />
              {totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[var(--color-hairline)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search invoice #, client, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[var(--color-brand-yellow)] text-black font-semibold shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List or States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl">
          Failed to load invoices: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <InvoiceEmptyState onCreateClick={() => setCreateDialogOpen(true)} />
      ) : (
        <InvoiceList invoices={invoices} onSelect={(inv) => setSelectedInvoice(inv)} />
      )}

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        workspaceId={workspaceId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
