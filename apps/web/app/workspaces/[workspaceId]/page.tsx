'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function WorkspaceIndexRoute() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params?.workspaceId as string | undefined;

  useEffect(() => {
    if (workspaceId) {
      router.replace(`/workspaces/${workspaceId}/dashboard`);
    } else {
      router.replace('/workspaces');
    }
  }, [workspaceId, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  );
}
