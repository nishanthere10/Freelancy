'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InvoicePage } from '@features/invoice';
import { useWorkspaces } from '@features/workspace/hooks';

export default function InvoicesDefaultRoute() {
  const router = useRouter();
  const { data: workspaces, isLoading, error } = useWorkspaces();

  useEffect(() => {
    if (!isLoading && workspaces) {
      if (workspaces.length === 0) {
        router.push('/onboarding/workspace');
      }
    }
  }, [isLoading, workspaces, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !workspaces || workspaces.length === 0) return null;

  return <InvoicePage workspaceId={workspaces[0].id} />;
}
