'use client';

import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/components';
import { Plus, MagnifyingGlass, Briefcase } from '@phosphor-icons/react';
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
      <div className="p-6 sm:p-10 bg-[var(--color-canvas,#f8fafc)] min-h-screen">
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
    <div className="p-6 sm:p-10 max-w-[1400px] w-full mx-auto space-y-8 bg-[var(--color-canvas,#f8fafc)] min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-semibold">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep,#0f172a)] tracking-tight">
              Projects
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-slate-text,#64748b)]">
              Track active deliverables, client scopes, timelines, and financial models.
            </p>
          </div>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="shadow-xs">
          <Plus className="h-4 w-4 mr-1.5" /> Add Project
        </Button>
      </div>

      {/* Toolbar & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by project name or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-sm rounded-xl border-gray-200 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['active', 'draft', 'completed', 'archived', 'all'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid Container */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-700 bg-red-50/80 rounded-2xl border border-red-200 max-w-lg mx-auto">
          <p className="text-sm font-semibold">Failed to load projects</p>
          <p className="text-xs text-red-600 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
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
