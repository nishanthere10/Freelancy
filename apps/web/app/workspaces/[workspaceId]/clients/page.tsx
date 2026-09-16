import { ClientPage } from "@features/client";

interface WorkspaceClientsRouteProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceClientsRoute({
  params,
}: WorkspaceClientsRouteProps) {
  const { workspaceId } = await params;
  return <ClientPage workspaceId={workspaceId} />;
}
