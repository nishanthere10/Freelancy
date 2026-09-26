"use client";

import { Skeleton } from "@shared/components/Skeleton";
import { useCommunicationMessages } from "../hooks/useCommunication";
import { MessageStatusBadge } from "./MessageStatusBadge";
import { EnvelopeSimple, WhatsappLogo, ArrowUpRight, ArrowDownLeft } from "@phosphor-icons/react";

interface CommunicationThreadProps {
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  invoiceId?: string;
  channelFilter?: string;
}

export function CommunicationThread({
  workspaceId,
  clientId,
  projectId,
  invoiceId,
  channelFilter,
}: CommunicationThreadProps) {
  const { data: messages, isLoading, error } = useCommunicationMessages(
    workspaceId,
    { clientId, projectId, invoiceId }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-2xl">
        Failed to load communication records. Please refresh or verify API connection.
      </div>
    );
  }

  const filteredMessages = channelFilter
    ? (messages || []).filter((m) => m.channel === channelFilter)
    : messages || [];

  if (filteredMessages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-12 text-center border-2 border-dashed border-[var(--color-hairline-soft)] rounded-2xl bg-[var(--color-surface-soft)]">
        <p className="font-semibold text-base text-[var(--color-ink)]">No communication records found</p>
        <p className="text-xs text-muted-foreground mt-1">
          {channelFilter
            ? `No ${channelFilter} interactions recorded yet.`
            : "Send an email, WhatsApp message, or trigger an automation rule to start the thread."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredMessages.map((message) => {
        const isOutbound = message.direction === "outbound";
        const isEmail = message.channel === "email";

        return (
          <div
            key={message.id}
            className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-5 border shadow-xs transition-all duration-150 ${
                isOutbound
                  ? isEmail
                    ? "bg-slate-50/90 border-slate-200/90 text-[var(--color-ink)]"
                    : "bg-emerald-50/80 border-emerald-200/90 text-emerald-950"
                  : "bg-white border-zinc-200 text-[var(--color-ink)]"
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-4 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                  {isEmail ? (
                    <span className="inline-flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      <EnvelopeSimple weight="bold" className="w-3.5 h-3.5" />
                      Email
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                      <WhatsappLogo weight="fill" className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp
                    </span>
                  )}
                  <span className="text-muted-foreground flex items-center gap-0.5 text-[11px] font-normal">
                    {isOutbound ? (
                      <>
                        <ArrowUpRight className="w-3 h-3 text-blue-500" /> Outbound
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> Inbound
                      </>
                    )}
                  </span>
                </div>
                <MessageStatusBadge status={message.status} />
              </div>

              {/* Subject (if Email) */}
              {message.subject && (
                <div className="font-bold text-sm text-[var(--color-ink)] mb-1.5">
                  {message.subject}
                </div>
              )}

              {/* Message Body */}
              <div className="text-sm text-[var(--color-ink-deep)] whitespace-pre-wrap leading-relaxed font-normal">
                {message.bodyText}
              </div>

              {/* Metadata Footer */}
              <div className="mt-3.5 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
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
                      <span className="font-semibold text-[var(--color-ink)]">{message.client.name}</span>
                    </>
                  )}
                </div>
                {message.idempotencyKey && (
                  <span className="font-mono text-[10px] text-muted-foreground/70 truncate max-w-[120px]" title={message.idempotencyKey}>
                    #{message.idempotencyKey.slice(0, 8)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
