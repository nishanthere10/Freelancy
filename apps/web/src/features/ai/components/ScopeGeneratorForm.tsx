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
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/80 p-6 border border-blue-100/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 dark:border-blue-900/40">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Sparkle size={20} weight="fill" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              AI Project Scope Analysis
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Paste raw client emails, project briefs, or rough requirement specs. The AI will
              deconstruct it into structured milestones, hour estimates, timeline durations, and tech stacks.
            </p>
          </div>
        </div>
      </div>

      {/* Quick-fill Example Templates */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
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
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50/80 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <FileText size={14} className="text-blue-500" />
              {brief.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Textarea */}
      <div className="space-y-1.5">
        <label
          htmlFor="inputText"
          className="block text-sm font-medium text-neutral-900 dark:text-neutral-200"
        >
          Client Specification / Brief
        </label>
        <textarea
          id="inputText"
          rows={7}
          {...register('inputText')}
          disabled={isLoading}
          placeholder="e.g. Need a customer portal for managing freelance contracts. Clients should be able to view projects, approve milestone invoices, and download tax statements..."
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
        />
        {errors.inputText && (
          <p className="text-xs font-medium text-red-500">{errors.inputText.message}</p>
        )}
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">Analysis Failed</p>
          <p className="mt-0.5 text-xs">{error.message || 'An unexpected error occurred.'}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isLoading}
          className="min-w-[180px] shadow-lg shadow-blue-500/20"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <SpinnerGap size={18} className="animate-spin" />
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
