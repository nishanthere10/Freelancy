'use client';

import { use } from 'react';
import { ProjectPage } from '@features/project';

interface WorkspaceProjectsRouteProps {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}

export default function WorkspaceProjectsRoute({ params }: WorkspaceProjectsRouteProps) {
  const resolvedParams = 'then' in params ? use(params) : params;
  return <ProjectPage workspaceId={resolvedParams.workspaceId} />;
}
