'use client';

import { use } from 'react';
import { useParams } from 'next/navigation';
import { ScopeAnalysisPage } from '@features/ai';

interface ScopeAnalysisRouteProps {
  params?: Promise<{ workspaceId: string }> | { workspaceId: string };
}

export default function ScopeAnalysisRoute({ params }: ScopeAnalysisRouteProps) {
  const routeParams = useParams();
  const resolvedWorkspaceId =
    (params && ('then' in params ? use(params).workspaceId : params.workspaceId)) ||
    (routeParams?.workspaceId as string);

  return <ScopeAnalysisPage workspaceId={resolvedWorkspaceId} />;
}
