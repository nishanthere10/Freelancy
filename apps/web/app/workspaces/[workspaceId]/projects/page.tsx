import { ProjectPage } from "@features/project";

interface WorkspaceProjectsRouteProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceProjectsRoute({
  params,
}: WorkspaceProjectsRouteProps) {
  const { workspaceId } = await params;
  return <ProjectPage workspaceId={workspaceId} />;
}
