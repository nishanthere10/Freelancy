'use client';

import { use } from 'react';
import { useParams } from 'next/navigation';
import { DashboardPage } from '@features/dashboard';

interface PageProps {
  params?: Promise<{ workspaceId: string }> | { workspaceId: string };
}

export default function WorkspaceDashboardRoute({ params }: PageProps) {
  const routeParams = useParams();
  const resolvedWorkspaceId =
    (params && ('then' in params ? use(params).workspaceId : params.workspaceId)) ||
    (routeParams?.workspaceId as string);

  return <DashboardPage workspaceId={resolvedWorkspaceId} />;
}
