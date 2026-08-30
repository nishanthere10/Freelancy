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
      <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
        <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24">
          <InvoiceDetailView
            workspaceId={workspaceId}
            invoice={selectedInvoice}
            onBack={() => setSelectedInvoice(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
      <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24 space-y-10">
        {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-[var(--radius-xl)] bg-[var(--color-rose-light)] text-[var(--color-brand-rose)] flex items-center justify-center font-semibold">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep)] tracking-tight">
                Invoices
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-slate-text)]">
                Issue professional GST-compliant invoices, track due dates, and record payments.
              </p>
            </div>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)} className="shadow-xs rounded-full">
            <Plus className="h-4 w-4 mr-1.5" /> Create Invoice
          </Button>
        </div>

        {/* Metrics Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="stat-card">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[var(--color-slate-text)] uppercase tracking-wider">
                Total Invoiced
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep)] flex items-center">
                <CurrencyDollar className="h-6 w-6 text-[var(--color-brand-blue)] mr-0.5" />
                {totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-medium text-[var(--color-brand-blue)] flex items-center gap-1">
                <TrendUp className="h-3.5 w-3.5" /> Gross billed revenue
              </div>
            </div>
            <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] flex items-center justify-center font-bold">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="stat-card">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[var(--color-slate-text)] uppercase tracking-wider">
                Total Collected
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--color-success-accent)] flex items-center">
                <CurrencyDollar className="h-6 w-6 text-[var(--color-success-accent)] mr-0.5" />
                {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-medium text-[var(--color-success-accent)] flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Payments cleared
              </div>
            </div>
            <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-teal-light)] text-[var(--color-success-accent)] flex items-center justify-center font-bold">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="stat-card">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[var(--color-slate-text)] uppercase tracking-wider">
                Pending Balance
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--color-rose-dark)] flex items-center">
                <CurrencyDollar className="h-6 w-6 text-[var(--color-rose-dark)] mr-0.5" />
                {totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-medium text-[var(--color-rose-dark)] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Outstanding balance
              </div>
            </div>
            <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-rose-light)] text-[var(--color-rose-dark)] flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="filter-bar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-steel)]" />
            <Input
              placeholder="Search by invoice number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-xs bg-white rounded-full border-[var(--color-hairline-strong)]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((st) => (
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

        {/* Invoice List / Empty State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-[var(--radius-xl)] border border-[var(--color-error-border)] max-w-lg mx-auto">
            <p className="text-sm font-semibold">Failed to load invoices</p>
            <p className="text-xs text-[var(--color-error)]/80 mt-1">
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
    </div>
  );
}
