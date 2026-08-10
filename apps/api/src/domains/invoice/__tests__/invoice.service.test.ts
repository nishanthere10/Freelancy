import type { Client, WorkspaceMember, WorkspaceRole } from "@repo/database";
import { beforeEach, describe, expect, it } from "vitest";
import type { WorkspaceMemberRepository } from "../../workspace/repository";
import {
  InvoiceClientMismatchError,
  InvoiceDraftOnlyDeleteError,
  InvoiceImmutableError,
  InvoiceInvalidStatusTransitionError,
  InvoiceNotFoundError,
  InvoicePermissionDeniedError,
} from "../invoice.errors";
import type {
  IInvoiceEventEmitter,
  InvoiceDomainEvent,
} from "../invoice.events";
import {
  InvoiceService,
  calculateInvoiceTotals,
  generateInvoiceNumber,
} from "../invoice.service";
import { FakeInvoiceRepository } from "./mocks/invoice.repository.mock";

class FakeWorkspaceMemberRepository
  implements Partial<WorkspaceMemberRepository>
{
  private members: Map<string, WorkspaceMember> = new Map();

  setMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    const key = `${workspaceId}:${userId}`;
    this.members.set(key, {
      id: `member-${userId}`,
      workspaceId,
      userId,
      role,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      deletedAt: null,
    });
  }

  async getByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.members.get(`${workspaceId}:${userId}`) || null;
  }
}

class FakeClientRepository {
  private clients: Map<string, Client> = new Map();

  setClient(client: Client) {
    this.clients.set(client.id, client);
  }

  async getById(id: string, workspaceId: string): Promise<Client | null> {
    const client = this.clients.get(id);
    if (!client || client.workspaceId !== workspaceId || client.deletedAt)
      return null;
    return client;
  }
}

class TestInvoiceEventEmitter implements IInvoiceEventEmitter {
  public emittedEvents: InvoiceDomainEvent[] = [];

  async emit(event: InvoiceDomainEvent): Promise<void> {
    this.emittedEvents.push(event);
  }
}

