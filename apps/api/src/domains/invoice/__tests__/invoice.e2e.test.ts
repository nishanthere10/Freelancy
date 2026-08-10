import express, { type Application } from "express";
import { beforeEach, describe, expect, it } from "vitest";
import { handleDomainError } from "../invoice.controller";
import { NullInvoiceEventEmitter } from "../invoice.events";
import { mapInvoiceToResponse, mapInvoicesToResponse } from "../invoice.mapper";
import {
  createInvoiceSchema,
  invoiceItemSchema,
  recordPaymentSchema,
  updateInvoiceSchema,
} from "../invoice.schema";
import type {
  CreateInvoiceInput,
  RecordPaymentInput,
  UpdateInvoiceInput,
} from "../invoice.schema";
import { InvoiceService } from "../invoice.service";
import { FakeInvoiceRepository } from "./mocks/invoice.repository.mock";

class FakeWorkspaceMemberRepository {
  async getByWorkspaceAndUser(workspaceId: string, userId: string) {
    return {
      id: `member-${userId}`,
      workspaceId,
      userId,
      role: "owner" as const,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      deletedAt: null,
    };
  }
}

class FakeClientRepository {
  async getById(id: string, workspaceId: string) {
    return {
      id,
      workspaceId,
      name: "Acme Corp",
      email: "billing@acme.com",
      phone: null,
      website: null,
      companyName: "Acme Corp",
      gstNumber: "27AAAAA0000A1Z5",
      contactPerson: null,
      department: null,
      address: null,
      city: null,
      state: null,
      postalCode: null,
      country: "IN",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user-1",
      updatedBy: "user-1",
      deletedAt: null,
    };
  }
}

describe("Invoice End-to-End HTTP Lifecycle Workflow", () => {
  let invoiceRepo: FakeInvoiceRepository;
  let service: InvoiceService;
  const workspaceId = "550e8400-e29b-41d4-a716-446655440000";
  const clientId = "c1000000-0000-0000-0000-000000000000";
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    invoiceRepo = new FakeInvoiceRepository();
    invoiceRepo.setClient(clientId, "Acme Corp");

    service = new InvoiceService(
      invoiceRepo as unknown as InvoiceRepository,
      new FakeWorkspaceMemberRepository() as unknown as WorkspaceMemberRepository,
      new FakeClientRepository() as unknown as ClientRepository,
      null,
      new NullInvoiceEventEmitter(),
    );
  });

  it("executes full E2E lifecycle: Create -> Get -> Update -> Send -> Pay -> Lock Check", async () => {
    // 1. Create Draft Invoice
    const createInput: CreateInvoiceInput = {
      clientId,
      taxRate: "18.00",
      discountRate: "10.00",
      notes: "Initial draft",
      items: [
        { description: "UI Design", quantity: "2.00", unitPrice: "500.00" },
      ],
    };

    const createRes = await service.createInvoice(
      createInput,
      workspaceId,
      userId,
    );
    expect(createRes.success).toBe(true);
    if (!createRes.success) return;

    const invoiceId = createRes.data.id;
    expect(createRes.data.status).toBe("draft");
    expect(createRes.data.subtotal).toBe("1000.00");
    expect(createRes.data.discountAmount).toBe("100.00");
    expect(createRes.data.taxableAmount).toBe("900.00");
    expect(createRes.data.taxAmount).toBe("162.00");
    expect(createRes.data.totalAmount).toBe("1062.00");

    // 2. Fetch Invoice Detail
    const getRes = await service.getInvoice(invoiceId, workspaceId, userId);
    expect(getRes.success).toBe(true);
    if (getRes.success) {
      expect(getRes.data.clientName).toBe("Acme Corp");
      expect(getRes.data.items).toHaveLength(1);
    }

    // 3. Update Draft Line Items
    const updateInput: UpdateInvoiceInput = {
      items: [
        { description: "UI Design", quantity: "2.00", unitPrice: "500.00" },
        {
          description: "API Integration",
          quantity: "1.00",
          unitPrice: "500.00",
        },
      ],
    };
    const updateRes = await service.updateInvoice(
      invoiceId,
      updateInput,
      workspaceId,
      userId,
    );
    expect(updateRes.success).toBe(true);
    if (updateRes.success) {
      // Subtotal = 1500, Discount 10% = 150, Taxable = 1350, Tax 18% = 243, Total = 1593
      expect(updateRes.data.subtotal).toBe("1500.00");
      expect(updateRes.data.totalAmount).toBe("1593.00");
      expect(updateRes.data.items).toHaveLength(2);
    }

    // 4. Issue/Send Invoice (Assign INV-2026-0001)
    const sendRes = await service.sendInvoice(
      invoiceId,
      {},
      workspaceId,
      userId,
    );
    expect(sendRes.success).toBe(true);
    if (sendRes.success) {
      expect(sendRes.data.status).toBe("sent");
      expect(sendRes.data.invoiceNumber).toBe(
        `INV-${new Date().getFullYear()}-0001`,
      );
      expect(sendRes.data.sequenceNumber).toBe(1);
    }

    // 5. Record Full Payment
    const payRes = await service.recordPayment(
      invoiceId,
      { amountPaid: "1593.00", paymentMethod: "bank_transfer" },
      workspaceId,
      userId,
    );
    expect(payRes.success).toBe(true);
    if (payRes.success) {
      expect(payRes.data.status).toBe("paid");
      expect(payRes.data.amountPaid).toBe("1593.00");
      expect(payRes.data.amountDue).toBe("0.00");
    }

    // 6. Verify Immutability Locks on Paid Invoice
    const editLock = await service.updateInvoice(
      invoiceId,
      { notes: "Hacked" },
      workspaceId,
      userId,
    );
    expect(editLock.success).toBe(false);
    if (!editLock.success) {
      expect(editLock.error.code).toBe("INVOICE_IMMUTABLE");
    }

    const deleteLock = await service.deleteInvoice(
      invoiceId,
      workspaceId,
      userId,
    );
    expect(deleteLock.success).toBe(false);
    if (!deleteLock.success) {
      expect(deleteLock.error.code).toBe("INVOICE_DRAFT_ONLY_DELETE");
    }
  });
});
