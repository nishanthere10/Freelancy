import { describe, expect, it, vi } from "vitest";
import { ActivityService } from "../activity.service";
import type { ActivityQueryFilters } from "../activity.types";
import type {
  ActivityEventWithActor,
  ActivityRepository,
} from "../repository/activity.repository";

describe("ActivityService", () => {
  const mockWorkspaceId = "11111111-1111-1111-1111-111111111111";
  const mockActorId = "22222222-2222-2222-2222-222222222222";
  const mockEventId = "33333333-3333-3333-3333-333333333333";

  const createMockRepo = (rows: ActivityEventWithActor[] = []) => {
    return {
      create: vi.fn(),
      listWithActors: vi.fn().mockResolvedValue(rows),
      countByWorkspace: vi.fn().mockResolvedValue(rows.length),
    } as unknown as ActivityRepository;
  };

  const createMockMemberRepo = (isMember = true) => {
    return {
      getByWorkspaceAndUser: vi.fn().mockResolvedValue(
        isMember
          ? {
              id: "mem-1",
              workspaceId: mockWorkspaceId,
              userId: mockActorId,
              role: "owner",
              deletedAt: null,
            }
          : null,
      ),
    } as any;
  };

  it("returns workspace activity for an authorized member", async () => {
    const mockRows: ActivityEventWithActor[] = [
      {
        event: {
          id: mockEventId,
          workspaceId: mockWorkspaceId,
          actorUserId: mockActorId,
          eventType: "client.created",
          entityType: "client",
          entityId: "client-1",
          metadata: { entityName: "Acme Corp" },
          createdAt: new Date("2026-08-19T10:00:00.000Z"),
        },
        actor: {
          id: mockActorId,
          email: "alex@example.com",
        },
      },
    ];

    const service = new ActivityService(
      createMockRepo(mockRows),
      createMockMemberRepo(true),
    );

    const result = await service.listWorkspaceActivity(
      mockWorkspaceId,
      mockActorId,
      { limit: 10 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].eventType).toBe("client.created");
      expect(result.data.items[0].message).toBe('Created client "Acme Corp"');
      expect(result.data.items[0].actor?.email).toBe("alex@example.com");
      expect(result.data.items[0].actor?.name).toBe("alex");
      expect(result.data.hasMore).toBe(false);
      expect(result.data.nextCursor).toBeNull();
    }
  });

  it("blocks non-members from viewing workspace activity", async () => {
    const service = new ActivityService(
      createMockRepo([]),
      createMockMemberRepo(false),
    );

    const result = await service.listWorkspaceActivity(
      mockWorkspaceId,
      "unauthorized-user-id",
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("handles pagination cursor correctly when more records exist", async () => {
    const mockRows: ActivityEventWithActor[] = [
      {
        event: {
          id: "evt-1",
          workspaceId: mockWorkspaceId,
          actorUserId: mockActorId,
          eventType: "invoice.paid",
          entityType: "invoice",
          entityId: "inv-1",
          metadata: { invoiceNumber: "INV-2026-0001", amount: 50000 },
          createdAt: new Date("2026-08-19T12:00:00.000Z"),
        },
        actor: { id: mockActorId, email: "john@example.com" },
      },
      {
        event: {
          id: "evt-2",
          workspaceId: mockWorkspaceId,
          actorUserId: mockActorId,
          eventType: "project.status_changed",
          entityType: "project",
          entityId: "proj-1",
          metadata: { entityName: "Alpha", toStatus: "completed" },
          createdAt: new Date("2026-08-19T11:00:00.000Z"),
        },
        actor: { id: mockActorId, email: "john@example.com" },
      },
      // 3rd item fetched (limit + 1)
      {
        event: {
          id: "evt-3",
          workspaceId: mockWorkspaceId,
          actorUserId: mockActorId,
          eventType: "workspace.created",
          entityType: "workspace",
          entityId: mockWorkspaceId,
          metadata: { entityName: "Alpha Corp" },
          createdAt: new Date("2026-08-19T10:00:00.000Z"),
        },
        actor: null,
      },
    ];

    const service = new ActivityService(
      createMockRepo(mockRows),
      createMockMemberRepo(true),
    );

    const result = await service.listWorkspaceActivity(
      mockWorkspaceId,
      mockActorId,
      { limit: 2 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBe("2026-08-19T11:00:00.000Z");
    }
  });

  it("formats messages for diverse event types properly", async () => {
    const mockRows: ActivityEventWithActor[] = [
      {
        event: {
          id: "1",
          workspaceId: mockWorkspaceId,
          actorUserId: null,
          eventType: "invoice.sent",
          entityType: "invoice",
          entityId: "inv-2",
          metadata: { invoiceNumber: "INV-2026-0042" },
          createdAt: new Date(),
        },
        actor: null,
      },
      {
        event: {
          id: "2",
          workspaceId: mockWorkspaceId,
          actorUserId: null,
          eventType: "workspace.member_added",
          entityType: "member",
          entityId: "user-9",
          metadata: { role: "editor" },
          createdAt: new Date(),
        },
        actor: null,
      },
    ];

    const service = new ActivityService(
      createMockRepo(mockRows),
      createMockMemberRepo(true),
    );

    const result = await service.listWorkspaceActivity(
      mockWorkspaceId,
      mockActorId,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].message).toBe("Sent invoice #INV-2026-0042");
      expect(result.data.items[1].message).toBe(
        "Added a new workspace member (editor)",
      );
    }
  });
});
