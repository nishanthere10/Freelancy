import { ScopeAnalysisPage } from "@features/ai";

interface ScopeAnalysisRouteProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function ScopeAnalysisRoute({
  params,
}: ScopeAnalysisRouteProps) {
  const { workspaceId } = await params;
  return <ScopeAnalysisPage workspaceId={workspaceId} />;
}
