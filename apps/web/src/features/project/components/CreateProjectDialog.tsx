'use client';

import { Dialog } from '@shared/components';
import { CreateProjectForm } from './CreateProjectForm';

interface CreateProjectDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  workspaceId,
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Project"
      className="max-w-xl"
    >
      <CreateProjectForm
        workspaceId={workspaceId}
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
