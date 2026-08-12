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
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-black transition-colors gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl">
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
          </Button>

          {invoice.status === 'draft' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="rounded-xl"
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSend}
                disabled={sendInvoiceMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-xs"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
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
              className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
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
              className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
            >
              <Trash className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Document Container (Design Language Aligned) */}
      <div className="bg-white p-8 sm:p-12 md:p-16 rounded-3xl border border-[var(--color-hairline,#e2e8f0)] shadow-xl space-y-10 text-slate-800 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b-2 border-gray-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={`${pacifico.className} text-3xl text-amber-500`}>
                Freelancy
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase tracking-wider">
                Official Invoice
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-ink-deep,#0f172a)] uppercase">
              {invoice.invoiceNumber || 'DRAFT INVOICE'}
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <InvoiceStatusBadge status={invoice.status} />
              {invoice.status === 'paid' && (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Paid in full
                </span>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-4 rounded-2xl border border-gray-100 min-w-[200px]">
            <div>
              <span className="font-semibold text-gray-800">Issue Date:</span>{' '}
              <span className="font-mono">{invoice.issueDate || 'Draft'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-800">Due Date:</span>{' '}
              <span className="font-mono">{invoice.dueDate || 'Upon receipt'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-800">Currency:</span>{' '}
              <span className="font-mono uppercase">{invoice.currency}</span>
            </div>
          </div>
        </div>

        {/* Billed From & Billed To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          {/* Billed From (Freelancer Workspace) */}
          <div className="bg-slate-50/80 p-6 rounded-2xl border border-gray-100 space-y-2">
            <div className="font-bold uppercase text-gray-400 text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-amber-500" /> Billed From
            </div>
            <div className="font-bold text-base text-[var(--color-ink-deep,#0f172a)]">
              Freelancy Studio
            </div>
            <div className="text-slate-600 font-mono">GSTIN: 27AAAAA0000A1Z5</div>
            <div className="text-slate-500">Professional Freelance Operations</div>
          </div>

          {/* Billed To (Client) */}
          <div className="bg-slate-50/80 p-6 rounded-2xl border border-gray-100 space-y-2">
            <div className="font-bold uppercase text-gray-400 text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
              <User className="h-4 w-4 text-amber-500" /> Billed To
            </div>
            <div className="font-bold text-base text-[var(--color-ink-deep,#0f172a)]">
              {invoice.clientName || 'Client Name'}
            </div>
            {invoice.projectName && (
              <div className="text-slate-600 font-medium">
                Project: {invoice.projectName}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Item & Description</th>
                <th className="p-4 text-right w-24">Qty</th>
                <th className="p-4 text-right w-32">Unit Price</th>
                <th className="p-4 text-right w-36">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-center text-gray-400 font-mono">{idx + 1}</td>
                  <td className="p-4 font-semibold text-gray-900">{item.description}</td>
                  <td className="p-4 text-right font-mono text-gray-700">{item.quantity}</td>
                  <td className="p-4 text-right font-mono text-gray-700">
                    {currencySymbol}
                    {Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-semibold text-gray-900 font-mono">
                    {currencySymbol}
                    {Number(item.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals & Tax Summary Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4 border-t border-gray-100">
          <div className="space-y-4 w-full sm:w-1/2 text-xs">
            {invoice.notes && (
              <div className="space-y-1.5">
                <div className="font-bold text-gray-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-gray-400" /> Notes & Overview
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-slate-700 leading-relaxed whitespace-pre-wrap border border-gray-100">
                  {invoice.notes}
                </div>
              </div>
            )}
            {invoice.terms && (
              <div className="space-y-1.5">
                <div className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">
                  Payment Instructions & Terms
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-slate-700 leading-relaxed whitespace-pre-wrap border border-gray-100">
                  {invoice.terms}
                </div>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2.5 text-xs bg-slate-50/60 p-6 rounded-2xl border border-gray-200">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>

            {discountAmt > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount ({invoice.discountRate}%):</span>
                <span className="font-mono">
                  -{currencySymbol}
                  {discountAmt.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Taxable Amount:</span>
              <span className="font-mono font-medium">
                {currencySymbol}
                {taxableAmt.toFixed(2)}
              </span>
            </div>

            {/* GST Tax Breakdown Box */}
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-200 space-y-1.5 my-2">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                GST Tax Summary ({taxRate}%)
              </div>
              <div className="flex justify-between text-amber-900 font-medium">
                <span>CGST ({halfTaxRate}%):</span>
                <span className="font-mono">
                  {currencySymbol}
                  {halfTaxAmt.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-amber-900 font-medium">
                <span>SGST ({halfTaxRate}%):</span>
                <span className="font-mono">
                  {currencySymbol}
                  {halfTaxAmt.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-base font-extrabold text-[var(--color-ink-deep,#0f172a)] border-t border-gray-200 pt-3">
              <span>Total Amount:</span>
              <span className="font-mono text-amber-600">
                {currencySymbol}
                {Number(invoice.totalAmount).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono text-emerald-600 font-semibold">
                {currencySymbol}
                {Number(invoice.amountPaid).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-gray-200 pt-2">
              <span>Balance Due:</span>
              <span className="font-mono text-rose-600">
                {currencySymbol}
                {Number(invoice.amountDue).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-8">
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
