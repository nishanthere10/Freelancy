"use client";

import { invoiceKeys } from "@features/invoice/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type ApproveChangeOrderInput,
  type CreateChangeOrderInput,
  type UpdateChangeOrderDraftInput,
  approveChangeOrder,
  cancelChangeOrder,
  createChangeOrder,
  getProjectChangeOrders,
  rejectChangeOrder,
  updateChangeOrderDraft,
} from "../api";
import { projectKeys } from "../api/project.keys";
import { deliverableKeys } from "./useProjectDeliverables";

export const changeOrderKeys = {
  all: ["change-orders"] as const,
  list: (workspaceId: string, projectId: string) =>
    [...changeOrderKeys.all, workspaceId, projectId] as const,
  detail: (workspaceId: string, projectId: string, changeOrderId: string) =>
    [...changeOrderKeys.all, workspaceId, projectId, changeOrderId] as const,
};

export function useChangeOrders(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: changeOrderKeys.list(workspaceId, projectId),
    queryFn: () => getProjectChangeOrders(workspaceId, projectId),
    enabled: Boolean(workspaceId && projectId),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateChangeOrder(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChangeOrderInput) =>
      createChangeOrder(workspaceId, projectId, data),
    onSuccess: (created) => {
      toast.success(
        `Change Order proposal ${created.changeOrderNumber} created`,
      );
      queryClient.invalidateQueries({
        queryKey: changeOrderKeys.list(workspaceId, projectId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create change order draft";
      toast.error(message);
    },
  });
}

export function useUpdateChangeOrderDraft(
  workspaceId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      changeOrderId,
      data,
    }: {
      changeOrderId: string;
      data: UpdateChangeOrderDraftInput;
    }) => updateChangeOrderDraft(workspaceId, projectId, changeOrderId, data),
    onSuccess: () => {
      toast.success("Change order proposal updated");
      queryClient.invalidateQueries({
        queryKey: changeOrderKeys.list(workspaceId, projectId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to update change order";
      toast.error(message);
    },
  });
}

export function useApproveChangeOrder(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      changeOrderId,
      data,
    }: {
      changeOrderId: string;
      data?: ApproveChangeOrderInput;
    }) => approveChangeOrder(workspaceId, projectId, changeOrderId, data),
    onSuccess: (res) => {
      toast.success(
        `Change Order ${res.changeOrder.changeOrderNumber} approved! New deliverables and invoice created.`,
      );
      // Invalidate change orders, deliverables, project, and invoices
      queryClient.invalidateQueries({
        queryKey: changeOrderKeys.list(workspaceId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.list(workspaceId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(workspaceId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.all(workspaceId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to approve change order";
      toast.error(message);
    },
  });
}

export function useRejectChangeOrder(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changeOrderId: string) =>
      rejectChangeOrder(workspaceId, projectId, changeOrderId),
    onSuccess: () => {
      toast.info("Change order proposal rejected");
      queryClient.invalidateQueries({
        queryKey: changeOrderKeys.list(workspaceId, projectId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to reject change order";
      toast.error(message);
    },
  });
}

export function useCancelChangeOrder(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changeOrderId: string) =>
      cancelChangeOrder(workspaceId, projectId, changeOrderId),
    onSuccess: () => {
      toast.info("Change order proposal cancelled");
      queryClient.invalidateQueries({
        queryKey: changeOrderKeys.list(workspaceId, projectId),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to cancel change order";
      toast.error(message);
    },
  });
}
