import type { DashboardServiceData } from "./dashboard.types";

export function mapDashboardToResponse(data: DashboardServiceData) {
  return {
    workspaceId: data.workspaceId,
    overview: data.overview,
    invoiceSummary: data.invoiceSummary,
    overdueAlerts: data.overdueAlerts,
    upcomingDeadlines: data.upcomingDeadlines,
    recentInvoices: data.recentInvoices,
  };
}
