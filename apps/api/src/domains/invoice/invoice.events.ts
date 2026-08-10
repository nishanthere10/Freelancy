import type { InvoiceWithItems } from "./invoice.types";

export interface InvoiceDomainEventBase {
  readonly type: string;
  readonly invoiceId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly occurredAt: string;
}

export interface InvoiceCreatedEvent extends InvoiceDomainEventBase {
  readonly type: "invoice.created";
  readonly invoice: InvoiceWithItems;
}

export interface InvoiceUpdatedEvent extends InvoiceDomainEventBase {
  readonly type: "invoice.updated";
  readonly invoice: InvoiceWithItems;
}

export interface InvoiceSentEvent extends InvoiceDomainEventBase {
  readonly type: "invoice.sent";
  readonly invoice: InvoiceWithItems;
}

export interface InvoicePaidEvent extends InvoiceDomainEventBase {
  readonly type: "invoice.paid";
  readonly invoice: InvoiceWithItems;
}

export interface InvoiceCancelledEvent extends InvoiceDomainEventBase {
  readonly type: "invoice.cancelled";
  readonly invoice: InvoiceWithItems;
}

export interface InvoiceDeletedEvent extends InvoiceDomainEventBase {
  readonly type: "invoice.deleted";
  readonly invoiceId: string;
}

export type InvoiceDomainEvent =
  | InvoiceCreatedEvent
  | InvoiceUpdatedEvent
  | InvoiceSentEvent
  | InvoicePaidEvent
  | InvoiceCancelledEvent
  | InvoiceDeletedEvent;

export interface IInvoiceEventEmitter {
  emit(event: InvoiceDomainEvent): Promise<void>;
}

export class NullInvoiceEventEmitter implements IInvoiceEventEmitter {
  async emit(_event: InvoiceDomainEvent): Promise<void> {
    // No-op implementation for MVP
  }
}
