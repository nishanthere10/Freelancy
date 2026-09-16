import type { ScopeAnalysisRecord } from "@api/ai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScopeReviewDraft } from "../components/ScopeReviewDraft";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock hooks
const mockRefineMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockConvertMutateAsync = vi.fn();

vi.mock("../hooks/useScopeRefinement", () => ({
  useRefineScope: () => ({
    mutateAsync: mockRefineMutateAsync,
    isPending: false,
  }),
  useUpdateScopeResult: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useConvertScope: () => ({
    mutateAsync: mockConvertMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@features/client", () => ({
  useClients: () => ({
    data: [{ id: "client-1", name: "Acme Corp", companyName: "Acme Inc" }],
    isLoading: false,
  }),
}));

const mockScopeRecord: ScopeAnalysisRecord = {
  id: "scope_1111_2222_3333",
  workspaceId: "ws_1111",
  projectId: null,
  actorUserId: "usr_1",
  inputText: "Build an automated SaaS billing application",
  result: {
    summary: "Comprehensive SaaS billing platform with Stripe integration.",
    deliverables: [
      {
        title: "Architecture & Database Design",
        description: "PostgreSQL schema and API specifications.",
        estimated_hours: 15,
        complexity: "medium",
        skills_required: ["PostgreSQL", "Drizzle"],
      },
      {
        title: "Stripe Billing & Subscriptions",
        description: "Webhook integration and customer checkout portal.",
        estimated_hours: 30,
        complexity: "high",
        skills_required: ["Stripe", "Node.js"],
      },
    ],
    timeline_weeks: 3,
    risks_and_dependencies: ["Stripe webhook latency during traffic spikes"],
    recommended_tech_stack: ["Next.js 16", "FastAPI", "Neon PostgreSQL"],
    confidence_score: 94,
  },
  confirmedAt: null,
  createdAt: "2026-08-30T12:00:00Z",
  updatedAt: "2026-08-30T12:00:00Z",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ScopeReviewDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary, confidence, metrics, and conversational prompt bar", () => {
    renderWithClient(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />,
    );

    expect(
      screen.getByText(
        "Comprehensive SaaS billing platform with Stripe integration.",
      ),
    ).toBeDefined();
    expect(screen.getByText("94% Confidence")).toBeDefined();
    expect(screen.getByText("45 hrs")).toBeDefined(); // 15 + 30
    expect(screen.getByText("3 weeks")).toBeDefined();
    expect(screen.getByText("2 items")).toBeDefined();

    // Refine with AI section
    expect(screen.getByText("Refine Scope with AI")).toBeDefined();
    expect(
      screen.getByPlaceholderText(/shift stack to react native/i),
    ).toBeDefined();
  });

  it("renders editable deliverable titles and descriptions in input elements", () => {
    renderWithClient(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />,
    );

    expect(
      screen.getByDisplayValue("Architecture & Database Design"),
    ).toBeDefined();
    expect(
      screen.getByDisplayValue("Stripe Billing & Subscriptions"),
    ).toBeDefined();
    expect(
      screen.getByDisplayValue("PostgreSQL schema and API specifications."),
    ).toBeDefined();
    expect(screen.getByText("Drizzle")).toBeDefined();
    expect(screen.getByText("Stripe")).toBeDefined();
  });

  it("allows adding a custom deliverable and updates total hours live", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />,
    );

    const addBtn = screen.getByRole("button", {
      name: /add custom deliverable milestone/i,
    });
    await user.click(addBtn);

    // Initial 45 hrs + default 12 hrs = 57 hrs
    expect(screen.getByText("57 hrs")).toBeDefined();
    expect(screen.getByText("3 items")).toBeDefined();
    expect(screen.getByText("Unsaved changes")).toBeDefined();
  });

  it("submits conversational AI revision when user enters prompt", async () => {
    const user = userEvent.setup();
    mockRefineMutateAsync.mockResolvedValueOnce({
      ...mockScopeRecord,
      result: {
        ...mockScopeRecord.result,
        summary: "Refined mobile app scope",
      },
    });

    renderWithClient(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />,
    );

    const promptInput = screen.getByPlaceholderText(
      /shift stack to react native/i,
    );
    await user.type(
      promptInput,
      "Add mobile notifications and reduce timeline",
    );

    const refineBtn = screen.getByRole("button", { name: /^refine$/i });
    await user.click(refineBtn);

    expect(mockRefineMutateAsync).toHaveBeenCalledWith({
      scopeId: mockScopeRecord.id,
      revisionPrompt: "Add mobile notifications and reduce timeline",
    });
  });

  it("opens ConvertScopeModal when Convert to Live Project is clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />,
    );

    const convertBtn = screen.getByRole("button", {
      name: /convert to live project/i,
    });
    await user.click(convertBtn);

    expect(screen.getByText("Convert Scope to Live Project")).toBeDefined();
    expect(screen.getByText("50% Deposit (Recommended)")).toBeDefined();
  });

  it("handles approve and discard user actions", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleDiscard = vi.fn();

    renderWithClient(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={handleConfirm}
        onDiscard={handleDiscard}
        isConfirming={false}
      />,
    );

    const approveBtn = screen.getByRole("button", {
      name: /approve & confirm/i,
    });
    await user.click(approveBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const discardBtn = screen.getByRole("button", {
      name: /modify brief \/ start over/i,
    });
    await user.click(discardBtn);
    expect(handleDiscard).toHaveBeenCalledTimes(1);
  });
});
