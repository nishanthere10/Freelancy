import { DashboardPage } from "@features/dashboard";

interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceDashboardRoute({ params }: PageProps) {
  const { workspaceId } = await params;
  return <DashboardPage workspaceId={workspaceId} />;
}
