"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listMessages, sendEmail, sendWhatsApp } from "../api";
import { communicationKeys } from "../api/communication.keys";
import type {
  ListMessagesQueryParams,
  SendEmailPayload,
  SendWhatsAppPayload,
} from "../schemas/communication.schemas";

export function useCommunicationMessages(
  workspaceId: string,
  filters?: ListMessagesQueryParams,
) {
  return useQuery({
    queryKey: communicationKeys.list(workspaceId, filters as Record<string, unknown>),
    queryFn: () => listMessages(workspaceId, filters),
    enabled: !!workspaceId,
  });
}

export function useSendEmail(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendEmailPayload) => sendEmail(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
      toast.success("Email sent successfully");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to send email";
      toast.error(message);
    },
  });
}

export function useSendWhatsApp(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendWhatsAppPayload) => sendWhatsApp(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
      toast.success("WhatsApp message sent successfully");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to send WhatsApp message";
      toast.error(message);
    },
  });
}
