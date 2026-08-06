'use client';

import { Dialog, Button, FormField } from '@shared/components';
import { useUpdateWorkspace } from '../hooks';
import type { WorkspaceResponse } from '../api';
import { createWorkspaceSchema, type CreateWorkspaceFormData } from '../schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEffect } from 'react';

interface EditWorkspaceDialogProps {
  workspace: WorkspaceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWorkspaceDialog({ workspace, open, onOpenChange }: EditWorkspaceDialogProps) {
  const { mutateAsync, isPending } = useUpdateWorkspace();

  const form = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: 'onBlur',
    defaultValues: { name: '', slug: '', description: '' },
  });

  // Reset form when workspace changes
  useEffect(() => {
    if (workspace && open) {
      form.reset({
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description || '',
      });
    }
  }, [workspace, open, form]);

  const handleSubmit = async (data: CreateWorkspaceFormData) => {
    if (!workspace) return;
    try {
      const { slug, ...updatePayload } = data;
      await mutateAsync({ id: workspace.id, data: updatePayload });
      onOpenChange(false);
    } catch {
      // Error toast is handled by the mutation hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Workspace"
      description="Update your workspace details"
      className="max-w-md"
    >
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          <FormField
            name="name"
            label="Workspace Name"
            placeholder="e.g., My Agency"
            required
            disabled={isPending}
          />

          <div className="space-y-1.5 opacity-70">
            <FormField
              name="slug"
              label="Workspace Slug"
              placeholder="e.g., my-agency"
              required
              disabled={true}
            />
            <p className="text-xs" style={{ color: 'var(--color-steel)' }}>
              Slugs cannot be changed after creation.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--color-ink-deep)' }}>
              Description <span style={{ color: 'var(--color-steel)' }}>(optional)</span>
            </label>
            <textarea
              placeholder="What will you use this workspace for?"
              disabled={isPending}
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
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
            <Button type="button" variant="secondary" size="md" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isPending || form.formState.isSubmitting} className="flex items-center gap-2">
              {isPending && <Loader2 size={15} className="animate-spin" />}
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </Dialog>
  );
}
