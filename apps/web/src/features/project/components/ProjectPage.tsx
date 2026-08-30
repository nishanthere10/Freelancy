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
      <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
        <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24">
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
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[var(--color-surface-soft)]">
      <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 pb-24 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-[var(--radius-xl)] bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] flex items-center justify-center font-semibold">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink-deep)] tracking-tight">
                Projects
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-slate-text)]">
                Track active deliverables, client scopes, timelines, and financial models.
              </p>
            </div>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)} className="shadow-xs rounded-full">
            <Plus className="h-4 w-4 mr-1.5" /> Add Project
          </Button>
        </div>

        {/* Toolbar & Filter Controls */}
        <div className="filter-bar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-steel)]" />
            <Input
              placeholder="Search by project name or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-xs bg-white rounded-full border-[var(--color-hairline-strong)]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['active', 'draft', 'completed', 'archived', 'all'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`pill-tab capitalize ${
                  statusFilter === st ? 'pill-tab-active' : ''
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
          <div className="p-8 text-center text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-[var(--radius-xl)] border border-[var(--color-error-border)] max-w-lg mx-auto">
            <p className="text-sm font-semibold">Failed to load projects</p>
            <p className="text-xs text-[var(--color-error)] opacity-90 mt-1">
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
    </div>
  );
}
