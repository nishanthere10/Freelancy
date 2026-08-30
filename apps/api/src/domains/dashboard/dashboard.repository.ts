import { clientsTable, invoicesTable, projectsTable } from "@repo/database";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { db } from "../../db/client";
import type {
  DashboardInvoiceSummaryData,
  DashboardOverviewData,
  OverdueAlertDto,
  RecentInvoiceDto,
  UpcomingDeadlineDto,
} from "./dashboard.types";

export class DashboardRepository {
  /**
   * Aggregate financial metrics & invoice counts for workspace
   */
  async getInvoiceMetrics(workspaceId: string): Promise<{
    overview: Pick<
      DashboardOverviewData,
      "totalInvoiced" | "totalCollected" | "totalOutstanding" | "totalOverdue"
    >;
    summary: DashboardInvoiceSummaryData;
    overdueAlerts: OverdueAlertDto[];
  }> {
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Single database aggregation query for all financial sums and status counts
    const [metricsResult] = await db
      .select({
        totalInvoiced: sql<string>`COALESCE(SUM(CASE WHEN ${invoicesTable.status} != 'cancelled' THEN ${invoicesTable.totalAmount} ELSE 0 END), 0)::text`,
        totalCollected: sql<string>`COALESCE(SUM(CASE WHEN ${invoicesTable.status} != 'cancelled' THEN ${invoicesTable.amountPaid} ELSE 0 END), 0)::text`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN ${invoicesTable.status} IN ('sent', 'overdue') THEN ${invoicesTable.amountDue} ELSE 0 END), 0)::text`,
        totalOverdue: sql<string>`COALESCE(SUM(CASE WHEN ${invoicesTable.status} = 'overdue' OR (${invoicesTable.status} = 'sent' AND ${invoicesTable.dueDate} IS NOT NULL AND ${invoicesTable.dueDate} < ${todayStr}::date) THEN ${invoicesTable.amountDue} ELSE 0 END), 0)::text`,
        draftCount: sql<number>`COUNT(CASE WHEN ${invoicesTable.status} = 'draft' THEN 1 END)::int`,
        paidCount: sql<number>`COUNT(CASE WHEN ${invoicesTable.status} = 'paid' THEN 1 END)::int`,
        cancelledCount: sql<number>`COUNT(CASE WHEN ${invoicesTable.status} = 'cancelled' THEN 1 END)::int`,
        overdueCount: sql<number>`COUNT(CASE WHEN ${invoicesTable.status} = 'overdue' OR (${invoicesTable.status} = 'sent' AND ${invoicesTable.dueDate} IS NOT NULL AND ${invoicesTable.dueDate} < ${todayStr}::date) THEN 1 END)::int`,
        sentCount: sql<number>`COUNT(CASE WHEN ${invoicesTable.status} = 'sent' AND (${invoicesTable.dueDate} IS NULL OR ${invoicesTable.dueDate} >= ${todayStr}::date) THEN 1 END)::int`,
        currency: sql<string>`COALESCE(MAX(${invoicesTable.currency}), 'INR')`,
      })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
        ),
      );

    // 2. Optimized query for top 5 overdue invoice alerts with joined client name
    const overdueInvoices = await db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        amountDue: invoicesTable.amountDue,
        dueDate: invoicesTable.dueDate,
        clientName: clientsTable.name,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
      .where(
        and(
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
          sql`(${invoicesTable.status} = 'overdue' OR (${invoicesTable.status} = 'sent' AND ${invoicesTable.dueDate} IS NOT NULL AND ${invoicesTable.dueDate} < ${todayStr}::date))`,
        ),
      )
      .orderBy(asc(invoicesTable.dueDate), desc(invoicesTable.createdAt))
      .limit(5);

    const overdueAlerts: OverdueAlertDto[] = overdueInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName || "Client",
      amountDue: Number(inv.amountDue || 0),
      dueDate: inv.dueDate,
    }));

    const currency = metricsResult?.currency || "INR";

    return {
      overview: {
        totalInvoiced: {
          amount: Number(metricsResult?.totalInvoiced || 0),
          currency,
        },
        totalCollected: {
          amount: Number(metricsResult?.totalCollected || 0),
          currency,
        },
        totalOutstanding: {
          amount: Number(metricsResult?.totalOutstanding || 0),
          currency,
        },
        totalOverdue: {
          amount: Number(metricsResult?.totalOverdue || 0),
          currency,
        },
      },
      summary: {
        draftCount: Number(metricsResult?.draftCount || 0),
        sentCount: Number(metricsResult?.sentCount || 0),
        paidCount: Number(metricsResult?.paidCount || 0),
        overdueCount: Number(metricsResult?.overdueCount || 0),
        cancelledCount: Number(metricsResult?.cancelledCount || 0),
      },
      overdueAlerts,
    };
  }

  /**
   * Aggregate project metrics & upcoming deadlines
   */
  async getProjectMetrics(workspaceId: string): Promise<{
    activeProjectsCount: number;
    upcomingDeadlines: UpcomingDeadlineDto[];
  }> {
    // Count active projects
    const [activeResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.workspaceId, workspaceId),
          inArray(projectsTable.status, ["draft", "active"]),
          isNull(projectsTable.deletedAt),
        ),
      );
    const activeProjectsCount = Number(activeResult?.count || 0);

    // Fetch top 5 upcoming project deadlines
    const projects = await db
      .select({
        id: projectsTable.id,
        name: projectsTable.name,
        status: projectsTable.status,
        targetDate: projectsTable.targetDate,
        budgetAmount: projectsTable.budgetAmount,
        budgetCurrency: projectsTable.budgetCurrency,
        clientId: projectsTable.clientId,
        clientName: clientsTable.name,
      })
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(
        and(
          eq(projectsTable.workspaceId, workspaceId),
          inArray(projectsTable.status, ["draft", "active"]),
          isNotNull(projectsTable.targetDate),
          isNull(projectsTable.deletedAt),
        ),
      )
      .orderBy(asc(projectsTable.targetDate))
      .limit(5);

    const upcomingDeadlines: UpcomingDeadlineDto[] = projects.map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.clientName || "Internal Project",
      status: p.status,
      targetDate: p.targetDate,
      budgetAmount: p.budgetAmount ? Number(p.budgetAmount) : null,
      budgetCurrency: p.budgetCurrency || "INR",
    }));

    return {
      activeProjectsCount,
      upcomingDeadlines,
    };
  }

  /**
   * Count active clients
   */
  async getClientCount(workspaceId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clientsTable)
      .where(
        and(
          eq(clientsTable.workspaceId, workspaceId),
          isNull(clientsTable.deletedAt),
        ),
      );
    return Number(result?.count || 0);
  }

  /**
   * Fetch recent 5 invoices
   */
  async getRecentInvoices(workspaceId: string): Promise<RecentInvoiceDto[]> {
    const recent = await db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        status: invoicesTable.status,
        totalAmount: invoicesTable.totalAmount,
        amountDue: invoicesTable.amountDue,
        issueDate: invoicesTable.issueDate,
        clientName: clientsTable.name,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
      .where(
        and(
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
        ),
      )
      .orderBy(desc(invoicesTable.createdAt))
      .limit(5);

    return recent.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName || "Client",
      status: inv.status,
      totalAmount: Number(inv.totalAmount || 0),
      amountDue: Number(inv.amountDue || 0),
      issueDate: inv.issueDate,
    }));
  }
}
