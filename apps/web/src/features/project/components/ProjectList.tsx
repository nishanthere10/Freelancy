'use client';

import type { ProjectResponse } from '../api';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  workspaceId: string;
  projects: ProjectResponse[];
  onSelectProject?: (project: ProjectResponse) => void;
  onEditProject?: (project: ProjectResponse) => void;
}

export function ProjectList({
  workspaceId,
  projects,
  onSelectProject,
  onEditProject,
}: ProjectListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          workspaceId={workspaceId}
          project={project}
          onSelect={onSelectProject}
          onEdit={onEditProject}
        />
      ))}
    </div>
  );
}
