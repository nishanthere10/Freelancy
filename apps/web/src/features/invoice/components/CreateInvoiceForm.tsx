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
      <div className="p-5 bg-[var(--color-surface-soft)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-steel)] flex items-center gap-1.5">
          <User className="h-4 w-4 text-[var(--color-brand-blue)]" /> General Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">
              Client <span className="text-[var(--color-error)]">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full h-11 px-3.5 py-2.5 text-sm bg-white border border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)] shadow-xs focus:ring-2 focus:ring-[var(--color-brand-blue)] outline-none transition-all"
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
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">
              Associated Project <span className="text-[var(--color-steel)] font-normal">(Optional)</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-11 px-3.5 py-2.5 text-sm bg-white border border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)] shadow-xs focus:ring-2 focus:ring-[var(--color-brand-blue)] outline-none transition-all"
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
      <div className="p-5 bg-[var(--color-surface-soft)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-steel)] flex items-center gap-1.5">
          <CalendarBlank className="h-4 w-4 text-[var(--color-brand-blue)]" /> Invoice Dates & Tax Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Issue Date Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[var(--color-ink-deep)]">Issue Date</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setIssueDate(getTodayString())}
                  className="px-2.5 py-0.5 text-[11px] font-medium bg-white hover:bg-[var(--color-surface)] text-[var(--color-charcoal)] rounded-full border border-[var(--color-hairline-strong)] transition"
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
                className="w-full h-11 px-3.5 py-2 text-sm bg-white border border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)] shadow-xs focus:ring-2 focus:ring-[var(--color-brand-blue)] outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Due Date Selector with Preset Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[var(--color-ink-deep)]">Due Date</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDueDate(getFutureDateString(7))}
                  className="px-2.5 py-0.5 text-[11px] font-medium bg-white hover:bg-[var(--color-yellow-light)] hover:text-[var(--color-yellow-dark)] text-[var(--color-charcoal)] rounded-full border border-[var(--color-hairline-strong)] transition"
                >
                  Net 7
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(getFutureDateString(15))}
                  className="px-2.5 py-0.5 text-[11px] font-medium bg-white hover:bg-[var(--color-yellow-light)] hover:text-[var(--color-yellow-dark)] text-[var(--color-charcoal)] rounded-full border border-[var(--color-hairline-strong)] transition"
                >
                  Net 15
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(getFutureDateString(30))}
                  className="px-2.5 py-0.5 text-[11px] font-medium bg-white hover:bg-[var(--color-yellow-light)] hover:text-[var(--color-yellow-dark)] text-[var(--color-charcoal)] rounded-full border border-[var(--color-hairline-strong)] transition"
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
                className="w-full h-11 px-3.5 py-2 text-sm bg-white border border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)] shadow-xs focus:ring-2 focus:ring-[var(--color-brand-blue)] outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">GST Tax Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="18.00"
              className="h-11 bg-white border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">Discount Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              value={discountRate}
              onChange={(e) => setDiscountRate(e.target.value)}
              placeholder="0.00"
              className="h-11 bg-white border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)]"
            />
          </div>
        </div>
      </div>

      {/* 3. Invoice Line Items Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-steel)] flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-[var(--color-brand-teal)]" /> Line Items
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </div>

        <div className="border border-[var(--color-hairline)] rounded-[var(--radius-xl)] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--color-surface-soft)] border-b border-[var(--color-hairline)] text-[var(--color-charcoal)] font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 w-28">Qty / Hrs</th>
                <th className="p-3.5 w-36">Unit Price (₹)</th>
                <th className="p-3.5 w-36 text-right">Amount (₹)</th>
                <th className="p-3.5 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline-soft)] bg-white">
              {items.map((item, idx) => {
                const lineAmt = (Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2);
                return (
                  <tr key={idx} className="hover:bg-[var(--color-surface-soft)] transition">
                    <td className="p-2.5">
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Website Design & UI Development"
                        required
                        className="bg-white border-[var(--color-hairline-strong)] rounded-[var(--radius-md)]"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="bg-white border-[var(--color-hairline-strong)] rounded-[var(--radius-md)]"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="bg-white border-[var(--color-hairline-strong)] rounded-[var(--radius-md)]"
                      />
                    </td>
                    <td className="p-3.5 font-semibold text-right text-[var(--color-ink-deep)] font-mono">
                      ₹{lineAmt}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-[var(--color-steel)] hover:text-[var(--color-error)] disabled:opacity-20 p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-error-bg)] transition"
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
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">Notes & Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thank you for your business..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)] shadow-xs outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-deep)] mb-1.5">Payment Terms</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Payment due within 15 days via Bank Transfer / UPI..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-[var(--color-hairline-strong)] rounded-[var(--radius-lg)] shadow-xs outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
            />
          </div>
        </div>

        <div className="p-5 bg-[var(--color-yellow-light)] rounded-[var(--radius-xl)] border border-[var(--color-brand-yellow)]/40 space-y-3 text-xs">
          <h4 className="font-bold text-[var(--color-yellow-dark)] uppercase tracking-wider text-[11px] pb-2 border-b border-[var(--color-brand-yellow)]/30">
            Payment Summary
          </h4>
          <div className="flex justify-between text-[var(--color-yellow-dark)]">
            <span>Subtotal:</span>
            <span className="font-mono">₹{subtotalNum.toFixed(2)}</span>
          </div>
          {discountAmtNum > 0 && (
            <div className="flex justify-between text-[var(--color-success-accent)] font-medium">
              <span>Discount ({discRateNum}%):</span>
              <span className="font-mono">-₹{discountAmtNum.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--color-yellow-dark)]">
            <span>Taxable Amount:</span>
            <span className="font-mono">₹{taxableNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[var(--color-yellow-dark)]">
            <span>GST Tax ({taxRateNum}%):</span>
            <span className="font-mono">+₹{taxAmtNum.toFixed(2)}</span>
          </div>
          <div className="border-t border-[var(--color-brand-yellow)]/40 pt-3 flex justify-between text-base font-bold text-[var(--color-ink-deep)]">
            <span>Total Payable:</span>
            <span className="text-[var(--color-yellow-dark)] font-mono">₹{totalNum.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. Actions Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-hairline-soft)]">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="rounded-full px-5">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !clientId} className="rounded-full px-6 shadow-xs font-semibold">
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Draft Invoice'}
        </Button>
      </div>
    </form>
  );
}
