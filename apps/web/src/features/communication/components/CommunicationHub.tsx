"use client";

import { Card } from "@shared/components/Card";
import { CommunicationThread } from "./CommunicationThread";
import { SendEmailModal } from "./SendEmailModal";
import { SendWhatsAppModal } from "./SendWhatsAppModal";
import { Button } from "@shared/components/Button";
import { useState } from "react";
import { useCommunicationMessages } from "../hooks/useCommunication";

interface CommunicationHubProps {
  workspaceId: string;
}

export function CommunicationHub({ workspaceId }: CommunicationHubProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);

  // Hardcoded for testing the UI. In a real scenario, this would be selected from a list of clients.
  const testClientId = "00000000-0000-0000-0000-000000000000";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink-deep)]">
            Communication Hub
          </h1>
          <p className="text-sm text-[var(--color-slate-text)] mt-1">
            Manage all client emails and WhatsApp messages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEmailModalOpen(true)}>
            Send Email
          </Button>
          <Button variant="primary" onClick={() => setWaModalOpen(true)}>
            Send WhatsApp
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-6 uppercase tracking-wider">
          Recent Activity
        </h2>
        <CommunicationThread workspaceId={workspaceId} />
      </Card>

      <SendEmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        workspaceId={workspaceId}
        clientId={testClientId}
      />

      <SendWhatsAppModal
        open={waModalOpen}
        onOpenChange={setWaModalOpen}
        workspaceId={workspaceId}
        clientId={testClientId}
      />
    </div>
  );
}
