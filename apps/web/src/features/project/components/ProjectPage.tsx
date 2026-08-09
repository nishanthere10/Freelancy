'use client';

import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/components';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useProjects } from '../hooks';
import type { ProjectResponse, ProjectStatus } from '../api';
import { ProjectList } from './ProjectList';
import { ProjectDetail } from './ProjectDetail';
import { ProjectEmptyState } from './ProjectEmptyState';
import { CreateProjectDialog } from './CreateProjectDialog';
import { EditProjectDialog } from './EditProjectDialog';

interface ProjectPageProps {
  workspaceId: string;
}

export function ProjectPage({ workspaceId }: ProjectPageProps) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);

  const { data: projects, isLoading, error } = useProjects(workspaceId, {
    status: statusFilter,
    search,
  });

  if (selectedProject) {
    return (
      <div className="p-6">
        <ProjectDetail
          workspaceId={workspaceId}
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          onEdit={(p) => setEditingProject(p)}
        />
        <EditProjectDialog
          workspaceId={workspaceId}
          project={editingProject}
          open={Boolean(editingProject)}
          onOpenChange={(open) => !open && setEditingProject(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink-deep)]">Projects</h1>
          <p className="text-sm text-[var(--color-slate-text)]">
            Track active client engagements, timelines, and budgets.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[var(--color-hairline)] shadow-sm">
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by project name or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['active', 'draft', 'completed', 'archived', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[var(--color-brand-yellow)] text-black font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl">
          Failed to load projects: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : !projects || projects.length === 0 ? (
        <ProjectEmptyState onCreateClick={() => setCreateDialogOpen(true)} />
      ) : (
        <ProjectList
          workspaceId={workspaceId}
          projects={projects}
          onSelectProject={(p) => setSelectedProject(p)}
          onEditProject={(p) => setEditingProject(p)}
        />
      )}

      <CreateProjectDialog
        workspaceId={workspaceId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditProjectDialog
        workspaceId={workspaceId}
        project={editingProject}
        open={Boolean(editingProject)}
        onOpenChange={(open) => !open && setEditingProject(null)}
      />
    </div>
  );
}
