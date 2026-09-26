import { Sidebar } from "@shared/components/Sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  await params; // Ensure params is resolved for async server component

  return (
    <div className="flex-1 flex min-h-[calc(100vh-4rem)] bg-[var(--color-canvas)]">
      {/* Workspace Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
