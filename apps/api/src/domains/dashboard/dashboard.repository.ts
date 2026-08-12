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

    // Query active workspace invoices
    const invoices = await db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        status: invoicesTable.status,
        currency: invoicesTable.currency,
        totalAmount: invoicesTable.totalAmount,
        amountPaid: invoicesTable.amountPaid,
        amountDue: invoicesTable.amountDue,
        dueDate: invoicesTable.dueDate,
        clientId: invoicesTable.clientId,
      })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
        ),
      );

    // Get client names for overdue invoices lookup
    const clientIds = [
      ...new Set(invoices.map((inv) => inv.clientId).filter(Boolean)),
    ];
    const clientMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const clients = await db
        .select({ id: clientsTable.id, name: clientsTable.name })
        .from(clientsTable)
        .where(inArray(clientsTable.id, clientIds));
      for (const c of clients) {
        clientMap.set(c.id, c.name);
      }
    }

    let totalInvoicedSum = 0;
    let totalCollectedSum = 0;
    let totalOutstandingSum = 0;
    let totalOverdueSum = 0;
    let currency = "INR";

    let draftCount = 0;
    let sentCount = 0;
    let paidCount = 0;
    let overdueCount = 0;
    let cancelledCount = 0;

    const overdueAlerts: OverdueAlertDto[] = [];

    for (const inv of invoices) {
      if (inv.currency) currency = inv.currency;
      const total = Number(inv.totalAmount || 0);
      const paid = Number(inv.amountPaid || 0);
      const due = Number(inv.amountDue || 0);
      const isOverdue =
        inv.status === "overdue" ||
        (inv.status === "sent" && inv.dueDate && inv.dueDate < todayStr);

      if (inv.status !== "cancelled") {
        totalInvoicedSum += total;
        totalCollectedSum += paid;

        if (inv.status === "sent" || inv.status === "overdue" || isOverdue) {
          totalOutstandingSum += due;
        }
      }

      // Invoice status counts
      if (inv.status === "draft") draftCount++;
      else if (inv.status === "paid") paidCount++;
      else if (inv.status === "cancelled") cancelledCount++;
      else if (isOverdue) {
        overdueCount++;
        totalOverdueSum += due;
        overdueAlerts.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          clientName: clientMap.get(inv.clientId) || "Client",
          amountDue: due,
          dueDate: inv.dueDate,
        });
      } else if (inv.status === "sent") {
        sentCount++;
      }
    }

    return {
      overview: {
        totalInvoiced: { amount: totalInvoicedSum, currency },
        totalCollected: { amount: totalCollectedSum, currency },
        totalOutstanding: { amount: totalOutstandingSum, currency },
        totalOverdue: { amount: totalOverdueSum, currency },
      },
      summary: {
        draftCount,
        sentCount,
        paidCount,
        overdueCount,
        cancelledCount,
      },
      overdueAlerts: overdueAlerts.slice(0, 5),
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