describe("InvoiceService & Financial Pipeline", () => {
  let invoiceRepo: FakeInvoiceRepository;
  let memberRepo: FakeWorkspaceMemberRepository;
  let clientRepo: FakeClientRepository;
  let eventEmitter: TestInvoiceEventEmitter;
  let service: InvoiceService;

  const workspaceId = "ws-1000-1000-1000-100000000000";
  const clientId = "client-2000-2000-2000-200000000000";
  const ownerId = "user-owner-000000000001";
  const editorId = "user-editor-000000000002";
  const viewerId = "user-viewer-000000000003";

  beforeEach(() => {
    invoiceRepo = new FakeInvoiceRepository();
    memberRepo = new FakeWorkspaceMemberRepository();
    clientRepo = new FakeClientRepository();
    eventEmitter = new TestInvoiceEventEmitter();

    memberRepo.setMember(workspaceId, ownerId, "owner");
    memberRepo.setMember(workspaceId, editorId, "editor");
    memberRepo.setMember(workspaceId, viewerId, "viewer");

    const now = new Date();
    clientRepo.setClient({
      id: clientId,
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
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
      deletedAt: null,
    });
    invoiceRepo.setClient(clientId, "Acme Corp");

    service = new InvoiceService(
      invoiceRepo as unknown as InvoiceRepository,
      memberRepo as unknown as WorkspaceMemberRepository,
      clientRepo as unknown as ClientRepository,
      null,
      eventEmitter,
    );
  });

  describe("calculateInvoiceTotals", () => {
    it("calculates exact GST tax, subtotal, and total amount", () => {
      const totals = calculateInvoiceTotals(
        [
          {
            description: "Development",
            quantity: "10.00",
            unitPrice: "100.00",
          },
          { description: "Hosting", quantity: "1.00", unitPrice: "500.00" },
        ],
        "10.00", // 10% discount
        "18.00", // 18% GST
      );

      // Subtotal = 1000 + 500 = 1500.00
      expect(totals.subtotal).toBe("1500.00");
      // Discount = 1500 * 0.10 = 150.00
      expect(totals.discountAmount).toBe("150.00");
      // Taxable = 1500 - 150 = 1350.00
      expect(totals.taxableAmount).toBe("1350.00");
      // Tax = 1350 * 0.18 = 243.00
      expect(totals.taxAmount).toBe("243.00");
      // Total = 1350 + 243 = 1593.00
      expect(totals.totalAmount).toBe("1593.00");
    });
  });

  describe("createInvoice", () => {
    it("allows editor to create draft invoice with calculated financial totals", async () => {
      const result = await service.createInvoice(
        {
          clientId,
          taxRate: "18.00",
          items: [
            {
              description: "Consulting",
              quantity: "5.00",
              unitPrice: "200.00",
            },
          ],
        },
        workspaceId,
        editorId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("draft");
        expect(result.data.subtotal).toBe("1000.00");
        expect(result.data.taxAmount).toBe("180.00");
        expect(result.data.totalAmount).toBe("1180.00");
        expect(result.data.amountDue).toBe("1180.00");
      }

      expect(eventEmitter.emittedEvents).toHaveLength(1);
      expect(eventEmitter.emittedEvents[0].type).toBe("invoice.created");
    });

    it("denies viewer from creating invoice", async () => {
      const result = await service.createInvoice(
        {
          clientId,
          items: [
            { description: "Design", quantity: "1.00", unitPrice: "100.00" },
          ],
        },
        workspaceId,
        viewerId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(InvoicePermissionDeniedError);
      }
    });

    it("returns error if client does not exist in workspace", async () => {
      const result = await service.createInvoice(
        {
          clientId: "00000000-0000-0000-0000-000000000000",
          items: [
            { description: "Design", quantity: "1.00", unitPrice: "100.00" },
          ],
        },
        workspaceId,
        editorId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(InvoiceClientMismatchError);
      }
    });
  });

  describe("sendInvoice (Issue)", () => {
    it("issues draft invoice with sequential number INV-2026-0001", async () => {
      const createRes = await service.createInvoice(
        {
          clientId,
          items: [
            {
              description: "Milestone 1",
              quantity: "1.00",
              unitPrice: "5000.00",
            },
          ],
        },
        workspaceId,
        editorId,
      );
      expect(createRes.success).toBe(true);
      if (!createRes.success) return;

      const sendRes = await service.sendInvoice(
        createRes.data.id,
        {},
        workspaceId,
        editorId,
      );
      expect(sendRes.success).toBe(true);
      if (sendRes.success) {
        expect(sendRes.data.status).toBe("sent");
        expect(sendRes.data.invoiceNumber).toBe(
          `INV-${new Date().getFullYear()}-0001`,
        );
        expect(sendRes.data.sequenceNumber).toBe(1);
      }

      const sentEvent = eventEmitter.emittedEvents.find(
        (e) => e.type === "invoice.sent",
      );
      expect(sentEvent).toBeDefined();
    });

    it("prevents sending an invoice that is already sent", async () => {
      const createRes = await service.createInvoice(
        {
          clientId,
          items: [
            {
              description: "Milestone 1",
              quantity: "1.00",
              unitPrice: "1000.00",
            },
          ],
        },
        workspaceId,
        editorId,
      );
      if (!createRes.success) return;

      await service.sendInvoice(createRes.data.id, {}, workspaceId, editorId);
      const resend = await service.sendInvoice(
        createRes.data.id,
        {},
        workspaceId,
        editorId,
      );

      expect(resend.success).toBe(false);
      if (!resend.success) {
        expect(resend.error).toBeInstanceOf(
          InvoiceInvalidStatusTransitionError,
        );
      }
    });
  });

  describe("updateInvoice (Immutability)", () => {
    it("prevents updating a sent invoice", async () => {
      const createRes = await service.createInvoice(
        {
          clientId,
          items: [
            { description: "Sprint 1", quantity: "1.00", unitPrice: "1000.00" },
          ],
        },
        workspaceId,
        editorId,
      );
      if (!createRes.success) return;

      await service.sendInvoice(createRes.data.id, {}, workspaceId, editorId);

      const updateRes = await service.updateInvoice(
        createRes.data.id,
        { notes: "New terms" },
        workspaceId,
        editorId,
      );

      expect(updateRes.success).toBe(false);
      if (!updateRes.success) {
        expect(updateRes.error).toBeInstanceOf(InvoiceImmutableError);
      }
    });
  });

  describe("recordPayment", () => {
    it("records full payment and transitions to paid state", async () => {
      const createRes = await service.createInvoice(
        {
          clientId,
          taxRate: "0.00",
          items: [
            { description: "Sprint 1", quantity: "1.00", unitPrice: "1000.00" },
          ],
        },
        workspaceId,
        editorId,
      );
      if (!createRes.success) return;

      const invoiceId = createRes.data.id;
      await service.sendInvoice(invoiceId, {}, workspaceId, editorId);

      const payRes = await service.recordPayment(
        invoiceId,
        {
          amountPaid: "1000.00",
          paymentMethod: "bank_transfer",
          paymentReference: "UTR98765",
        },
        workspaceId,
        editorId,
      );

      expect(payRes.success).toBe(true);
      if (payRes.success) {
        expect(payRes.data.status).toBe("paid");
        expect(payRes.data.amountPaid).toBe("1000.00");
        expect(payRes.data.amountDue).toBe("0.00");
      }

      const paidEvent = eventEmitter.emittedEvents.find(
        (e) => e.type === "invoice.paid",
      );
      expect(paidEvent).toBeDefined();
    });
  });

  describe("deleteInvoice", () => {
    it("allows owner to soft-delete draft invoice", async () => {
      const createRes = await service.createInvoice(
        {
          clientId,
          items: [
            {
              description: "Draft Task",
              quantity: "1.00",
              unitPrice: "100.00",
            },
          ],
        },
        workspaceId,
        editorId,
      );
      if (!createRes.success) return;

      const deleteRes = await service.deleteInvoice(
        createRes.data.id,
        workspaceId,
        ownerId,
      );
      expect(deleteRes.success).toBe(true);
    });

    it("prevents editor from soft-deleting draft invoice (Owner required)", async () => {
      const createRes = await service.createInvoice(
        {
          clientId,
          items: [
            {
              description: "Draft Task",
              quantity: "1.00",
              unitPrice: "100.00",
            },
          ],
        },
        workspaceId,
        editorId,
      );
      if (!createRes.success) return;

      const deleteRes = await service.deleteInvoice(
        createRes.data.id,
        workspaceId,
        editorId,
      );
      expect(deleteRes.success).toBe(false);
      if (!deleteRes.success) {
        expect(deleteRes.error).toBeInstanceOf(InvoicePermissionDeniedError);
      }
    });

    it("prevents soft-deleting a sent invoice", async () => {
      const createRes = await service.createInvoice(
        {
          clientId,
          items: [
            { description: "Task", quantity: "1.00", unitPrice: "100.00" },
          ],
        },
        workspaceId,
        editorId,
      );
      if (!createRes.success) return;

      await service.sendInvoice(createRes.data.id, {}, workspaceId, editorId);

      const deleteRes = await service.deleteInvoice(
        createRes.data.id,
        workspaceId,
        ownerId,
      );
      expect(deleteRes.success).toBe(false);
      if (!deleteRes.success) {
        expect(deleteRes.error).toBeInstanceOf(InvoiceDraftOnlyDeleteError);
      }
    });
  });
});
