'use client';

import { use } from 'react';
import { ClientPage } from '@features/client';

interface WorkspaceClientsRouteProps {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}

export default function WorkspaceClientsRoute({ params }: WorkspaceClientsRouteProps) {
  const resolvedParams = 'then' in params ? use(params) : params;
  return <ClientPage workspaceId={resolvedParams.workspaceId} />;
}
