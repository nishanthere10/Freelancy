'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkle, SpinnerGap, FileText, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@shared/components/Button';

const scopeFormSchema = z.object({
  inputText: z
    .string()
    .min(15, 'Please provide at least 15 characters of detail for the AI to analyze.'),
});

type ScopeFormValues = z.infer<typeof scopeFormSchema>;

interface ScopeGeneratorFormProps {
  onGenerate: (data: ScopeFormValues) => void;
  isLoading: boolean;
  error?: Error | null;
}

const EXAMPLE_BRIEFS = [
  {
    title: 'E-Commerce Marketplace',
    text: 'Build a multi-vendor marketplace for artisan goods with customer accounts, Stripe Connect payouts, search filters, and an admin dashboard.',
  },
  {
    title: 'SaaS Invoicing Platform',
    text: 'Develop a subscription SaaS application with recurring invoice generation, PDF tax receipts, client portals, and automated overdue email reminders.',
  },
  {
    title: 'Mobile Delivery App',
    text: 'Create a cross-platform food delivery app for iOS and Android with live GPS courier tracking, push notifications, and restaurant menu management.',
  },
];

export const ScopeGeneratorForm: React.FC<ScopeGeneratorFormProps> = ({
  onGenerate,
  isLoading,
  error,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ScopeFormValues>({
    resolver: zodResolver(scopeFormSchema),
    defaultValues: {
      inputText: '',
    },
  });

  const handleQuickFill = (text: string) => {
    setValue('inputText', text, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <form onSubmit={handleSubmit(onGenerate)} className="space-y-6">
      {/* Header Banner - Miro Canary Yellow Accent */}
      <div className="rounded-[var(--radius-xxl)] bg-[var(--color-yellow-light)] border border-[var(--color-brand-yellow)]/40 p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-brand-yellow)] text-[var(--color-primary)] shadow-xs">
            <Sparkle size={20} weight="fill" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[var(--color-ink-deep)] tracking-tight">
                AI Project Scope Analysis
              </h3>
              <span className="inline-flex items-center rounded-full bg-[var(--color-surface-pricing-featured)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-blue)] border border-[var(--color-brand-blue)]/20">
                AI Studio
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-charcoal)] leading-relaxed">
              Paste raw client emails, project briefs, or rough requirement specs. The AI will
              deconstruct it into structured milestones, hour estimates, timeline durations, and tech stacks.
            </p>
          </div>
        </div>
      </div>

      {/* Quick-fill Example Templates */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-text)]">
            Quick-Fill Examples
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_BRIEFS.map((brief) => (
            <button
              key={brief.title}
              type="button"
              onClick={() => handleQuickFill(brief.text)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline-strong)] bg-white px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-all hover:border-[var(--color-brand-yellow)] hover:bg-[var(--color-yellow-light)] hover:text-[var(--color-ink-deep)] active:scale-[0.98] shadow-xs disabled:pointer-events-none disabled:opacity-50"
            >
              <FileText size={14} className="text-[var(--color-brand-yellow-deep)]" weight="bold" />
              {brief.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Textarea */}
      <div className="space-y-1.5">
        <label
          htmlFor="inputText"
          className="block text-sm font-semibold text-[var(--color-ink-deep)]"
        >
          Client Specification / Brief
        </label>
        <textarea
          id="inputText"
          rows={7}
          {...register('inputText')}
          disabled={isLoading}
          placeholder="e.g. Need a customer portal for managing freelance contracts. Clients should be able to view projects, approve milestone invoices, and download tax statements..."
          className="w-full resize-y rounded-[var(--radius-xl)] border border-[var(--color-hairline-strong)] bg-white p-4 text-sm text-[var(--color-ink-deep)] placeholder:text-[var(--color-steel)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/20 disabled:opacity-60 transition-all leading-relaxed"
        />
        {errors.inputText && (
          <p className="text-xs font-medium text-[var(--color-error)]">{errors.inputText.message}</p>
        )}
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-sm text-[var(--color-error)]">
          <p className="font-bold">Analysis Failed</p>
          <p className="mt-0.5 text-xs opacity-90">{error.message || 'An unexpected error occurred.'}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isLoading}
          className="min-w-[190px] rounded-full shadow-[var(--shadow-subtle)]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <SpinnerGap size={18} className="animate-spin text-[var(--color-brand-yellow)]" />
              Analyzing with AI...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Generate Scope Plan
              <ArrowRight size={16} weight="bold" />
            </span>
          )}
        </Button>
      </div>
    </form>
  );
};
