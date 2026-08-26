import { describe, expect, it } from "vitest";
import { ClientService } from "../../domains/client/client.service";
import { FakeInvoiceRepository } from "../../domains/invoice/__tests__/mocks/invoice.repository.mock";
import { InvoiceService } from "../../domains/invoice/invoice.service";
import { ProjectService } from "../../domains/project/project.service";
import {
  FakeClientRepository,
  FakeProjectRepository,
  FakeWorkspaceMemberRepository,
} from "./security-test.helpers";

describe("Security: Actor Identity Spoofing Immunity", () => {
  const wsId = "11111111-1111-1111-1111-111111111111";
  const legitimateActorId = "legit-user-uuid-1111";
  const spoofedActorId = "victim-admin-uuid-9999";

  const memberRepo = new FakeWorkspaceMemberRepository();
  const clientRepo = new FakeClientRepository();
  const projectRepo = new FakeProjectRepository();
  const invoiceRepo = new FakeInvoiceRepository();

  let capturedEvent: any = null;
  const testEmitter: any = {
    emit: (event: any) => {
      capturedEvent = event;
      return Promise.resolve();
    },
  };

  const clientService = new ClientService(
    clientRepo as any,
    memberRepo as any,
    testEmitter,
  );
  const projectService = new ProjectService(
    projectRepo as any,
    memberRepo as any,
    clientRepo as any,
    testEmitter,
  );
  const invoiceService = new InvoiceService(
    invoiceRepo as any,
    memberRepo as any,
    clientRepo as any,
    projectRepo as any,
    testEmitter,
  );

  memberRepo.setMember(wsId, legitimateActorId, "owner");

  it("ignores client-supplied actorId/userId in client creation", async () => {
    const maliciousBody: any = {
      name: "Forged Author Client",
      email: "forged@author.com",
      actorId: spoofedActorId,
      userId: spoofedActorId,
      createdBy: spoofedActorId,
      updatedBy: spoofedActorId,
    };

    const res = await clientService.createClient(
      maliciousBody,
      wsId,
      legitimateActorId,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.createdBy).toBe(legitimateActorId);
      expect(capturedEvent.actorId).toBe(legitimateActorId);
      expect(capturedEvent.actorId).not.toBe(spoofedActorId);
    }
  });

  it("ignores client-supplied updatedBy in client update", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Update Target Client",
      email: "update@target.com",
      createdBy: legitimateActorId,
    });

    const maliciousUpdate: any = {
      name: "Renamed Target Client",
      updatedBy: spoofedActorId,
      actorId: spoofedActorId,
    };

    const res = await clientService.updateClient(
      client.id,
      wsId,
      maliciousUpdate,
      legitimateActorId,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.updatedBy).toBe(legitimateActorId);
      expect(capturedEvent.actorId).toBe(legitimateActorId);
    }
  });

  it("ignores client-supplied actor claims in project creation", async () => {
    const maliciousBody: any = {
      name: "Forged Author Project",
      slug: "forged-project",
      actorId: spoofedActorId,
      createdBy: spoofedActorId,
    };

    const res = await projectService.createProject(
      maliciousBody,
      wsId,
      legitimateActorId,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.createdBy).toBe(legitimateActorId);
      expect(capturedEvent.actorId).toBe(legitimateActorId);
    }
  });

  it("ignores client-supplied actor claims in invoice creation", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Valid Client",
      email: "valid@client.com",
      createdBy: legitimateActorId,
    });

    const maliciousBody: any = {
      clientId: client.id,
      items: [
        { description: "Dev work", quantity: "1.00", unitPrice: "100.00" },
      ],
      actorId: spoofedActorId,
      createdBy: spoofedActorId,
      updatedBy: spoofedActorId,
    };

    const res = await invoiceService.createInvoice(
      maliciousBody,
      wsId,
      legitimateActorId,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.createdBy).toBe(legitimateActorId);
      expect(capturedEvent.actorId).toBe(legitimateActorId);
    }
  });

  it("ignores client-supplied actor claims in payment recording", async () => {
    const client = await clientRepo.create({
      workspaceId: wsId,
      name: "Payment Client",
      email: "payment@client.com",
      createdBy: legitimateActorId,
    });

    const invoice = await invoiceRepo.create({
      workspaceId: wsId,
      clientId: client.id,
      items: [
        {
          description: "Retainer",
          quantity: "1.00",
          unitPrice: "200.00",
          amount: "200.00",
          sortOrder: 0,
        },
      ],
      totalAmount: "200.00",
      amountPaid: "0.00",
      amountDue: "200.00",
      createdBy: legitimateActorId,
      updatedBy: legitimateActorId,
    });

    await invoiceService.sendInvoice(invoice.id, {}, wsId, legitimateActorId);

    const maliciousPayment: any = {
      amountPaid: "200.00",
      actorId: spoofedActorId,
      updatedBy: spoofedActorId,
    };

    const res = await invoiceService.recordPayment(
      invoice.id,
      maliciousPayment,
      wsId,
      legitimateActorId,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.updatedBy).toBe(legitimateActorId);
      expect(capturedEvent.actorId).toBe(legitimateActorId);
    }
  });
});
