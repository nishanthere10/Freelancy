'use client';

import { useState } from 'react';
import { Button } from '@shared/components';
import { Pacifico } from 'next/font/google';
import {
  ArrowLeft,
  Printer,
  PaperPlaneRight,
  CreditCard,
  Pencil,
  Prohibit,
  Trash,
  Building,
  User,
  CheckCircle,
  FileText,
} from '@phosphor-icons/react';
import type { InvoiceResponse } from '../api';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { useSendInvoice, useCancelInvoice, useDeleteInvoice } from '../hooks';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { EditInvoiceDialog } from './EditInvoiceDialog';

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
});

interface InvoiceDetailViewProps {
  workspaceId: string;
  invoice: InvoiceResponse;
  onBack: () => void;
}

export function InvoiceDetailView({
  workspaceId,
  invoice,
  onBack,
}: InvoiceDetailViewProps) {
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const sendInvoiceMutation = useSendInvoice(workspaceId);
  const cancelInvoiceMutation = useCancelInvoice(workspaceId);
  const deleteInvoiceMutation = useDeleteInvoice(workspaceId);

  const handlePrint = () => {
    window.print();
  };

  const handleSend = async () => {
    if (
      confirm(
        'Issue this invoice? A sequential invoice number will be permanently assigned.'
      )
    ) {
      await sendInvoiceMutation.mutateAsync({ id: invoice.id });
    }
  };

  const handleCancel = async () => {
    if (
      confirm(
        'Are you sure you want to void/cancel this invoice? This action cannot be undone.'
      )
    ) {
      await cancelInvoiceMutation.mutateAsync(invoice.id);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this draft invoice?')) {
      await deleteInvoiceMutation.mutateAsync(invoice.id);
      onBack();
    }
  };

  // Financial calculations breakdown for GST
  const subtotal = Number(invoice.subtotal);
  const discountAmt = Number(invoice.discountAmount || 0);
  const taxableAmt = Number(invoice.taxableAmount);
  const taxAmt = Number(invoice.taxAmount || 0);
  const taxRate = Number(invoice.taxRate || 18);
  const halfTaxRate = taxRate / 2;
  const halfTaxAmt = taxAmt / 2;

  const currencySymbol = invoice.currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-6 max-w-[1200px] w-full mx-auto">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] shadow-[var(--shadow-card)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-[var(--color-slate-text)] hover:text-[var(--color-ink-deep)] transition-colors gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-full">
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
          </Button>

          {invoice.status === 'draft' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="rounded-full"
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSend}
                disabled={sendInvoiceMutation.isPending}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-charcoal)] text-white rounded-full font-semibold shadow-xs"
              >
                <PaperPlaneRight className="h-4 w-4 mr-1.5" /> Issue Invoice
              </Button>
            </>
          )}

          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setPayDialogOpen(true)}
              className="bg-[var(--color-brand-teal)] hover:opacity-90 text-white rounded-full font-semibold shadow-xs"
            >
              <CreditCard className="h-4 w-4 mr-1.5" /> Record Payment
            </Button>
          )}

          {invoice.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelInvoiceMutation.isPending}
              className="text-[var(--color-error)] border-[var(--color-error)]/30 hover:bg-[var(--color-error-bg)] rounded-full"
            >
              <Prohibit className="h-4 w-4 mr-1.5" /> Void
            </Button>
          )}

          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteInvoiceMutation.isPending}
              className="text-[var(--color-error)] border-[var(--color-error)]/30 hover:bg-[var(--color-error-bg)] rounded-full"
            >
              <Trash className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Document Container (Design Language Aligned) */}
      <div className="bg-white p-8 sm:p-12 md:p-16 rounded-[var(--radius-xxxl)] border border-[var(--color-hairline-soft)] border-t-4 border-t-[var(--color-brand-rose)] shadow-[var(--shadow-card)] space-y-10 text-[var(--color-charcoal)] print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b-2 border-[var(--color-hairline-soft)]">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={`${pacifico.className} text-3xl text-[var(--color-primary)]`}>
                Freelancy
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-rose-light)] text-[var(--color-brand-rose)] font-bold text-[10px] uppercase tracking-wider border border-[var(--color-brand-rose)]/30">
                Official Invoice
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-ink-deep)] uppercase">
              {invoice.invoiceNumber || 'DRAFT INVOICE'}
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <InvoiceStatusBadge status={invoice.status} />
              {invoice.status === 'paid' && (
                <span className="inline-flex items-center text-xs font-semibold text-[var(--color-success-accent)] gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Paid in full
                </span>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1.5 text-xs text-[var(--color-slate-text)] bg-[var(--color-surface-soft)] p-4 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] min-w-[200px]">
            <div>
              <span className="font-semibold text-[var(--color-ink-deep)]">Issue Date:</span>{' '}
              <span className="font-mono">{invoice.issueDate || 'Draft'}</span>
            </div>
            <div>
              <span className="font-semibold text-[var(--color-ink-deep)]">Due Date:</span>{' '}
              <span className="font-mono">{invoice.dueDate || 'Upon receipt'}</span>
            </div>
            <div>
              <span className="font-semibold text-[var(--color-ink-deep)]">Currency:</span>{' '}
              <span className="font-mono uppercase">{invoice.currency}</span>
            </div>
          </div>
        </div>

        {/* Billed From & Billed To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          {/* Billed From (Freelancer Workspace) */}
          <div className="bg-[var(--color-surface-soft)] p-6 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] space-y-2">
            <div className="font-bold uppercase text-[var(--color-steel)] text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-[var(--color-brand-blue)]" /> Billed From
            </div>
            <div className="font-bold text-base text-[var(--color-ink-deep)]">
              Freelancy Studio
            </div>
            <div className="text-[var(--color-slate-text)] font-mono">GSTIN: 27AAAAA0000A1Z5</div>
            <div className="text-[var(--color-steel)]">Professional Freelance Operations</div>
          </div>

          {/* Billed To (Client) */}
          <div className="bg-[var(--color-surface-soft)] p-6 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] space-y-2">
            <div className="font-bold uppercase text-[var(--color-steel)] text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
              <User className="h-4 w-4 text-[var(--color-brand-teal)]" /> Billed To
            </div>
            <div className="font-bold text-base text-[var(--color-ink-deep)]">
              {invoice.clientName || 'Client Name'}
            </div>
            {invoice.projectName && (
              <div className="text-[var(--color-slate-text)] font-medium">
                Project: {invoice.projectName}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-hairline)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] font-bold uppercase tracking-wider border-b border-[var(--color-hairline)]">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Item & Description</th>
                <th className="p-4 text-right w-24">Qty</th>
                <th className="p-4 text-right w-32">Unit Price</th>
                <th className="p-4 text-right w-36">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline-soft)]">
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[var(--color-surface-soft)] transition-colors">
                  <td className="p-4 text-center text-[var(--color-steel)] font-mono">{idx + 1}</td>
                  <td className="p-4 font-semibold text-[var(--color-ink-deep)]">{item.description}</td>
                  <td className="p-4 text-right font-mono text-[var(--color-charcoal)]">{item.quantity}</td>
                  <td className="p-4 text-right font-mono text-[var(--color-charcoal)]">
                    {currencySymbol}
                    {Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-semibold text-[var(--color-ink-deep)] font-mono">
                    {currencySymbol}
                    {Number(item.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals & Tax Summary Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4 border-t border-[var(--color-hairline-soft)]">
          <div className="space-y-4 w-full sm:w-1/2 text-xs">
            {invoice.notes && (
              <div className="space-y-1.5">
                <div className="font-bold text-[var(--color-steel)] uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-[var(--color-stone)]" /> Notes & Overview
                </div>
                <div className="bg-[var(--color-surface-soft)] p-4 rounded-[var(--radius-xl)] text-[var(--color-charcoal)] leading-relaxed whitespace-pre-wrap border border-[var(--color-hairline-soft)]">
                  {invoice.notes}
                </div>
              </div>
            )}
            {invoice.terms && (
              <div className="space-y-1.5">
                <div className="font-bold text-[var(--color-steel)] uppercase text-[10px] tracking-wider">
                  Payment Instructions & Terms
                </div>
                <div className="bg-[var(--color-surface-soft)] p-4 rounded-[var(--radius-xl)] text-[var(--color-charcoal)] leading-relaxed whitespace-pre-wrap border border-[var(--color-hairline-soft)]">
                  {invoice.terms}
                </div>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2.5 text-xs bg-[var(--color-surface-soft)] p-6 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)]">
            <div className="flex justify-between text-[var(--color-slate-text)]">
              <span>Subtotal:</span>
              <span className="font-mono font-medium text-[var(--color-ink-deep)]">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>

            {discountAmt > 0 && (
              <div className="flex justify-between text-[var(--color-success-accent)] font-semibold">
                <span>Discount ({invoice.discountRate}%):</span>
                <span className="font-mono">
                  -{currencySymbol}
                  {discountAmt.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-[var(--color-slate-text)]">
              <span>Taxable Amount:</span>
              <span className="font-mono font-medium text-[var(--color-ink-deep)]">
                {currencySymbol}
                {taxableAmt.toFixed(2)}
              </span>
            </div>

            {/* GST Tax Breakdown Box */}
            <div className="bg-[var(--color-yellow-light)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-brand-yellow)]/40 space-y-1.5 my-2">
              <div className="text-[10px] font-bold text-[var(--color-yellow-dark)] uppercase tracking-wider mb-1">
                GST Tax Summary ({taxRate}%)
              </div>
              <div className="flex justify-between text-[var(--color-yellow-dark)] font-medium">
                <span>CGST ({halfTaxRate}%):</span>
                <span className="font-mono">
                  {currencySymbol}
                  {halfTaxAmt.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[var(--color-yellow-dark)] font-medium">
                <span>SGST ({halfTaxRate}%):</span>
                <span className="font-mono">
                  {currencySymbol}
                  {halfTaxAmt.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-base font-extrabold text-[var(--color-ink-deep)] border-t border-[var(--color-hairline)] pt-3">
              <span>Total Amount:</span>
              <span className="font-mono text-[var(--color-brand-rose)]">
                {currencySymbol}
                {Number(invoice.totalAmount).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-[var(--color-slate-text)] pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono text-[var(--color-success-accent)] font-semibold">
                {currencySymbol}
                {Number(invoice.amountPaid).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-bold text-[var(--color-ink-deep)] border-t border-[var(--color-hairline)] pt-2">
              <span>Balance Due:</span>
              <span className="font-mono text-[var(--color-error)]">
                {currencySymbol}
                {Number(invoice.amountDue).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="text-center text-xs text-[var(--color-steel)] border-t border-[var(--color-hairline-soft)] pt-8">
          Thank you for working with Freelancy. Generated electronically with GST compliance.
        </div>
      </div>

      {/* Dialog Modals */}
      <RecordPaymentDialog
        workspaceId={workspaceId}
        invoice={invoice}
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
      />

      <EditInvoiceDialog
        workspaceId={workspaceId}
        invoice={invoice}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
