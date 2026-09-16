import { InvoicePage } from "@features/invoice";

interface WorkspaceInvoicesRouteProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceInvoicesRoute({
  params,
}: WorkspaceInvoicesRouteProps) {
  const { workspaceId } = await params;
  return <InvoicePage workspaceId={workspaceId} />;
}
