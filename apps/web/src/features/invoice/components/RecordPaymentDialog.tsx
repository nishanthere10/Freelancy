'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@shared/components';
import { useRecordPayment } from '../hooks';
import type { InvoiceResponse } from '../api';

interface RecordPaymentDialogProps {
  workspaceId: string;
  invoice: InvoiceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordPaymentDialog({
  workspaceId,
  invoice,
  open,
  onOpenChange,
}: RecordPaymentDialogProps) {
  const recordPaymentMutation = useRecordPayment(workspaceId);

  const [amountPaid, setAmountPaid] = useState(invoice?.amountDue || '0.00');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await recordPaymentMutation.mutateAsync({
      id: invoice.id,
      data: {
        amountPaid,
        paymentMethod,
        paymentReference: paymentReference || null,
        paidAt: paidAt || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      className="max-w-lg overflow-y-auto no-scrollbar p-6 sm:p-8 rounded-[var(--radius-xxl)] shadow-[var(--shadow-modal)]"
    >
      <DialogContent className="space-y-5">
        <DialogHeader className="pb-3 border-b border-[var(--color-hairline-soft)]">
          <DialogTitle className="text-lg font-bold text-[var(--color-ink-deep)]">
            Record Payment ({invoice.invoiceNumber || 'Draft Invoice'})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="bg-[var(--color-surface-soft)] p-4 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] text-xs space-y-2">
            <div className="flex justify-between text-[var(--color-slate-text)]">
              <span>Invoice Total:</span>
              <span className="font-semibold text-[var(--color-ink-deep)]">₹{invoice.totalAmount}</span>
            </div>
            <div className="flex justify-between text-[var(--color-slate-text)]">
              <span>Already Paid:</span>
              <span className="font-semibold text-[var(--color-success-accent)]">₹{invoice.amountPaid}</span>
            </div>
            <div className="flex justify-between text-[var(--color-ink-deep)] font-bold border-t border-[var(--color-hairline)] pt-2 text-sm">
              <span>Outstanding Due:</span>
              <span className="text-[var(--color-yellow-dark)]">₹{invoice.amountDue}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">
              Payment Amount (₹) <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
              className="h-11 rounded-[var(--radius-lg)] border-[var(--color-hairline-strong)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-3.5 py-2.5 text-sm bg-white border border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-brand-blue)] outline-none transition-all"
            >
              <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="cash">Cash / Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">
              Reference / UTR Number <span className="text-[var(--color-steel)] font-normal">(Optional)</span>
            </label>
            <Input
              placeholder="e.g. UTR-9876543210"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="h-11 rounded-[var(--radius-lg)] border-[var(--color-hairline-strong)]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--color-ink-deep)]">Payment Date</label>
              <button
                type="button"
                onClick={() => setPaidAt(new Date().toISOString().split('T')[0])}
                className="px-2.5 py-0.5 text-[11px] font-medium bg-[var(--color-surface-soft)] hover:bg-[var(--color-surface)] text-[var(--color-charcoal)] rounded-full border border-[var(--color-hairline-strong)] transition"
              >
                Today
              </button>
            </div>
            <Input 
              type="date" 
              value={paidAt} 
              onChange={(e) => setPaidAt(e.target.value)} 
              className="h-11 rounded-[var(--radius-lg)] border-[var(--color-hairline-strong)] cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-hairline-soft)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPaymentMutation.isPending}
              className="rounded-full px-5"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={recordPaymentMutation.isPending || !amountPaid}
              className="rounded-full px-6 bg-[var(--color-brand-teal)] hover:opacity-90 text-white font-semibold"
            >
              {recordPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
