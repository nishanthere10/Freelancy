import { InvoicePage } from '@features/invoice';

export default function InvoicesDefaultRoute() {
  const defaultWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  return <InvoicePage workspaceId={defaultWorkspaceId} />;
}
