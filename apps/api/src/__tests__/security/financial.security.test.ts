import { describe, expect, it } from "vitest";
import { FakeInvoiceRepository } from "../../domains/invoice/__tests__/mocks/invoice.repository.mock";
import {
  InvoiceService,
  calculateInvoiceTotals,
} from "../../domains/invoice/invoice.service";
import {
  FakeClientRepository,
  FakeWorkspaceMemberRepository,
} from "./security-test.helpers";

describe("Security: Financial Operation Integrity & Replay Defense", () => {
  const wsId = "11111111-1111-1111-1111-111111111111";
  const actorId = "user-finance-1111";

  const memberRepo = new FakeWorkspaceMemberRepository();
  const clientRepo = new FakeClientRepository();
  const invoiceRepo = new FakeInvoiceRepository();
  const dummyEmitter: any = { emit: () => Promise.resolve() };

  const invoiceService = new InvoiceService(
    invoiceRepo as any,
    memberRepo as any,
    clientRepo as any,
    null,
    dummyEmitter,
  );

  memberRepo.setMember(wsId, actorId, "owner");

  it("accurately calculates financial totals without floating point precision drift", () => {
    const totals = calculateInvoiceTotals(
      [
        { description: "Design", quantity: "3.00", unitPrice: "33.33" },
        { description: "Consulting", quantity: "1.00", unitPrice: "100.01" },
      ],
      "10.00", // 10% discount
      "18.00", // 18% tax
    );

    // Subtotal: 3 * 33.33 = 99.99 + 100.01 = 200.00
    expect(totals.subtotal).toBe("200.00");
    // Discount: 10% of 200.00 = 20.00
    expect(totals.discountAmount).toBe("20.00");
    // Taxable: 200.00 - 20.00 = 180.00
    expect(totals.taxableAmount).toBe("180.00");
    // Tax: 18% of 180.00 = 32.40
    expect(totals.taxAmount).toBe("32.40");
    // Total: 180.00 + 32.40 = 212.40
    expect(totals.totalAmount).toBe("212.40");
    expect(totals.amountDue).toBe("212.40");
  });

  it("blocks overpayment exceeding remaining amount due", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Financial Client",
      email: "finance@client.com",
      createdBy: actorId,
    });

    const invoice = await invoiceRepo.create({
      workspaceId: wsId,
      clientId: client.id,
      items: [
        {
          description: "Retainer",
          quantity: "1.00",
          unitPrice: "1000.00",
          amount: "1000.00",
          sortOrder: 0,
        },
      ],
      totalAmount: "1000.00",
      amountPaid: "0.00",
      amountDue: "1000.00",
      createdBy: actorId,
      updatedBy: actorId,
    });

    // Send invoice so it becomes payable
    await invoiceService.sendInvoice(invoice.id, {}, wsId, actorId);

    // Attempt overpayment: paying 1500 on 1000 invoice
    const res = await invoiceService.recordPayment(
      invoice.id,
      { amountPaid: "1500.00" },
      wsId,
      actorId,
    );

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe("INVOICE_OVERPAYMENT");
    }
  });

  it("rejects payment on draft invoice", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Draft Client",
      email: "draft@client.com",
      createdBy: actorId,
    });

    const invoice = await invoiceRepo.create({
      workspaceId: wsId,
      clientId: client.id,
      items: [
        {
          description: "Item",
          quantity: "1.00",
          unitPrice: "500.00",
          amount: "500.00",
          sortOrder: 0,
        },
      ],
      totalAmount: "500.00",
      amountPaid: "0.00",
      amountDue: "500.00",
      createdBy: actorId,
      updatedBy: actorId,
    });

    // Invoice is still in 'draft' status
    const res = await invoiceService.recordPayment(
      invoice.id,
      { amountPaid: "500.00" },
      wsId,
      actorId,
    );

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe("INVOICE_INVALID_STATUS_TRANSITION");
    }
  });

  it("handles payment replay with matching paymentReference idempotently", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Idempotent Client",
      email: "idempotent@client.com",
      createdBy: actorId,
    });

    const invoice = await invoiceRepo.create({
      workspaceId: wsId,
      clientId: client.id,
      items: [
        {
          description: "Item",
          quantity: "1.00",
          unitPrice: "500.00",
          amount: "500.00",
          sortOrder: 0,
        },
      ],
      totalAmount: "500.00",
      amountPaid: "0.00",
      amountDue: "500.00",
      createdBy: actorId,
      updatedBy: actorId,
    });

    await invoiceService.sendInvoice(invoice.id, {}, wsId, actorId);

    // First payment succeeds
    const firstPayment = await invoiceService.recordPayment(
      invoice.id,
      { amountPaid: "500.00", paymentReference: "TXN_REPLAY_123" },
      wsId,
      actorId,
    );
    expect(firstPayment.success).toBe(true);

    // Replay same payment with same paymentReference
    const replayPayment = await invoiceService.recordPayment(
      invoice.id,
      { amountPaid: "500.00", paymentReference: "TXN_REPLAY_123" },
      wsId,
      actorId,
    );

    expect(replayPayment.success).toBe(true);
    if (replayPayment.success) {
      expect(replayPayment.data.amountPaid).toBe("500.00");
      expect(replayPayment.data.status).toBe("paid");
    }
  });

  it("rejects modifying line items on an issued/sent invoice", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Lock Client",
      email: "lock@client.com",
      createdBy: actorId,
    });

    const invoice = await invoiceRepo.create({
      workspaceId: wsId,
      clientId: client.id,
      items: [
        {
          description: "Initial Scope",
          quantity: "1.00",
          unitPrice: "800.00",
          amount: "800.00",
          sortOrder: 0,
        },
      ],
      totalAmount: "800.00",
      amountPaid: "0.00",
      amountDue: "800.00",
      createdBy: actorId,
      updatedBy: actorId,
    });

    await invoiceService.sendInvoice(invoice.id, {}, wsId, actorId);

    const updateRes = await invoiceService.updateInvoice(
      invoice.id,
      {
        items: [
          {
            description: "Modified Scope",
            quantity: "2.00",
            unitPrice: "800.00",
          },
        ],
      },
      wsId,
      actorId,
    );

    expect(updateRes.success).toBe(false);
    if (!updateRes.success) {
      expect(updateRes.error.code).toBe("INVOICE_IMMUTABLE");
    }
  });

  it("rejects deleting a sent or paid invoice", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Non-Deletable Client",
      email: "nodelete@client.com",
      createdBy: actorId,
    });

    const invoice = await invoiceRepo.create({
      workspaceId: wsId,
      clientId: client.id,
      items: [
        {
          description: "Service",
          quantity: "1.00",
          unitPrice: "300.00",
          amount: "300.00",
          sortOrder: 0,
        },
      ],
      totalAmount: "300.00",
      amountPaid: "0.00",
      amountDue: "300.00",
      createdBy: actorId,
      updatedBy: actorId,
    });

    await invoiceService.sendInvoice(invoice.id, {}, wsId, actorId);

    const deleteRes = await invoiceService.deleteInvoice(
      invoice.id,
      wsId,
      actorId,
    );
    expect(deleteRes.success).toBe(false);
    if (!deleteRes.success) {
      expect(deleteRes.error.code).toBe("INVOICE_DRAFT_ONLY_DELETE");
    }
  });

  it("rejects cancelling an already paid invoice", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Paid Client",
      email: "paid@client.com",
      createdBy: actorId,
    });

    const invoice = await invoiceRepo.create({
      workspaceId: wsId,
      clientId: client.id,
      items: [
        {
          description: "Service",
          quantity: "1.00",
          unitPrice: "400.00",
          amount: "400.00",
          sortOrder: 0,
        },
      ],
      totalAmount: "400.00",
      amountPaid: "0.00",
      amountDue: "400.00",
      createdBy: actorId,
      updatedBy: actorId,
    });

    await invoiceService.sendInvoice(invoice.id, {}, wsId, actorId);
    await invoiceService.recordPayment(
      invoice.id,
      { amountPaid: "400.00" },
      wsId,
      actorId,
    );

    const cancelRes = await invoiceService.cancelInvoice(
      invoice.id,
      wsId,
      actorId,
    );
    expect(cancelRes.success).toBe(false);
    if (!cancelRes.success) {
      expect(cancelRes.error.code).toBe("INVOICE_INVALID_STATUS_TRANSITION");
    }
  });
});
