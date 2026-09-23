"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { automationApi } from "../api/automation.api";
import { useState } from "react";
import { CreateAutomationModal } from "./CreateAutomationModal";

export function AutomationCenter({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["automations", workspaceId],
    queryFn: () => automationApi.listAutomations(workspaceId),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => automationApi.activateAutomation(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => automationApi.pauseAutomation(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => automationApi.testAutomation(workspaceId, id),
    onSuccess: (result) => {
      alert(`Dry run successful!\n${JSON.stringify(result.data, null, 2)}`);
    },
  });

  const automations = Array.isArray(data) ? data : (data as any)?.data || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automation Center</h1>
          <p className="text-sm text-muted-foreground">
            Manage your automated workflows and background tasks.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          Create Automation
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p>Loading automations...</p>}
        {!isLoading && automations.length === 0 && (
          <p className="text-sm text-muted-foreground">No automations found. Create one to get started.</p>
        )}
        {automations.map((automation: any) => (
          <div key={automation.id} className="rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col">
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="font-semibold leading-none tracking-tight">{automation.name}</h3>
              <p className="text-sm text-muted-foreground">{automation.description}</p>
            </div>
            <div className="p-6 pt-0 mt-auto flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>Status:</span>
                <span className={`font-medium ${automation.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {automation.status.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                {automation.status !== 'active' ? (
                  <button
                    onClick={() => activateMutation.mutate(automation.id)}
                    className="flex-1 rounded-md bg-green-500 px-3 py-1.5 text-sm text-white hover:bg-green-600"
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    onClick={() => pauseMutation.mutate(automation.id)}
                    className="flex-1 rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-white hover:bg-yellow-600"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={() => testMutation.mutate(automation.id)}
                  className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Dry Run
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateAutomationModal
        workspaceId={workspaceId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (payload) => {
          if (!workspaceId || workspaceId === "undefined") {
            alert("Missing workspace ID.");
            return;
          }
          await automationApi.createAutomation(workspaceId, payload);
          queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}
