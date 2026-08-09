'use client';

import { Dialog } from '@shared/components';
import type { ProjectResponse } from '../api';
import { CreateProjectForm } from './CreateProjectForm';

interface EditProjectDialogProps {
  workspaceId: string;
  project: ProjectResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({
  workspaceId,
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  if (!project) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit Project: ${project.name}`}
      className="max-w-xl"
    >
      <CreateProjectForm
        workspaceId={workspaceId}
        project={project}
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
