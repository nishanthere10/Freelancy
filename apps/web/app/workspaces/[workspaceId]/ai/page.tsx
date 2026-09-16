import { ScopeAnalysisPage } from "@features/ai";

interface AiStudioRouteProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function AiStudioRoute({ params }: AiStudioRouteProps) {
  const { workspaceId } = await params;
  return <ScopeAnalysisPage workspaceId={workspaceId} />;
}
