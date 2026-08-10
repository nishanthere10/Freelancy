'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@shared/components';
import { CurrencyInr } from '@phosphor-icons/react';
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
      className="max-w-lg overflow-y-auto no-scrollbar p-6 sm:p-8 rounded-2xl shadow-2xl"
    >
      <DialogContent className="space-y-5">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="text-lg font-bold text-[var(--color-ink-deep)]">
            Record Payment ({invoice.invoiceNumber || 'Draft Invoice'})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Invoice Total:</span>
              <span className="font-semibold text-slate-800">₹{invoice.totalAmount}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Already Paid:</span>
              <span className="font-semibold text-emerald-600">₹{invoice.amountPaid}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2 text-sm">
              <span>Outstanding Due:</span>
              <span className="text-amber-600">₹{invoice.amountDue}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="cash">Cash / Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reference / UTR Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              placeholder="e.g. UTR-9876543210"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Payment Date</label>
              <button
                type="button"
                onClick={() => setPaidAt(new Date().toISOString().split('T')[0])}
                className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
              >
                Today
              </button>
            </div>
            <Input 
              type="date" 
              value={paidAt} 
              onChange={(e) => setPaidAt(e.target.value)} 
              className="h-11 rounded-xl cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPaymentMutation.isPending}
              className="rounded-xl px-5"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={recordPaymentMutation.isPending || !amountPaid}
              className="rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {recordPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
