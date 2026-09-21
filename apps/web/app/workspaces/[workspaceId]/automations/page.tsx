import { Metadata } from "next";
import { AutomationCenter } from "@features/automation/components/AutomationCenter";

export const metadata: Metadata = {
  title: "Automation Center | Freelance OS",
  description: "Manage your automated workflows and background tasks",
};

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <AutomationCenter workspaceId={resolvedParams.workspaceId} />
    </div>
  );
}
