'use client';

import { use } from 'react';
import { InvoicePage } from '@features/invoice';

interface WorkspaceInvoicesRouteProps {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}

export default function WorkspaceInvoicesRoute({ params }: WorkspaceInvoicesRouteProps) {
  const resolvedParams = 'then' in params ? use(params) : params;
  return <InvoicePage workspaceId={resolvedParams.workspaceId} />;
}
