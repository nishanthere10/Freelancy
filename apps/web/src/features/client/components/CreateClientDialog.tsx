"use client";

import { Dialog } from "@shared/components";
import type { CreateClientInput } from "../api";
import { useCreateClient } from "../hooks";
import { CreateClientForm } from "./CreateClientForm";

interface CreateClientDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientDialog({
  workspaceId,
  open,
  onOpenChange,
}: CreateClientDialogProps) {
  const { mutate: createClient, isPending } = useCreateClient(workspaceId);

  const handleSubmit = (data: CreateClientInput) => {
    createClient(data, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Create New Client">
      <CreateClientForm onSubmit={handleSubmit} isSubmitting={isPending} />
    </Dialog>
  );
}
