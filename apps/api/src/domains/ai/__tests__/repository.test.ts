import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../../../db/client", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { ScopeAnalysisRepository } from "../repository";

describe("ScopeAnalysisRepository", () => {
  let repository: ScopeAnalysisRepository;

  beforeEach(() => {
    repository = new ScopeAnalysisRepository();
    vi.clearAllMocks();
  });

  const mockRecord = {
    id: "scope-uuid-1111",
    workspaceId: "ws-uuid-2222",
    projectId: "proj-uuid-3333",
    actorUserId: "user-uuid-4444",
    inputText: "Build a modern e-commerce mobile app",
    result: {
      summary: "E-commerce app with checkout",
      estimatedHours: 80,
      phases: ["Design", "Dev", "QA"],
    },
    confirmedAt: null,
    createdAt: new Date("2026-08-30T10:00:00Z"),
    updatedAt: new Date("2026-08-30T10:00:00Z"),
  };

  it("creates a scope analysis record and returns generated UUID", async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockRecord]),
      }),
    });

    const result = await repository.create({
      workspaceId: "ws-uuid-2222",
      projectId: "proj-uuid-3333",
      actorUserId: "user-uuid-4444",
      inputText: "Build a modern e-commerce mobile app",
      result: {
        summary: "E-commerce app with checkout",
        estimatedHours: 80,
        phases: ["Design", "Dev", "QA"],
      },
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(result.id).toBe("scope-uuid-1111");
    expect(result.workspaceId).toBe("ws-uuid-2222");
    expect(result.inputText).toBe("Build a modern e-commerce mobile app");
    expect(result.result).toEqual({
      summary: "E-commerce app with checkout",
      estimatedHours: 80,
      phases: ["Design", "Dev", "QA"],
    });
  });

  it("finds scope analysis by id when workspaceId matches", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockRecord]),
      }),
    });

    const result = await repository.findById("scope-uuid-1111", "ws-uuid-2222");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("scope-uuid-1111");
    expect(result?.workspaceId).toBe("ws-uuid-2222");
  });

  it("enforces tenant isolation: returns null if queried with wrong workspaceId", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await repository.findById(
      "scope-uuid-1111",
      "different-workspace-id",
    );

    expect(result).toBeNull();
  });

  it("confirms a scope analysis and sets confirmedAt timestamp", async () => {
    const confirmedRecord = {
      ...mockRecord,
      confirmedAt: new Date("2026-08-30T11:00:00Z"),
      updatedAt: new Date("2026-08-30T11:00:00Z"),
    };

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([confirmedRecord]),
        }),
      }),
    });

    const result = await repository.confirm("scope-uuid-1111", "ws-uuid-2222");

    expect(result).not.toBeNull();
    expect(result?.confirmedAt).toEqual(new Date("2026-08-30T11:00:00Z"));
  });

  it("returns null when trying to confirm with an unmatching workspaceId", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await repository.confirm(
      "scope-uuid-1111",
      "wrong-workspace-id",
    );

    expect(result).toBeNull();
  });

  it("lists scope analyses for a workspace", async () => {
    const mockOrderBy = vi.fn().mockResolvedValue([mockRecord]);
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: mockOrderBy,
        }),
      }),
    });

    const results = await repository.listByWorkspace("ws-uuid-2222");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("scope-uuid-1111");
  });

  it("lists scope analyses with limit, offset, and projectId filter", async () => {
    const mockOffset = vi.fn().mockResolvedValue([mockRecord]);
    const mockLimit = vi.fn().mockReturnValue({
      offset: mockOffset,
    });
    const mockOrderBy = vi.fn().mockReturnValue({
      limit: mockLimit,
    });

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: mockOrderBy,
        }),
      }),
    });

    const results = await repository.listByWorkspace("ws-uuid-2222", {
      projectId: "proj-uuid-3333",
      limit: 10,
      offset: 5,
    });

    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(mockOffset).toHaveBeenCalledWith(5);
    expect(results).toHaveLength(1);
  });
});
