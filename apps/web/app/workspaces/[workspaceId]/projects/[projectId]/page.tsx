import { ProjectDetailView } from "@features/project";

interface ProjectDetailPageProps {
  params: Promise<{ workspaceId: string; projectId: string }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { workspaceId, projectId } = await params;
  return <ProjectDetailView workspaceId={workspaceId} projectId={projectId} />;
}
