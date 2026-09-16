'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  backfillProjectDeliverables,
  createProgressInvoice,
  createProjectDeliverable,
  deleteProjectDeliverable,
  getProjectDeliverables,
  updateProjectDeliverable,
  type CreateProgressInvoiceInput,
  type CreateProjectDeliverableInput,
  type UpdateProjectDeliverableInput,
} from '../api';
import { invoiceKeys } from '@features/invoice/api';

export const deliverableKeys = {
  all: ['project-deliverables'] as const,
  list: (workspaceId: string, projectId: string) =>
    [...deliverableKeys.all, workspaceId, projectId] as const,
};

export function useProjectDeliverables(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: deliverableKeys.list(workspaceId, projectId),
    queryFn: () => getProjectDeliverables(workspaceId, projectId),
    enabled: Boolean(workspaceId && projectId),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateProjectDeliverable(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDeliverableInput) =>
      createProjectDeliverable(workspaceId, projectId, data),
    onSuccess: () => {
      toast.success('Deliverable added successfully');
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.list(workspaceId, projectId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create deliverable';
      toast.error(message);
    },
  });
}

export function useUpdateProjectDeliverable(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deliverableId,
      data,
    }: {
      deliverableId: string;
      data: UpdateProjectDeliverableInput;
    }) => updateProjectDeliverable(workspaceId, projectId, deliverableId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.list(workspaceId, projectId),
      });
      if (updated.status === 'completed') {
        toast.success(`Milestone "${updated.title}" marked as completed!`);
      }
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update deliverable';
      toast.error(message);
    },
  });
}

export function useDeleteProjectDeliverable(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliverableId: string) =>
      deleteProjectDeliverable(workspaceId, projectId, deliverableId),
    onSuccess: () => {
      toast.success('Deliverable deleted');
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.list(workspaceId, projectId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to delete deliverable';
      toast.error(message);
    },
  });
}

export function useCreateProgressInvoice(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProgressInvoiceInput) =>
      createProgressInvoice(workspaceId, projectId, data),
    onSuccess: (res) => {
      toast.success(
        `Progress invoice ${res.invoice.invoiceNumber || ''} created successfully!`
      );
      // Invalidate deliverables (to reflect billedAt / invoiceId)
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.list(workspaceId, projectId),
      });
      // Invalidate invoices list for this workspace and project
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.all(workspaceId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create progress invoice';
      toast.error(message);
    },
  });
}

export function useBackfillProjectDeliverables(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => backfillProjectDeliverables(workspaceId, projectId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.list(workspaceId, projectId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to backfill deliverables';
      toast.error(message);
    },
  });
}
