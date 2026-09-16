import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangeOrderProposalModal } from "../components/ChangeOrderProposalModal";

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockApproveMutateAsync = vi.fn();

vi.mock("../hooks/useChangeOrders", () => ({
  useCreateChangeOrder: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateChangeOrderDraft: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useApproveChangeOrder: () => ({
    mutateAsync: mockApproveMutateAsync,
    isPending: false,
  }),
}));

describe("ChangeOrderProposalModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({ id: "co-new-123" });
    mockApproveMutateAsync.mockResolvedValue({});
    mockUpdateMutateAsync.mockResolvedValue({});
  });

  it("renders modal with prefilled initial values and calculates hours dynamically", () => {
    render(
      <ChangeOrderProposalModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId="ws-123"
        projectId="proj-123"
        scopeAnalysisId="scope-123"
        projectBudget="50000.00"
        projectCurrency="USD"
        initialTitle="Custom Scope Addition"
        initialAdditionalBudget="5000.00"
        initialDeliverables={[
          { title: "Feature Alpha", estimatedHours: 10, complexity: "medium" },
          { title: "Feature Beta", estimatedHours: 5, complexity: "low" },
        ]}
      />,
    );

    // Title input
    expect(screen.getByDisplayValue("Custom Scope Addition")).toBeDefined();
    expect(screen.getByDisplayValue("5000.00")).toBeDefined();

    // Deliverables rendered
    expect(screen.getByDisplayValue("Feature Alpha")).toBeDefined();
    expect(screen.getByDisplayValue("Feature Beta")).toBeDefined();

    // Total effort: 15 hours
    expect(screen.getByText(/15 hours/)).toBeDefined();
  });

  it("updates total effort when user edits deliverable hours", () => {
    render(
      <ChangeOrderProposalModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId="ws-123"
        projectId="proj-123"
        scopeAnalysisId="scope-123"
        projectBudget="50000.00"
        projectCurrency="USD"
        initialDeliverables={[
          { title: "Feature Alpha", estimatedHours: 8, complexity: "medium" },
        ]}
      />,
    );

    const hoursInput = screen.getByDisplayValue("8");
    fireEvent.change(hoursInput, { target: { value: "14" } });

    // Hours recalculated to 14
    expect(screen.getByText(/14 hours/)).toBeDefined();
  });

  it("calls create and approve mutations on handleApproveAndExecute", async () => {
    const handleClose = vi.fn();

    render(
      <ChangeOrderProposalModal
        isOpen={true}
        onClose={handleClose}
        workspaceId="ws-123"
        projectId="proj-123"
        scopeAnalysisId="scope-123"
        projectBudget="50000.00"
        projectCurrency="USD"
        initialTitle="Approved Feature Addition"
        initialAdditionalBudget="3000.00"
        initialDeliverables={[
          { title: "Feature Delta", estimatedHours: 6, complexity: "high" },
        ]}
      />,
    );

    const approveButton = screen.getByText(/Approve & Generate Invoice/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeAnalysisId: "scope-123",
          title: "Approved Feature Addition",
          additionalBudget: "3000.00",
        }),
      );
      expect(mockApproveMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          changeOrderId: "co-new-123",
        }),
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
