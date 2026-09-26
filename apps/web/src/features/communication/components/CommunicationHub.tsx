"use client";

import { useState } from "react";
import { CommunicationThread } from "./CommunicationThread";
import { SendEmailModal } from "./SendEmailModal";
import { SendWhatsAppModal } from "./SendWhatsAppModal";
import {
  ChatsTeardrop,
  EnvelopeSimple,
  WhatsappLogo,
  PaperPlaneTilt,
  Plus,
} from "@phosphor-icons/react";

interface CommunicationHubProps {
  workspaceId: string;
}

export function CommunicationHub({ workspaceId }: CommunicationHubProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(
    undefined
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-hairline-soft)] shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFD02F] text-black shadow-xs">
              <ChatsTeardrop weight="fill" className="w-3.5 h-3.5" />
              COMMUNICATION HUB
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            Client Interactions & Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Centralized multi-channel messaging feed with automated delivery tracking.
          </p>
        </div>

        {/* Black-Pill and Outline-Pill CTAs */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setEmailModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-150 border border-[var(--color-hairline-strong)] bg-white text-[var(--color-ink)] hover:bg-zinc-50 shadow-xs h-10 px-5 py-2 active:scale-[0.98]"
          >
            <EnvelopeSimple weight="bold" className="w-4 h-4 text-zinc-700" />
            <span>Send Email</span>
          </button>
          <button
            onClick={() => setWaModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-150 bg-black text-white hover:bg-zinc-800 shadow-sm h-10 px-5 py-2 active:scale-[0.98]"
          >
            <WhatsappLogo weight="fill" className="w-4 h-4 text-emerald-400" />
            <span className="text-white">Send WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Pill Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedChannel(undefined)}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ${
            selectedChannel === undefined
              ? "bg-black text-white shadow-xs"
              : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          All Activity
        </button>
        <button
          onClick={() => setSelectedChannel("email")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ${
            selectedChannel === "email"
              ? "bg-black text-white shadow-xs"
              : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <EnvelopeSimple weight="bold" className="w-3.5 h-3.5" />
          <span>Email Only</span>
        </button>
        <button
          onClick={() => setSelectedChannel("whatsapp")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ${
            selectedChannel === "whatsapp"
              ? "bg-black text-white shadow-xs"
              : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <WhatsappLogo weight="fill" className="w-3.5 h-3.5 text-emerald-500" />
          <span>WhatsApp Only</span>
        </button>
      </div>

      {/* Activity Stream Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-hairline-soft)] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-hairline-soft)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Live Interaction Thread
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chronological log of automated and manual dispatches
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
            Realtime Sync
          </span>
        </div>

        <CommunicationThread
          workspaceId={workspaceId}
          channelFilter={selectedChannel}
        />
      </div>

      <SendEmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        workspaceId={workspaceId}
      />

      <SendWhatsAppModal
        open={waModalOpen}
        onOpenChange={setWaModalOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
}
