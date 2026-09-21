"use client";

import { Skeleton } from "@shared/components/Skeleton";
import { useCommunicationMessages } from "../hooks/useCommunication";
import { MessageStatusBadge } from "./MessageStatusBadge";

interface CommunicationThreadProps {
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  invoiceId?: string;
}

export function CommunicationThread({
  workspaceId,
  clientId,
  projectId,
  invoiceId,
}: CommunicationThreadProps) {
  const { data: messages, isLoading, error } = useCommunicationMessages(
    workspaceId,
    { clientId, projectId, invoiceId }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4 bg-red-50 dark:bg-red-950/20 rounded-md">
        Failed to load communications.
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="text-sm text-[var(--color-slate-text)] italic p-4 text-center border border-dashed border-[var(--color-hairline)] rounded-md">
        No communication history yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => {
        const isOutbound = message.direction === "outbound";
        
        return (
          <div
            key={message.id}
            className={`flex flex-col ${
              isOutbound ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-[var(--radius-feature)] p-4 border ${
                isOutbound
                  ? "bg-[var(--color-surface)] border-[var(--color-hairline)]"
                  : "bg-[var(--color-canvas)] border-[var(--color-hairline)]"
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="text-xs font-semibold text-[var(--color-slate-text)] uppercase tracking-wider">
                  {message.channel === "email" ? "📧 Email" : "💬 WhatsApp"}
                </div>
                <MessageStatusBadge status={message.status} />
              </div>

              {message.subject && (
                <div className="font-medium text-sm text-[var(--color-ink)] mb-1">
                  {message.subject}
                </div>
              )}
              
              <div className="text-sm text-[var(--color-ink-deep)] whitespace-pre-wrap leading-relaxed">
                {message.bodyText}
              </div>

              <div className="mt-3 text-[10px] text-[var(--color-steel)] flex items-center gap-2">
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }).format(new Date(message.createdAt))}
                </span>
                {message.client?.name && (
                  <>
                    <span>•</span>
                    <span>{message.client.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
