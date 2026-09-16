import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceIndexRoute({ params }: PageProps) {
  const { workspaceId } = await params;
  if (workspaceId) {
    redirect(`/workspaces/${workspaceId}/dashboard`);
  }
  redirect("/workspaces");
}
