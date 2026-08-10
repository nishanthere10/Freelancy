'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField } from '@shared/components';
import { useClients } from '@features/client';
import { projectFormSchema, type ProjectFormValues } from '../schemas';
import { useCreateProject, useUpdateProject } from '../hooks';
import type { CreateProjectInput, ProjectResponse } from '../api';

interface CreateProjectFormProps {
  workspaceId: string;
  project?: ProjectResponse | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateProjectForm({
  workspaceId,
  project,
  onSuccess,
  onCancel,
}: CreateProjectFormProps) {
  const isEditing = Boolean(project);
  const { data: clients } = useClients(workspaceId, { status: 'all' });

  const createMutation = useCreateProject(workspaceId);
  const updateMutation = useUpdateProject(workspaceId, project?.id || '');

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name || '',
      clientId: project?.clientId || 'none',
      pricingModel: project?.pricingModel || 'fixed',
      budgetCurrency: project?.budgetCurrency || 'INR',
      budgetAmount: project?.budgetAmount ? String(project.budgetAmount) : '',
      startDate: project?.startDate || '',
      targetDate: project?.targetDate || '',
      description: project?.description || '',
    },
  });

  const onSubmit = (values: ProjectFormValues) => {
    const cleanedInput: CreateProjectInput = {
      name: values.name,
      clientId: values.clientId === 'none' || !values.clientId ? null : values.clientId,
      pricingModel: values.pricingModel,
      budgetCurrency: values.budgetCurrency || 'INR',
      budgetAmount: values.budgetAmount ? Number(values.budgetAmount) : null,
      startDate: values.startDate || null,
      targetDate: values.targetDate || null,
      description: values.description || null,
    };

    if (isEditing && project) {
      updateMutation.mutate(cleanedInput, {
        onSuccess: () => onSuccess?.(),
      });
    } else {
      createMutation.mutate(cleanedInput, {
        onSuccess: () => onSuccess?.(),
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="name"
          label="Project Name"
          placeholder="e.g. Mobile App Development V1"
          required
          disabled={isSubmitting}
        />

        <div className="flex flex-col gap-2 w-full">
          <label htmlFor="project-client-select" className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
            Client
          </label>
          <select
            id="project-client-select"
            {...form.register('clientId')}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-hairline)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]"
          >
            <option value="none">None (Internal Project)</option>
            {clients?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} {client.companyName ? `(${client.companyName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="project-pricing-model-select" className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
              Pricing Model
            </label>
            <select
              id="project-pricing-model-select"
              {...form.register('pricingModel')}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-hairline)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]"
            >
              <option value="fixed">Fixed Price</option>
              <option value="hourly">Hourly Rate</option>
              <option value="retainer">Monthly Retainer</option>
            </select>
          </div>

          <FormField
            name="budgetAmount"
            label="Budget Amount (INR)"
            type="number"
            placeholder="e.g. 150000"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            name="startDate"
            label="Start Date"
            type="date"
            disabled={isSubmitting}
          />

          <FormField
            name="targetDate"
            label="Target Completion Date"
            type="date"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label htmlFor="project-description-input" className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
            Description / Scope
          </label>
          <textarea
            id="project-description-input"
            {...form.register('description')}
            rows={3}
            placeholder="Briefly describe project scope, key deliverables, or milestones..."
            disabled={isSubmitting}
            aria-invalid={Boolean(form.formState.errors.description)}
            aria-describedby={form.formState.errors.description ? 'project-description-error' : undefined}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-hairline)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-yellow)]"
          />
          {form.formState.errors.description?.message && (
            <p id="project-description-error" className="text-xs text-[var(--color-error)]">
              {String(form.formState.errors.description.message)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-hairline)]">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
              ? 'Update Project'
              : 'Create Project'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
