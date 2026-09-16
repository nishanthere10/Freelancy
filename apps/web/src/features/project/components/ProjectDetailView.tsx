"use client";

import {
  EditProjectDialog,
  ProjectDetail,
  type ProjectResponse,
  useProject,
} from "@features/project";
import { ArrowLeft, Briefcase } from "@phosphor-icons/react";
import { Button, Skeleton } from "@shared/components";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

interface ProjectDetailViewProps {
  workspaceId: string;
  projectId: string;
}

export function ProjectDetailView({
  workspaceId,
  projectId,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(
    null,
  );

  const {
    data: project,
    isLoading,
    error,
  } = useProject(workspaceId, projectId);

  const handleBack = () => {
    router.push(`/workspaces/${workspaceId}/projects`);
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
      <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24">
        {isLoading ? (
          <div className="space-y-6 max-w-[1200px] w-full mx-auto">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-36 rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        ) : error || !project ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] shadow-sm space-y-4">
            <div className="h-12 w-12 rounded-full bg-[var(--color-coral-light)] text-[var(--color-coral-dark)] flex items-center justify-center mx-auto">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-ink-deep)]">
                Project Not Found
              </h2>
              <p className="text-xs text-[var(--color-slate-text)] mt-1">
                {error instanceof Error
                  ? error.message
                  : "This project does not exist or has been removed."}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleBack}
              className="rounded-full shadow-xs mx-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Projects
            </Button>
          </div>
        ) : (
          <>
            <ProjectDetail
              workspaceId={workspaceId}
              project={project}
              onBack={handleBack}
              onEdit={(p) => setEditingProject(p)}
            />

            <EditProjectDialog
              workspaceId={workspaceId}
              project={editingProject}
              open={Boolean(editingProject)}
              onOpenChange={(open) => !open && setEditingProject(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}
