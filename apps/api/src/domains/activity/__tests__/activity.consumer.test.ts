import { describe, expect, it, vi } from "vitest";
import {
  ActivityEventConsumer,
  ClientEventEmitterAdapter,
  InvoiceEventEmitterAdapter,
  ProjectEventEmitterAdapter,
} from "../activity.consumer";
import type { ActivityRepository } from "../repository/activity.repository";

describe("ActivityEventConsumer", () => {
  const mockWorkspaceId = "11111111-1111-1111-1111-111111111111";
  const mockActorId = "22222222-2222-2222-2222-222222222222";

  it("ingests client.created event and persists to repository", async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: "evt-1" }),
    } as unknown as ActivityRepository;

    const consumer = new ActivityEventConsumer(mockRepo);
    const adapter = new ClientEventEmitterAdapter(consumer);

    await adapter.emit({
      type: "client.created",
      clientId: "client-1",
      workspaceId: mockWorkspaceId,
      actorId: mockActorId,
      occurredAt: "2026-08-19T10:00:00.000Z",
      client: {
        id: "client-1",
        workspaceId: mockWorkspaceId,
        name: "Acme Corp",
        email: "contact@acme.com",
        companyName: "Acme Industries",
        status: "active",
      } as any,
    });

    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: mockWorkspaceId,
        actorUserId: mockActorId,
        eventType: "client.created",
        entityType: "client",
        entityId: "client-1",
        metadata: {
          entityName: "Acme Corp",
          companyName: "Acme Industries",
          email: "contact@acme.com",
        },
      }),
    );
  });

  it("ingests project.status_changed event and persists with from/to status", async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: "evt-2" }),
    } as unknown as ActivityRepository;

    const consumer = new ActivityEventConsumer(mockRepo);
    const adapter = new ProjectEventEmitterAdapter(consumer);

    await adapter.emit({
      type: "project.status_changed",
      projectId: "proj-1",
      workspaceId: mockWorkspaceId,
      actorId: mockActorId,
      occurredAt: "2026-08-19T11:00:00.000Z",
      fromStatus: "draft",
      toStatus: "active",
      project: {
        id: "proj-1",
        name: "Website Redesign",
        status: "active",
      } as any,
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "project.status_changed",
        entityType: "project",
        entityId: "proj-1",
        metadata: expect.objectContaining({
          entityName: "Website Redesign",
          fromStatus: "draft",
          toStatus: "active",
        }),
      }),
    );
  });

  it("ingests invoice.paid event and persists with financial metadata", async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: "evt-3" }),
    } as unknown as ActivityRepository;

    const consumer = new ActivityEventConsumer(mockRepo);
    const adapter = new InvoiceEventEmitterAdapter(consumer);

    await adapter.emit({
      type: "invoice.paid",
      invoiceId: "inv-1",
      workspaceId: mockWorkspaceId,
      actorId: mockActorId,
      occurredAt: "2026-08-19T12:00:00.000Z",
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-2026-0099",
        totalAmount: "125000.00",
        currency: "INR",
        status: "paid",
        items: [],
      } as any,
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "invoice.paid",
        entityType: "invoice",
        entityId: "inv-1",
        metadata: {
          invoiceNumber: "INV-2026-0099",
          amount: "125000.00",
          currency: "INR",
          status: "paid",
        },
      }),
    );
  });

  it("handles persistence errors fail-safely without throwing", async () => {
    const mockRepo = {
      create: vi.fn().mockRejectedValue(new Error("DB connection timeout")),
    } as unknown as ActivityRepository;

    const consumer = new ActivityEventConsumer(mockRepo);
    const adapter = new ClientEventEmitterAdapter(consumer);

    // Should resolve without throwing unhandled error
    await expect(
      adapter.emit({
        type: "client.deleted",
        clientId: "client-1",
        workspaceId: mockWorkspaceId,
        actorId: mockActorId,
        occurredAt: "2026-08-19T10:00:00.000Z",
        client: { id: "client-1", name: "Acme" } as any,
      }),
    ).resolves.not.toThrow();
  });
});
