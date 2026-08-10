'use client';

import { InvoicePage } from './InvoicePage';

interface InvoicesRouteProps {
  workspaceId: string;
}

export function InvoicesRoute({ workspaceId }: InvoicesRouteProps) {
  return <InvoicePage workspaceId={workspaceId} />;
}
