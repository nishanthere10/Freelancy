"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { automationApi } from "../api/automation.api";
import { useState } from "react";
import { CreateAutomationModal } from "./CreateAutomationModal";
import { Lightning, Play, Pause, Flask, Plus } from "@phosphor-icons/react";

export function AutomationCenter({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["automations", workspaceId],
    queryFn: () => automationApi.listAutomations(workspaceId),
    enabled: Boolean(workspaceId && workspaceId !== "undefined"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => automationApi.activateAutomation(workspaceId, id),
    onMutate: (id) => setActiveActionId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
    },
    onError: (err: any) => {
      alert(`Activation failed: ${err?.message || "Unknown error"}`);
    },
    onSettled: () => setActiveActionId(null),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => automationApi.pauseAutomation(workspaceId, id),
    onMutate: (id) => setActiveActionId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
    },
    onError: (err: any) => {
      alert(`Pause failed: ${err?.message || "Unknown error"}`);
    },
    onSettled: () => setActiveActionId(null),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => automationApi.testAutomation(workspaceId, id),
    onMutate: (id) => setActiveActionId(id),
    onSuccess: (result: any) => {
      alert(`Dry run successful!\n${JSON.stringify(result?.data || result, null, 2)}`);
    },
    onError: (err: any) => {
      alert(`Dry run failed: ${err?.message || "Unknown error"}`);
    },
    onSettled: () => setActiveActionId(null),
  });

  const automations = Array.isArray(data) ? data : (data as any)?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-900">
              <Lightning weight="bold" className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              Automation Center
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage automated event-driven workflows and client communications.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-150 bg-black text-white hover:bg-zinc-800 shadow-sm h-10 px-5 py-2.5 active:scale-[0.98]"
        >
          <Plus weight="bold" className="w-4 h-4 text-white" />
          <span className="text-white">Create Automation</span>
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Loading automation workflows...
          </div>
        )}
        {!isLoading && automations.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-[var(--color-hairline-soft)] rounded-2xl bg-[var(--color-surface-soft)]">
            <Lightning weight="duotone" className="w-10 h-10 mx-auto text-amber-500 mb-3" />
            <h3 className="font-semibold text-base text-[var(--color-ink)]">No automations found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Create your first automation rule to automatically send emails or WhatsApp messages when invoices or projects update.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold bg-black text-white hover:bg-zinc-800 shadow-sm px-4 py-2"
            >
              <Plus weight="bold" className="w-4 h-4 text-white" />
              <span className="text-white">Create Automation</span>
            </button>
          </div>
        )}
        {automations.map((automation: any) => {
          const isPending = activeActionId === automation.id;
          const isActive = automation.status === "active";

          return (
            <div
              key={automation.id}
              className="rounded-2xl border border-[var(--color-hairline-soft)] bg-[var(--color-surface-card)] text-card-foreground shadow-sm flex flex-col hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col space-y-2 p-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-[var(--color-ink)] leading-snug">
                    {automation.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {automation.status?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {automation.description || "Automated domain workflow rule"}
                </p>
              </div>

              <div className="p-6 pt-0 mt-auto flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs py-2 border-t border-[var(--color-hairline-soft)] text-muted-foreground">
                  <span>Trigger Event</span>
                  <span className="font-mono font-medium text-[var(--color-ink)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded">
                    {automation.triggerEvent || automation.trigger_event || "custom"}
                  </span>
                </div>

                <div className="flex gap-2">
                  {!isActive ? (
                    <button
                      disabled={isPending}
                      onClick={() => activateMutation.mutate(automation.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs"
                    >
                      <Play weight="bold" className="w-3.5 h-3.5 text-white" />
                      <span>{isPending ? "Activating..." : "Activate"}</span>
                    </button>
                  ) : (
                    <button
                      disabled={isPending}
                      onClick={() => pauseMutation.mutate(automation.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition shadow-xs"
                    >
                      <Pause weight="bold" className="w-3.5 h-3.5 text-white" />
                      <span>{isPending ? "Pausing..." : "Pause"}</span>
                    </button>
                  )}
                  <button
                    disabled={isPending}
                    onClick={() => testMutation.mutate(automation.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50 transition"
                  >
                    <Flask weight="bold" className="w-3.5 h-3.5 text-[var(--color-ink)]" />
                    <span>Dry Run</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
