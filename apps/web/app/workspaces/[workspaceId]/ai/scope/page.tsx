'use client';

import { use } from 'react';
import { ScopeAnalysisPage } from '@features/ai';

interface ScopeAnalysisRouteProps {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}

export default function ScopeAnalysisRoute({ params }: ScopeAnalysisRouteProps) {
  const resolvedParams = 'then' in params ? use(params) : params;
  return <ScopeAnalysisPage workspaceId={resolvedParams.workspaceId} />;
}
