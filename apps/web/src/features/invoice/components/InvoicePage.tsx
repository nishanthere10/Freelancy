'use client';

import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/components';
import {
  Plus,
  MagnifyingGlass,
  Receipt,
  CheckCircle,
  Clock,
  CurrencyDollar,
  TrendUp,
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
    ? invoices.reduce(
        (acc, inv) => (inv.status !== 'cancelled' ? acc + Number(inv.totalAmount) : acc),
        0
      )
    : 0;
  const totalCollected = invoices
    ? invoices.reduce((acc, inv) => acc + Number(inv.amountPaid), 0)
    : 0;
  const totalPending = invoices
    ? invoices.reduce(
        (acc, inv) => (inv.status !== 'cancelled' ? acc + Number(inv.amountDue) : acc),
        0
      )
    : 0;

  if (selectedInvoice) {
    return (
      <div className="p-6 sm:p-10 bg-[var(--color-canvas,#f8fafc)] min-h-screen">
        <InvoiceDetailView
          workspaceId={workspaceId}
          invoice={selectedInvoice}
          onBack={() => setSelectedInvoice(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-[1400px] w-full mx-auto space-y-8 bg-[var(--color-canvas,#f8fafc)] min-h-screen">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-semibold">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep,#0f172a)] tracking-tight">
              Invoices
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-slate-text,#64748b)]">
              Issue professional GST-compliant invoices, track due dates, and record payments.
            </p>
          </div>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="shadow-xs">
          <Plus className="h-4 w-4 mr-1.5" /> Create Invoice
        </Button>
      </div>

      {/* Metrics Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Invoiced
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep,#0f172a)] flex items-center">
              <CurrencyDollar className="h-6 w-6 text-purple-600 mr-0.5" />
              {totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-purple-600 flex items-center gap-1">
              <TrendUp className="h-3.5 w-3.5" /> Gross billed revenue
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Collected
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 flex items-center">
              <CurrencyDollar className="h-6 w-6 text-emerald-600 mr-0.5" />
              {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Payments cleared
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Outstanding Balance
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 flex items-center">
              <CurrencyDollar className="h-6 w-6 text-amber-600 mr-0.5" />
              {totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Awaiting payment
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search invoice #, client name, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-sm rounded-xl border-gray-200 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all whitespace-nowrap ${
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

      {/* Grid List or States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-700 bg-red-50/80 rounded-2xl border border-red-200 max-w-lg mx-auto">
          <p className="text-sm font-semibold">Failed to load invoices</p>
          <p className="text-xs text-red-600 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
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
