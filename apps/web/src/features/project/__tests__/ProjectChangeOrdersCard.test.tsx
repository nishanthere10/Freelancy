import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangeOrder } from "../api";
import { ProjectChangeOrdersCard } from "../components/ProjectChangeOrdersCard";

const mockChangeOrders: ChangeOrder[] = [
  {
    id: "co-1",
    workspaceId: "ws-123",
    projectId: "proj-123",
    scopeAnalysisId: "scope-123",
    driftAnalysisId: "drift-123",
    invoiceId: "inv-co-1",
    changeOrderNumber: "CO-001",
    title: "WhatsApp Notifications",
    description: "Add order alerts",
    status: "approved",
    additionalBudget: "12000.00",
    additionalHours: "8.00",
    timelineDeltaDays: 2,
    proposedDeliverables: [
      {
        title: "WhatsApp Integration",
        estimatedHours: 5,
        complexity: "medium",
      },
      { title: "Testing", estimatedHours: 3, complexity: "low" },
    ],
    approvedByUserId: "user-1",
    approvedAt: "2026-09-16T12:00:00Z",
    createdAt: "2026-09-16T10:00:00Z",
    updatedAt: "2026-09-16T12:00:00Z",
  },
  {
    id: "co-2",
    workspaceId: "ws-123",
    projectId: "proj-123",
    scopeAnalysisId: "scope-123",
    driftAnalysisId: null,
    invoiceId: null,
    changeOrderNumber: "CO-002",
    title: "Apple Pay Checkout",
    description: "Add Apple Pay payment option",
    status: "draft",
    additionalBudget: "7000.00",
    additionalHours: "5.00",
    timelineDeltaDays: 1,
    proposedDeliverables: [
      { title: "Apple Pay Setup", estimatedHours: 5, complexity: "medium" },
    ],
    approvedByUserId: null,
    approvedAt: null,
    createdAt: "2026-09-16T14:00:00Z",
    updatedAt: "2026-09-16T14:00:00Z",
  },
];

let activeChangeOrders: ChangeOrder[] = [];

vi.mock("../hooks/useChangeOrders", () => ({
  useChangeOrders: () => ({
    data: activeChangeOrders,
    isLoading: false,
    error: null,
  }),
  useCreateChangeOrder: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateChangeOrderDraft: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useApproveChangeOrder: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRejectChangeOrder: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelChangeOrder: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("ProjectChangeOrdersCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeChangeOrders = [];
  });

  it("renders empty state when no change orders exist", () => {
    activeChangeOrders = [];

    render(
      <ProjectChangeOrdersCard
        workspaceId="ws-123"
        projectId="proj-123"
        scopeAnalysisId="scope-123"
        projectBudget="100000.00"
        projectCurrency="INR"
      />,
    );

    expect(screen.getByText("Change Orders & Scope Adjustments")).toBeDefined();
    expect(screen.getByText("No Change Orders Recorded")).toBeDefined();
  });

  it("renders change orders list with status badges and metrics", () => {
    activeChangeOrders = mockChangeOrders;

    render(
      <ProjectChangeOrdersCard
        workspaceId="ws-123"
        projectId="proj-123"
        scopeAnalysisId="scope-123"
        projectBudget="100000.00"
        projectCurrency="INR"
      />,
    );

    // Header and count
    expect(screen.getByText("CO-001")).toBeDefined();
    expect(screen.getByText("WhatsApp Notifications")).toBeDefined();
    expect(screen.getByText("Approved")).toBeDefined();
    expect(screen.getAllByText(/\+INR 12,000/)[0]).toBeDefined();
    expect(screen.getAllByText(/\+2 days/)[0]).toBeDefined();

    // Second change order in draft
    expect(screen.getByText("CO-002")).toBeDefined();
    expect(screen.getByText("Apple Pay Checkout")).toBeDefined();
    expect(screen.getByText("Draft")).toBeDefined();
    expect(screen.getByText("Review & Approve")).toBeDefined();
    expect(screen.getByText("Reject")).toBeDefined();

    // View Invoice link for approved order
    expect(screen.getByText(/View Invoice/i)).toBeDefined();
  });
});
