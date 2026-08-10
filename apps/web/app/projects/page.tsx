'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectPage } from '@features/project';
import { apiGet } from '@api/client';

interface Workspace {
  id: string;
}

export default function ProjectsDefaultRoute() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const workspaces = await apiGet<Workspace[]>('/workspaces');
        if (workspaces && workspaces.length > 0) {
          setWorkspaceId(workspaces[0].id);
        } else {
          router.push('/onboarding/workspace');
        }
      } catch (err) {
        console.error('Failed to load active workspace:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!workspaceId) return null;

  return <ProjectPage workspaceId={workspaceId} />;
}
