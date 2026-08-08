import { ClientPage } from '@features/client';

export default function ClientsDefaultRoute() {
  // Default workspace ID matching backend mock auth
  const defaultWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  return <ClientPage workspaceId={defaultWorkspaceId} />;
}
