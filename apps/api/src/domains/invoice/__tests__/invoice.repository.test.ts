import { beforeEach, describe, expect, it } from "vitest";
import { FakeInvoiceRepository } from "./mocks/invoice.repository.mock";

describe("FakeInvoiceRepository", () => {
  let repo: FakeInvoiceRepository;
  const workspaceId = "ws-1111-1111-1111-111111111111";
  const clientId = "client-2222-2222-2222-222222222222";
  const userId = "user-3333-3333-3333-333333333333";

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    repo.setClient(clientId, "Acme Corp");
  });

  it("creates draft invoice with line items", async () => {
    const invoice = await repo.create({
      workspaceId,
      clientId,
      subtotal: "1000.00",
      taxableAmount: "1000.00",
      taxRate: "18.00",
      taxAmount: "180.00",
      totalAmount: "1180.00",
      amountDue: "1180.00",
      createdBy: userId,
      updatedBy: userId,
      items: [
        { description: "Design Sprint", quantity: "1.00", unitPrice: "1000.00", amount: "1000.00", sortOrder: 0 },
      ],
    });

    expect(invoice.id).toBeDefined();
    expect(invoice.status).toBe("draft");
    expect(invoice.items).toHaveLength(1);
    expect(invoice.items[0].description).toBe("Design Sprint");
    expect(invoice.clientName).toBe("Acme Corp");
  });

  it("issues draft invoice with sequential number", async () => {
    const invoice = await repo.create({
      workspaceId,
      clientId,
      totalAmount: "500.00",
      createdBy: userId,
      updatedBy: userId,
      items: [{ description: "Consulting", quantity: "1.00", unitPrice: "500.00", amount: "500.00" }],
    });

    const seq = await repo.getNextSequenceNumber(workspaceId);
    expect(seq).toBe(1);

    const issued = await repo.issueInvoice(invoice.id, workspaceId, {
      invoiceNumber: "INV-2026-0001",
      sequenceNumber: seq,
      updatedBy: userId,
    });

    expect(issued.status).toBe("sent");
    expect(issued.invoiceNumber).toBe("INV-2026-0001");
    expect(issued.sequenceNumber).toBe(1);
  });

  it("prevents editing sent invoice", async () => {
    const invoice = await repo.create({
      workspaceId,
      clientId,
      totalAmount: "500.00",
      createdBy: userId,
      updatedBy: userId,
      items: [{ description: "Consulting", quantity: "1.00", unitPrice: "500.00", amount: "500.00" }],
    });

    await repo.issueInvoice(invoice.id, workspaceId, {
      invoiceNumber: "INV-2026-0001",
      sequenceNumber: 1,
      updatedBy: userId,
    });

    await expect(
      repo.update(invoice.id, workspaceId, { notes: "Updated notes", updatedBy: userId }),
    ).rejects.toThrow("locked");
  });

  it("records payment and transitions to paid status", async () => {
    const invoice = await repo.create({
      workspaceId,
      clientId,
      totalAmount: "1000.00",
      amountDue: "1000.00",
      createdBy: userId,
      updatedBy: userId,
      items: [{ description: "Work", quantity: "1.00", unitPrice: "1000.00", amount: "1000.00" }],
    });

    await repo.issueInvoice(invoice.id, workspaceId, {
      invoiceNumber: "INV-2026-0001",
      sequenceNumber: 1,
      updatedBy: userId,
    });

    const paid = await repo.recordPayment(invoice.id, workspaceId, {
      amountPaid: "1000.00",
      amountDue: "0.00",
      paymentMethod: "upi",
      paymentReference: "UPI-123456",
      updatedBy: userId,
    });

    expect(paid.status).toBe("paid");
    expect(paid.amountPaid).toBe("1000.00");
    expect(paid.amountDue).toBe("0.00");
  });

  it("prevents soft-deleting sent invoice", async () => {
    const invoice = await repo.create({
      workspaceId,
      clientId,
      totalAmount: "1000.00",
      createdBy: userId,
      updatedBy: userId,
      items: [{ description: "Work", quantity: "1.00", unitPrice: "1000.00", amount: "1000.00" }],
    });

    await repo.issueInvoice(invoice.id, workspaceId, {
      invoiceNumber: "INV-2026-0001",
      sequenceNumber: 1,
      updatedBy: userId,
    });

    await expect(repo.softDelete(invoice.id, workspaceId, userId)).rejects.toThrow("Only draft invoices can be deleted");
  });
});
