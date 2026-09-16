"use client";

import { dashboardKeys } from "@features/dashboard/api/dashboard.keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type CreateClientInput, clientKeys, createClient } from "../api";

export function useCreateClient(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientInput) => createClient(workspaceId, data),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.detail(workspaceId),
      });
      queryClient.setQueryData(
        clientKeys.detail(workspaceId, client.id),
        client,
      );
      toast.success(`Client "${client.name}" created`);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to create client";
      toast.error(message);
    },
  });
}
