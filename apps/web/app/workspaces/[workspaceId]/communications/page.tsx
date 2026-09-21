import { CommunicationHub } from "@features/communication/components/CommunicationHub";

interface CommunicationPageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

export default async function CommunicationPage({ params }: CommunicationPageProps) {
  const resolvedParams = await params;
  return (
    <div className="p-6 sm:p-8 w-full max-w-7xl mx-auto">
      <CommunicationHub workspaceId={resolvedParams.workspaceId} />
    </div>
  );
}
