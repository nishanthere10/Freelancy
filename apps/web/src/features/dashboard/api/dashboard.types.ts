export interface MonetaryAmount {
  amount: number;
  currency: string;
}

export interface DashboardOverviewData {
  totalInvoiced: MonetaryAmount;
  totalCollected: MonetaryAmount;
  totalOutstanding: MonetaryAmount;
  totalOverdue: MonetaryAmount;
  activeProjectsCount: number;
  totalClientsCount: number;
}

export interface DashboardInvoiceSummaryData {
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
  cancelledCount: number;
}

export interface OverdueAlertDto {
  id: string;
  invoiceNumber: string | null;
  clientName: string;
  amountDue: number;
  dueDate: string | null;
}

export interface UpcomingDeadlineDto {
  id: string;
  name: string;
  clientName: string;
  status: string;
  targetDate: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
}

export interface RecentInvoiceDto {
  id: string;
  invoiceNumber: string | null;
  clientName: string;
  status: string;
  totalAmount: number;
  amountDue: number;
  issueDate: string | null;
}

export interface DashboardResponse {
  workspaceId: string;
  overview: DashboardOverviewData;
  invoiceSummary: DashboardInvoiceSummaryData;
  overdueAlerts: OverdueAlertDto[];
  upcomingDeadlines: UpcomingDeadlineDto[];
  recentInvoices: RecentInvoiceDto[];
}
