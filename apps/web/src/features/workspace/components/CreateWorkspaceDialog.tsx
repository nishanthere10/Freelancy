'use client';

/**
 * Create workspace dialog
 * Wrapper around Dialog + CreateWorkspaceForm
 * Handles mutation and dialog lifecycle
 */

import { Dialog } from '@shared/components';
import { useCreateWorkspace } from '../hooks';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';
import type { CreateWorkspaceFormData } from '../schemas';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const { mutateAsync, isPending } = useCreateWorkspace();

  const handleSubmit = async (data: CreateWorkspaceFormData) => {
    try {
      await mutateAsync(data);
      // Close dialog on success (mutation will show success toast)
      onOpenChange(false);
    } catch {
      // Error toast handled by mutation hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Workspace"
      description="Set up a new workspace to organize your projects"
      className="max-w-md"
    >
      <CreateWorkspaceForm
        onSubmit={handleSubmit}
        isLoading={isPending}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
