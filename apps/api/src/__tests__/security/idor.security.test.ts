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

describe("Security: IDOR & Cross-Tenant Data Isolation", () => {
  const wsA = "11111111-1111-1111-1111-111111111111";
  const wsB = "22222222-2222-2222-2222-222222222222";
  const userA = "aaaa-aaaa-aaaa-aaaa";
  const userB = "bbbb-bbbb-bbbb-bbbb";

  // Setup mock repositories
  const memberRepo = new FakeWorkspaceMemberRepository();
  const clientRepo = new FakeClientRepository();
  const projectRepo = new FakeProjectRepository();
  const invoiceRepo = new FakeInvoiceRepository();

  const dummyEmitter: any = { emit: () => Promise.resolve() };

  const clientService = new ClientService(
    clientRepo as any,
    memberRepo as any,
    dummyEmitter,
  );
  const projectService = new ProjectService(
    projectRepo as any,
    memberRepo as any,
    clientRepo as any,
    dummyEmitter,
  );
  const invoiceService = new InvoiceService(
    invoiceRepo as any,
    memberRepo as any,
    clientRepo as any,
    projectRepo as any,
    dummyEmitter,
  );

  // Seed memberships: User A belongs to WS A, User B belongs to WS B
  memberRepo.setMember(wsA, userA, "owner");
  memberRepo.setMember(wsB, userB, "owner");

  describe("Client Domain Tenant Isolation", () => {
    it("prevents User B from accessing Client A via Workspace B IDOR attack", async () => {
      // Create Client in Workspace A
      const clientA = await clientRepo.create({
        workspaceId: wsA,
        name: "Acme Corp (Tenant A)",
        email: "contact@acme-a.com",
        createdBy: userA,
      });

      // User B attempts to read Client A via Workspace B context
      const getRes = await clientService.getClient(clientA.id, wsB, userB);
      expect(getRes.success).toBe(false);
      if (!getRes.success) {
        expect(getRes.error.code).toBe("CLIENT_NOT_FOUND");
      }

      // User B attempts to update Client A via Workspace B context
      const updateRes = await clientService.updateClient(
        clientA.id,
        wsB,
        { name: "Hacked Name" },
        userB,
      );
      expect(updateRes.success).toBe(false);
      if (!updateRes.success) {
        expect(updateRes.error.code).toBe("CLIENT_NOT_FOUND");
      }

      // User B attempts to delete Client A via Workspace B context
      const delRes = await clientService.deleteClient(clientA.id, wsB, userB);
      expect(delRes.success).toBe(false);
      if (!delRes.success) {
        expect(delRes.error.code).toBe("CLIENT_NOT_FOUND");
      }
    });

    it("prevents User B from accessing Workspace A even if using valid Client A ID", async () => {
      const clientA = await clientRepo.create({
        workspaceId: wsA,
        name: "Target Tenant A",
        email: "target@tenant-a.com",
        createdBy: userA,
      });

      // User B queries Workspace A directly
      const res = await clientService.getClient(clientA.id, wsA, userB);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe("CLIENT_PERMISSION_DENIED");
      }
    });
  });

  describe("Project Domain Tenant Isolation", () => {
    it("prevents User B from accessing Project A across workspaces", async () => {
      const projectA = await projectRepo.create({
        workspaceId: wsA,
        name: "Confidential Project A",
        slug: "confidential-a",
        createdBy: userA,
      });

      // User B attempts to get Project A in WS B
      const getRes = await projectService.getProject(projectA.id, wsB, userB);
      expect(getRes.success).toBe(false);
      if (!getRes.success) {
        expect(getRes.error.code).toBe("PROJECT_NOT_FOUND");
      }

      // User B attempts to mutate Project A status in WS B
      const statusRes = await projectService.changeProjectStatus(
        projectA.id,
        wsB,
        { status: "completed" },
        userB,
      );
      expect(statusRes.success).toBe(false);
      if (!statusRes.success) {
        expect(statusRes.error.code).toBe("PROJECT_NOT_FOUND");
      }
    });
  });

  describe("Invoice Domain Tenant Isolation", () => {
    it("prevents User B from reading or paying Invoice A", async () => {
      const clientA = await clientRepo.create({
        workspaceId: wsA,
        name: "Invoice Client A",
        email: "inv@client-a.com",
        createdBy: userA,
      });

      const invoiceA = await invoiceRepo.create({
        workspaceId: wsA,
        clientId: clientA.id,
        items: [
          {
            description: "Dev Services",
            quantity: "1.00",
            unitPrice: "5000.00",
            amount: "5000.00",
            sortOrder: 0,
          },
        ],
        totalAmount: "5000.00",
        amountPaid: "0.00",
        amountDue: "5000.00",
        createdBy: userA,
        updatedBy: userA,
      });

      // User B attempts to get Invoice A
      const getRes = await invoiceService.getInvoice(invoiceA.id, wsB, userB);
      expect(getRes.success).toBe(false);
      if (!getRes.success) {
        expect(getRes.error.code).toBe("INVOICE_NOT_FOUND");
      }

      // User B attempts to record payment on Invoice A
      const payRes = await invoiceService.recordPayment(
        invoiceA.id,
        { amountPaid: "5000.00" },
        wsB,
        userB,
      );
      expect(payRes.success).toBe(false);
      if (!payRes.success) {
        expect(payRes.error.code).toBe("INVOICE_NOT_FOUND");
      }
    });

    it("prevents creating an invoice in Workspace B with a clientId belonging to Workspace A", async () => {
      const clientA = await clientRepo.create({
        workspaceId: wsA,
        name: "Stolen Client A",
        email: "stolen@client-a.com",
        createdBy: userA,
      });

      // User B tries to link Client A to an invoice in Workspace B
      const createRes = await invoiceService.createInvoice(
        {
          clientId: clientA.id,
          items: [
            { description: "Line Item", quantity: "1.00", unitPrice: "100.00" },
          ],
        },
        wsB,
        userB,
      );

      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error.code).toBe("INVOICE_CLIENT_MISMATCH");
      }
    });
  });
});
