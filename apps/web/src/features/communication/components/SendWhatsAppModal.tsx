"use client";

import { Button } from "@shared/components/Button";
import { Dialog, DialogContent } from "@shared/components/Dialog";
import { useState, useEffect } from "react";
import { useSendWhatsApp } from "../hooks/useCommunication";
import { useClients } from "../../client/hooks/useClients";
import { useProjects } from "../../project/hooks/useProjects";
import { useInvoices } from "../../invoice/hooks/useInvoices";

interface SendWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  invoiceId?: string;
  changeOrderId?: string;
  defaultTemplateKey?: string;
  defaultVariables?: Record<string, unknown>;
}

export function SendWhatsAppModal({
  open,
  onOpenChange,
  workspaceId,
  clientId: propClientId,
  projectId: propProjectId,
  invoiceId: propInvoiceId,
  changeOrderId,
  defaultTemplateKey,
  defaultVariables,
}: SendWhatsAppModalProps) {
  const { data: clientsData, isLoading: isClientsLoading } = useClients(workspaceId);
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects(workspaceId);
  const { data: invoicesData, isLoading: isInvoicesLoading } = useInvoices(workspaceId);

  const clients = Array.isArray(clientsData) ? clientsData : (clientsData as any)?.data || [];
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData as any)?.data || [];
  const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData as any)?.data || [];

  const [selectedClientId, setSelectedClientId] = useState(propClientId || "");
  const [selectedProjectId, setSelectedProjectId] = useState(propProjectId || "");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(propInvoiceId || "");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [templateKey, setTemplateKey] = useState(defaultTemplateKey || "invoice.created");
  const [messageText, setMessageText] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync selectedClientId when propClientId changes or when clients load
  useEffect(() => {
    if (propClientId) {
      setSelectedClientId(propClientId);
    } else if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [propClientId, clients, selectedClientId]);

  // Update recipient phone suggestion when client selection changes
  useEffect(() => {
    const matched = clients.find((c: any) => c.id === selectedClientId);
    if (matched?.phone) {
      setRecipientPhone(matched.phone);
    }
  }, [selectedClientId, clients]);

  const filteredProjects = selectedClientId
    ? projects.filter((p: any) => p.clientId === selectedClientId)
    : projects;

  const filteredInvoices = invoices.filter((inv: any) => {
    if (selectedClientId && inv.clientId !== selectedClientId) return false;
    if (selectedProjectId && inv.projectId !== selectedProjectId) return false;
    return true;
  });

  const sendWhatsAppMutation = useSendWhatsApp(workspaceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!workspaceId || workspaceId === "undefined") {
      setErrorMessage("Missing workspace ID.");
      return;
    }

    if (!selectedClientId) {
      setErrorMessage("Please select a valid client.");
      return;
    }

    const payload: any = {
      clientId: selectedClientId,
      projectId: selectedProjectId || undefined,
      invoiceId: selectedInvoiceId || undefined,
      changeOrderId: changeOrderId || undefined,
      recipientPhone: recipientPhone.trim() || undefined,
      idempotencyKey: `wa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    if (customMode) {
      if (!messageText.trim()) {
        setErrorMessage("Message text is required for custom WhatsApp messages.");
        return;
      }
      payload.messageText = messageText.trim();
    } else {
      payload.templateKey = templateKey;
      payload.templateVariables = defaultVariables;
    }

    sendWhatsAppMutation.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        setErrorMessage(null);
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to send WhatsApp message.";
        setErrorMessage(msg);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send WhatsApp"
      description="Send an instant WhatsApp message to your client."
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md">
              {errorMessage}
            </div>
          )}

          {/* Client Selection */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-9 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={Boolean(propClientId)}
            >
              {isClientsLoading && <option disabled>Loading clients...</option>}
              {!isClientsLoading && clients.length === 0 && (
                <option value="" disabled>No clients found in workspace</option>
              )}
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ""} — {c.phone || "No phone"}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Phone Override */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
              Recipient Phone (E.164 format, e.g. +1234567890)
            </label>
            <input
              type="tel"
              placeholder="+1234567890"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full h-9 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Project & Invoice association (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
                Related Project
              </label>
              <select
                className="w-full h-9 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">None</option>
                {filteredProjects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
                Related Invoice
              </label>
              <select
                className="w-full h-9 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
              >
                <option value="">None</option>
                {filteredInvoices.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switch: Template vs Custom */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-text)]">
              {customMode ? "Custom WhatsApp Text" : "Standard Template"}
            </span>
            <button
              type="button"
              onClick={() => setCustomMode(!customMode)}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              {customMode ? "Use predefined template" : "Write custom message"}
            </button>
          </div>

          {!customMode ? (
            <div className="flex flex-col gap-1.5 w-full">
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
              <p className="text-xs text-[var(--color-slate-text)] mt-1">
                The message will be formatted with markdown and sent via your WhatsApp gateway.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-[var(--color-ink-deep)] leading-none">
                WhatsApp Message Text <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Hello! Quick update regarding our project..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-2.5 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-hairline)]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={sendWhatsAppMutation.isPending || !selectedClientId}
            >
              {sendWhatsAppMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
