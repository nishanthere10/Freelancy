'use client';

import { useState } from 'react';
import { Button } from '@shared/components';
import {
  ArrowLeft,
  Printer,
  PaperPlaneRight,
  CreditCard,
  Pencil,
  Prohibit,
  Trash,
  CheckCircle,
  Building,
  User,
} from '@phosphor-icons/react';
import type { InvoiceResponse } from '../api';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { useSendInvoice, useCancelInvoice, useDeleteInvoice } from '../hooks';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { EditInvoiceDialog } from './EditInvoiceDialog';

interface InvoiceDetailViewProps {
  workspaceId: string;
  invoice: InvoiceResponse;
  onBack: () => void;
}

export function InvoiceDetailView({ workspaceId, invoice, onBack }: InvoiceDetailViewProps) {
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const sendInvoiceMutation = useSendInvoice(workspaceId);
  const cancelInvoiceMutation = useCancelInvoice(workspaceId);
  const deleteInvoiceMutation = useDeleteInvoice(workspaceId);

  const handlePrint = () => {
    window.print();
  };

  const handleSend = async () => {
    if (confirm('Issue this invoice? A sequential invoice number will be permanently assigned.')) {
      await sendInvoiceMutation.mutateAsync({ id: invoice.id });
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to void/cancel this invoice? This action cannot be undone.')) {
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[var(--color-hairline)] shadow-sm">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
          </Button>

          {invoice.status === 'draft' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSend}
                disabled={sendInvoiceMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
              className="text-red-600 border-red-200 hover:bg-red-50"
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
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Document Container */}
      <div className="bg-white p-8 md:p-12 rounded-2xl border border-[var(--color-hairline)] shadow-lg space-y-8 text-slate-800 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-gray-200 pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--color-ink-deep)] uppercase">INVOICE</h1>
            <div className="mt-2 text-sm font-mono text-slate-600 flex items-center gap-2">
              <span className="font-semibold">{invoice.invoiceNumber || 'DRAFT INVOICE'}</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs text-slate-600">
            <div><span className="font-semibold text-gray-800">Issue Date:</span> {invoice.issueDate || 'Draft'}</div>
            <div><span className="font-semibold text-gray-800">Due Date:</span> {invoice.dueDate || 'Upon receipt'}</div>
            <div><span className="font-semibold text-gray-800">Currency:</span> {invoice.currency}</div>
          </div>
        </div>

        {/* Billed From & Billed To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          {/* Billed From (Freelancer Workspace) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 space-y-1">
            <div className="font-bold uppercase text-gray-400 text-[10px] tracking-wider mb-1 flex items-center">
              <Building className="h-3.5 w-3.5 mr-1" /> Billed From
            </div>
            <div className="font-bold text-sm text-[var(--color-ink-deep)]">Freelance OS Workspace</div>
            <div className="text-slate-600">GSTIN: 27AAAAA0000A1Z5</div>
            <div className="text-slate-500">India</div>
          </div>

          {/* Billed To (Client) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 space-y-1">
            <div className="font-bold uppercase text-gray-400 text-[10px] tracking-wider mb-1 flex items-center">
              <User className="h-3.5 w-3.5 mr-1" /> Billed To
            </div>
            <div className="font-bold text-sm text-[var(--color-ink-deep)]">{invoice.clientName || 'Client Name'}</div>
            {invoice.projectName && (
              <div className="text-slate-600">Project: {invoice.projectName}</div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="p-3 text-gray-400 font-mono">{idx + 1}</td>
                  <td className="p-3 font-medium text-gray-900">{item.description}</td>
                  <td className="p-3 text-right font-mono">{item.quantity}</td>
                  <td className="p-3 text-right font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold text-gray-900 font-mono">₹{Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals & Tax Summary Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4 border-t border-gray-200">
          <div className="space-y-4 w-full sm:w-1/2 text-xs">
            {invoice.notes && (
              <div>
                <div className="font-bold text-gray-700 uppercase text-[10px] tracking-wider mb-1">Notes</div>
                <div className="bg-gray-50 p-3 rounded-lg text-slate-600 whitespace-pre-wrap">{invoice.notes}</div>
              </div>
            )}
            {invoice.terms && (
              <div>
                <div className="font-bold text-gray-700 uppercase text-[10px] tracking-wider mb-1">Payment Instructions</div>
                <div className="bg-gray-50 p-3 rounded-lg text-slate-600 whitespace-pre-wrap">{invoice.terms}</div>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
            </div>

            {discountAmt > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount ({invoice.discountRate}%):</span>
                <span className="font-mono">-₹{discountAmt.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Taxable Amount:</span>
              <span className="font-mono font-medium">₹{taxableAmt.toFixed(2)}</span>
            </div>

            {/* GST Tax Breakdown */}
            <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/80 space-y-1 my-1">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">GST Breakdown ({taxRate}%)</div>
              <div className="flex justify-between text-amber-900">
                <span>CGST ({halfTaxRate}%):</span>
                <span className="font-mono">₹{halfTaxAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-900">
                <span>SGST ({halfTaxRate}%):</span>
                <span className="font-mono">₹{halfTaxAmt.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between text-sm font-black text-[var(--color-ink-deep)] border-t border-gray-300 pt-2">
              <span>Total Amount:</span>
              <span className="font-mono text-amber-600">₹{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono text-emerald-600 font-semibold">₹{Number(invoice.amountPaid).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-gray-200 pt-2">
              <span>Balance Due:</span>
              <span className="font-mono text-rose-600">₹{Number(invoice.amountDue).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 pt-6">
          Thank you for choosing Freelance OS. This invoice was generated electronically.
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
