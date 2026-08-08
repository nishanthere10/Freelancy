'use client';

/**
 * Create workspace form
 * Handles form submission, validation, loading state
 * Uses React Hook Form + Zod
 */

import { Button, FormField } from '@shared/components';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleNotch } from '@phosphor-icons/react';
import { FormProvider, useForm } from 'react-hook-form';
import { createWorkspaceSchema, type CreateWorkspaceFormData } from '../schemas';

interface CreateWorkspaceFormProps {
  onSubmit: (data: CreateWorkspaceFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function CreateWorkspaceForm({
  onSubmit,
  isLoading = false,
  onCancel,
}: CreateWorkspaceFormProps) {
  const form = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: 'onBlur',
    defaultValues: { name: '', slug: '', description: '' },
  });

  const { handleSubmit, formState } = form;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Workspace Name */}
        <FormField
          name="name"
          label="Workspace Name"
          placeholder="e.g., My Agency"
          required
          disabled={isLoading}
        />

        {/* Slug */}
        <div className="space-y-1.5">
          <FormField
            name="slug"
            label="Workspace Slug"
            placeholder="e.g., my-agency"
            required
            disabled={isLoading}
          />
          <p className="text-xs" style={{ color: 'var(--color-steel)' }}>
            URL-friendly identifier — lowercase, hyphens only
          </p>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="description"
            className="text-sm font-medium"
            style={{ color: 'var(--color-ink-deep)' }}
          >
            Description{' '}
            <span style={{ color: 'var(--color-steel)' }}>(optional)</span>
          </label>
          <textarea
            id="description"
            placeholder="What will you use this workspace for?"
            disabled={isLoading}
            {...form.register('description')}
            rows={3}
            className={[
              'w-full rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)]',
              'bg-[var(--color-canvas)] px-4 py-2.5 text-sm text-[var(--color-ink)]',
              'placeholder:text-[var(--color-steel)]',
              'resize-none transition-colors duration-150',
              'focus:outline-none focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[var(--color-brand-blue)]/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface)]',
            ].join(' ')}
          />
          {formState.errors.description && (
            <p className="text-xs" style={{ color: 'var(--color-error)' }}>
              {formState.errors.description.message as string}
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex gap-3 justify-end pt-4 border-t"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading || formState.isSubmitting}
            className="flex items-center gap-2"
          >
            {isLoading && <CircleNotch size={15} className="animate-spin" />}
            {isLoading ? 'Creating…' : 'Create Workspace'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
