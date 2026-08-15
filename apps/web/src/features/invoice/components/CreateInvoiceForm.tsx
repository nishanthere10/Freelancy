'use client';

import { useState } from 'react';
import { Button, Input } from '@shared/components';
import { Plus, Trash, CalendarBlank, User, Receipt } from '@phosphor-icons/react';
import { useClients } from '../../client/hooks';
import { useProjects } from '../../project/hooks';
import type { CreateInvoiceInput, CreateInvoiceItemInput } from '../api';

interface CreateInvoiceFormProps {
  workspaceId: string;
  onSubmit: (data: CreateInvoiceInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<CreateInvoiceInput>;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getFutureDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

export function CreateInvoiceForm({
  workspaceId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
}: CreateInvoiceFormProps) {
  const { data: clients } = useClients(workspaceId);
  const { data: projects } = useProjects(workspaceId);

  const [clientId, setClientId] = useState(initialData?.clientId || '');
  const [projectId, setProjectId] = useState(initialData?.projectId || '');
  const [issueDate, setIssueDate] = useState(initialData?.issueDate || getTodayString());
  const [dueDate, setDueDate] = useState(initialData?.dueDate || getFutureDateString(15));
  const [taxRate, setTaxRate] = useState<string>(String(initialData?.taxRate ?? '18.00'));
  const [discountRate, setDiscountRate] = useState<string>(String(initialData?.discountRate ?? '0.00'));
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [terms, setTerms] = useState(initialData?.terms || '');

  const [items, setItems] = useState<CreateInvoiceItemInput[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [{ description: '', quantity: '1.00', unitPrice: '0.00' }],
  );

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: '1.00', unitPrice: '0.00' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreateInvoiceItemInput, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Math summary calculations
  let subtotalNum = 0;
  items.forEach((it) => {
    const q = Number(it.quantity || 0);
    const p = Number(it.unitPrice || 0);
    subtotalNum += q * p;
  });

  const discRateNum = Number(discountRate || 0);
  const discountAmtNum = subtotalNum * (discRateNum / 100);
  const taxableNum = subtotalNum - discountAmtNum;
  const taxRateNum = Number(taxRate || 0);
  const taxAmtNum = taxableNum * (taxRateNum / 100);
  const totalNum = taxableNum + taxAmtNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    await onSubmit({
      clientId,
      projectId: projectId || null,
      issueDate: issueDate || null,
      dueDate: dueDate || null,
      taxRate,
      discountRate,
      notes: notes || null,
      terms: terms || null,
      items: items.map((it, idx) => ({
        ...it,
        sortOrder: idx,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-sm">
      {/* 1. Client & Project Info Card */}
      <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <User className="h-4 w-4 text-amber-500" /> General Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full h-11 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            >
              <option value="">Select a Client</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Associated Project <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-11 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            >
              <option value="">No Project (General Billing / Retainer)</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Date Selection & Tax Terms */}
      <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <CalendarBlank className="h-4 w-4 text-blue-500" /> Invoice Dates & Tax Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Issue Date Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Issue Date</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setIssueDate(getTodayString())}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-slate-200 text-slate-600 rounded-md border border-slate-200 transition"
                >
                  Today
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full h-11 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Due Date Selector with Preset Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Due Date</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDueDate(getFutureDateString(7))}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-md border border-slate-200 transition"
                >
                  Net 7
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(getFutureDateString(15))}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-md border border-slate-200 transition"
                >
                  Net 15
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(getFutureDateString(30))}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-md border border-slate-200 transition"
                >
                  Net 30
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">GST Tax Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="18.00"
              className="h-11 bg-white border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Discount Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              value={discountRate}
              onChange={(e) => setDiscountRate(e.target.value)}
              placeholder="0.00"
              className="h-11 bg-white border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* 3. Invoice Line Items Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-emerald-500" /> Line Items
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="rounded-xl">
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 w-28">Qty / Hrs</th>
                <th className="p-3.5 w-36">Unit Price (₹)</th>
                <th className="p-3.5 w-36 text-right">Amount (₹)</th>
                <th className="p-3.5 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item, idx) => {
                const lineAmt = (Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-2.5">
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Website Design & UI Development"
                        required
                        className="bg-white border-slate-200 rounded-xl"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="bg-white border-slate-200 rounded-xl"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="bg-white border-slate-200 rounded-xl"
                      />
                    </td>
                    <td className="p-3.5 font-semibold text-right text-slate-800">
                      ₹{lineAmt}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-red-600 disabled:opacity-20 p-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Notes & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes & Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thank you for your business..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl shadow-xs outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Terms</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Payment due within 15 days via Bank Transfer / UPI..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl shadow-xs outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-3 text-xs">
          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-2 border-b border-amber-200/50">
            Payment Summary
          </h4>
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>₹{subtotalNum.toFixed(2)}</span>
          </div>
          {discountAmtNum > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discount ({discRateNum}%):</span>
              <span>-₹{discountAmtNum.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Taxable Amount:</span>
            <span>₹{taxableNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>GST Tax ({taxRateNum}%):</span>
            <span>+₹{taxAmtNum.toFixed(2)}</span>
          </div>
          <div className="border-t border-amber-300/60 pt-3 flex justify-between text-base font-bold text-slate-900">
            <span>Total Payable:</span>
            <span className="text-amber-700">₹{totalNum.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. Actions Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="rounded-xl px-5">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !clientId} className="rounded-xl px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Draft Invoice'}
        </Button>
      </div>
    </form>
  );
}
