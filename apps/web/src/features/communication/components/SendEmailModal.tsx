"use client";

import { Button } from "@shared/components/Button";
import { Dialog, DialogContent } from "@shared/components/Dialog";
import { useState } from "react";
import { useSendEmail } from "../hooks/useCommunication";

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  clientId: string;
  projectId?: string;
  invoiceId?: string;
  changeOrderId?: string;
  defaultTemplateKey?: string;
  defaultVariables?: Record<string, unknown>;
}

export function SendEmailModal({
  open,
  onOpenChange,
  workspaceId,
  clientId,
  projectId,
  invoiceId,
  changeOrderId,
  defaultTemplateKey,
  defaultVariables,
}: SendEmailModalProps) {
  const [templateKey, setTemplateKey] = useState(defaultTemplateKey || "invoice.created");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");

  const sendEmailMutation = useSendEmail(workspaceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceId || workspaceId === "undefined" || !clientId || clientId === "undefined") {
      alert("Missing workspace or client ID.");
      return;
    }

    sendEmailMutation.mutate(
      {
        clientId,
        projectId,
        invoiceId,
        changeOrderId,
        templateKey,
        templateVariables: defaultVariables,
        idempotencyKey: `email-${Date.now()}`,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange} 
      title="Send Email" 
      description="Draft and send an email to your client."
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2 w-full">
            <label className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
              Template
            </label>
            <select
              className="w-full h-9 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
            >
              <option value="invoice.created">Invoice Created</option>
              <option value="invoice.due">Invoice Due</option>
              <option value="invoice.overdue">Invoice Overdue</option>
              <option value="payment.received">Payment Received</option>
              <option value="project.started">Project Started</option>
              <option value="project.progress">Project Progress</option>
              <option value="change_order.proposed">Change Order Proposed</option>
              <option value="change_order.approved">Change Order Approved</option>
            </select>
          </div>

          <p className="text-xs text-[var(--color-slate-text)] mb-4">
            The selected template will be rendered securely on the server with the associated client and project details.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={sendEmailMutation.isPending}>
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
