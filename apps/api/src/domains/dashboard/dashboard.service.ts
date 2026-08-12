import type { WorkspaceMemberRepository } from "../workspace/repository";
import type { DashboardRepository } from "./dashboard.repository";
import type { DashboardServiceData } from "./dashboard.types";

export type DashboardServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class DashboardService {
  constructor(
    private readonly dashboardRepo: DashboardRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
  ) {}

  /**
   * Fetch aggregated dashboard metrics for workspace
   */
  async getDashboardData(
    workspaceId: string,
    userId: string,
  ): Promise<DashboardServiceResult<DashboardServiceData>> {
    // Verify membership
    const member = await this.memberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!member || member.deletedAt) {
      return {
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "You are not a member of this workspace",
        },
      };
    }

    // Execute queries in parallel for performance
    const [invoiceData, projectData, totalClientsCount, recentInvoices] =
      await Promise.all([
        this.dashboardRepo.getInvoiceMetrics(workspaceId),
        this.dashboardRepo.getProjectMetrics(workspaceId),
        this.dashboardRepo.getClientCount(workspaceId),
        this.dashboardRepo.getRecentInvoices(workspaceId),
      ]);

    const serviceData: DashboardServiceData = {
      workspaceId,
      overview: {
        ...invoiceData.overview,
        activeProjectsCount: projectData.activeProjectsCount,
        totalClientsCount,
      },
      invoiceSummary: invoiceData.summary,
      overdueAlerts: invoiceData.overdueAlerts,
      upcomingDeadlines: projectData.upcomingDeadlines,
      recentInvoices,
    };

    return {
      success: true,
      data: serviceData,
    };
  }
}
