'use client';

import { use } from 'react';
import { ScopeAnalysisPage } from '@features/ai';

interface AiStudioRouteProps {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}

export default function AiStudioRoute({ params }: AiStudioRouteProps) {
  const resolvedParams = 'then' in params ? use(params) : params;
  return <ScopeAnalysisPage workspaceId={resolvedParams.workspaceId} />;
}
