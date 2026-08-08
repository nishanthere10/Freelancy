import { ClientPage } from '@features/client';

export default function WorkspaceClientsRoute({
  params,
}: {
  params: { workspaceId: string };
}) {
  return <ClientPage workspaceId={params.workspaceId} />;
}
