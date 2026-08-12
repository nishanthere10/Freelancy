import type { WorkspaceMember } from "@repo/database";
import { beforeEach, describe, expect, it } from "vitest";
import type { WorkspaceMemberRepository } from "../../workspace/repository";
import type { DashboardRepository } from "../dashboard.repository";
import { DashboardService } from "../dashboard.service";
import type {
  DashboardInvoiceSummaryData,
  DashboardOverviewData,
  OverdueAlertDto,
  RecentInvoiceDto,
  UpcomingDeadlineDto,
} from "../dashboard.types";

class FakeWorkspaceMemberRepository
  implements Partial<WorkspaceMemberRepository>
{
  private members: Map<string, WorkspaceMember> = new Map();

  addMember(member: WorkspaceMember) {
    this.members.set(`${member.workspaceId}:${member.userId}`, member);
  }

  async getByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.members.get(`${workspaceId}:${userId}`) || null;
  }
}

class FakeDashboardRepository implements Partial<DashboardRepository> {
  async getInvoiceMetrics(_workspaceId: string): Promise<{
    overview: Pick<
      DashboardOverviewData,
      "totalInvoiced" | "totalCollected" | "totalOutstanding" | "totalOverdue"
    >;
    summary: DashboardInvoiceSummaryData;
    overdueAlerts: OverdueAlertDto[];
  }> {
    return {
      overview: {
        totalInvoiced: { amount: 250000, currency: "INR" },
        totalCollected: { amount: 180000, currency: "INR" },
        totalOutstanding: { amount: 70000, currency: "INR" },
        totalOverdue: { amount: 25000, currency: "INR" },
      },
      summary: {
        draftCount: 2,
        sentCount: 3,
        paidCount: 12,
        overdueCount: 1,
        cancelledCount: 0,
      },
      overdueAlerts: [
        {
          id: "inv-1",
          invoiceNumber: "INV-2026-0001",
          clientName: "Acme Corp",
          amountDue: 25000,
          dueDate: "2026-08-01",
        },
      ],
    };
  }

  async getProjectMetrics(_workspaceId: string): Promise<{
    activeProjectsCount: number;
    upcomingDeadlines: UpcomingDeadlineDto[];
  }> {
    return {
      activeProjectsCount: 4,
      upcomingDeadlines: [
        {
          id: "proj-1",
          name: "E-Commerce Redesign",
          clientName: "Stark Industries",
          status: "active",
          targetDate: "2026-08-20",
          budgetAmount: 120000,
          budgetCurrency: "INR",
        },
      ],
    };
  }

  async getClientCount(_workspaceId: string): Promise<number> {
    return 8;
  }

  async getRecentInvoices(_workspaceId: string): Promise<RecentInvoiceDto[]> {
    return [
      {
        id: "inv-1",
        invoiceNumber: "INV-2026-0001",
        clientName: "Acme Corp",
        status: "overdue",
        totalAmount: 25000,
        amountDue: 25000,
        issueDate: "2026-07-15",
      },
    ];
  }
}

describe("DashboardService", () => {
  let service: DashboardService;
  let fakeMemberRepo: FakeWorkspaceMemberRepository;
  let fakeDashboardRepo: FakeDashboardRepository;

  const workspaceId = "550e8400-e29b-41d4-a716-446655440000";
  const userId = "550e8400-e29b-41d4-a716-446655440001";
  const unauthorizedUserId = "550e8400-e29b-41d4-a716-446655440099";

  beforeEach(() => {
    fakeMemberRepo = new FakeWorkspaceMemberRepository();
    fakeDashboardRepo = new FakeDashboardRepository();

    fakeMemberRepo.addMember({
      id: "mem-1",
      workspaceId,
      userId,
      role: "owner",
      joinedAt: new Date(),
      invitedBy: null,
      leftAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    service = new DashboardService(
      fakeDashboardRepo as unknown as DashboardRepository,
      fakeMemberRepo as unknown as WorkspaceMemberRepository,
    );
  });

  it("should return aggregated dashboard data for authorized member", async () => {
    const result = await service.getDashboardData(workspaceId, userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workspaceId).toBe(workspaceId);
      expect(result.data.overview.totalInvoiced.amount).toBe(250000);
      expect(result.data.overview.totalCollected.amount).toBe(180000);
      expect(result.data.overview.totalOutstanding.amount).toBe(70000);
      expect(result.data.overview.activeProjectsCount).toBe(4);
      expect(result.data.overview.totalClientsCount).toBe(8);
      expect(result.data.overdueAlerts.length).toBe(1);
      expect(result.data.upcomingDeadlines.length).toBe(1);
    }
  });

  it("should reject request for non-member user", async () => {
    const result = await service.getDashboardData(
      workspaceId,
      unauthorizedUserId,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });
});
