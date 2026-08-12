'use client';

import { use } from 'react';
import { DashboardPage } from '@features/dashboard';

interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspaceDashboardRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  return <DashboardPage workspaceId={resolvedParams.workspaceId} />;
}
