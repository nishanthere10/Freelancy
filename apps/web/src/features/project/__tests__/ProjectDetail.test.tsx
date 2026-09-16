import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectDetail } from '../components/ProjectDetail';
import type { ProjectResponse } from '../api';
import * as deliverableHooks from '../hooks/useProjectDeliverables';
import * as invoiceHooks from '@features/invoice/hooks';
import * as aiApi from '@api/ai';

vi.mock('../hooks/useProjectDeliverables');
vi.mock('@features/invoice/hooks');
vi.mock('@api/ai');

const mockProject: ProjectResponse = {
  id: 'proj-123',
  workspaceId: 'ws-123',
  clientId: 'client-123',
  clientName: 'Acme Corp',
  name: 'Acme Mobile App',
  slug: 'acme-mobile-app',
  description: 'iOS and Android client application',
  status: 'active',
  pricingModel: 'fixed',
  budgetCurrency: 'USD',
  budgetAmount: '8000.00',
  startDate: '2026-09-01',
  targetDate: '2026-10-15',
  completedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  deletedAt: null,
};

const mockDeliverablesData = {
  deliverables: [
    {
      id: 'deliv-1',
      workspaceId: 'ws-123',
      projectId: 'proj-123',
      title: 'Auth & Onboarding',
      description: 'Clerk auth setup',
      estimatedHours: '12.00',
      loggedHours: '12.00',
      complexity: 'medium' as const,
      status: 'completed' as const,
      position: 1,
      sourceScopeId: 'scope-123',
      invoiceId: 'inv-1',
      billedAt: '2026-09-05T00:00:00Z',
      completedAt: '2026-09-05T00:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    },
    {
      id: 'deliv-2',
      workspaceId: 'ws-123',
      projectId: 'proj-123',
      title: 'Push Notifications',
      description: 'APNS and FCM integration',
      estimatedHours: '8.00',
      loggedHours: '4.00',
      complexity: 'high' as const,
      status: 'in_progress' as const,
      position: 2,
      sourceScopeId: 'scope-123',
      invoiceId: null,
      billedAt: null,
      completedAt: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-06T00:00:00Z',
    },
  ],
  progress: {
    totalCount: 2,
    completedCount: 1,
    inProgressCount: 1,
    pendingCount: 0,
    completionPercentage: 50,
    totalEstimatedHours: 20,
    totalLoggedHours: 16,
    remainingHours: 4,
  },
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('ProjectDetail (Project Hub)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    vi.mocked(invoiceHooks.useInvoices).mockReturnValue({
      data: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-0001',
          totalAmount: '2500.00',
          amountPaid: '2500.00',
          status: 'paid',
          dueDate: '2026-09-20',
          currency: 'USD',
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof invoiceHooks.useInvoices>);

    vi.mocked(deliverableHooks.useProjectDeliverables).mockReturnValue({
      data: mockDeliverablesData,
      isLoading: false,
    } as unknown as ReturnType<typeof deliverableHooks.useProjectDeliverables>);

    vi.mocked(deliverableHooks.useCreateProjectDeliverable).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof deliverableHooks.useCreateProjectDeliverable>);

    vi.mocked(deliverableHooks.useUpdateProjectDeliverable).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof deliverableHooks.useUpdateProjectDeliverable>);

    vi.mocked(deliverableHooks.useDeleteProjectDeliverable).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof deliverableHooks.useDeleteProjectDeliverable>);

    vi.mocked(deliverableHooks.useBackfillProjectDeliverables).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof deliverableHooks.useBackfillProjectDeliverables>);

    vi.mocked(deliverableHooks.useCreateProgressInvoice).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof deliverableHooks.useCreateProgressInvoice>);

    vi.mocked(aiApi.listScopeAnalyses).mockResolvedValue([
      {
        id: 'scope-123',
        workspaceId: 'ws-123',
        projectId: 'proj-123',
        actorUserId: 'user-1',
        inputText: 'Mobile App Brief',
        result: {
          summary: 'Mobile app spec',
          deliverables: [],
          timeline_weeks: 4,
          confidence_score: 95,
        },
        confirmedAt: '2026-09-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ]);
  });

  it('renders Project Hub header with project info and metrics', () => {
    renderWithClient(
      <ProjectDetail
        workspaceId="ws-123"
        project={mockProject}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Acme Mobile App')).toBeDefined();
    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('USD 8,000')).toBeDefined();
    expect(screen.getByText('Check Scope Drift')).toBeDefined();
  });

  it('renders progress bar with 50% completion and hours summary', () => {
    renderWithClient(
      <ProjectDetail
        workspaceId="ws-123"
        project={mockProject}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Execution Progress')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText(/deliverables completed/i)).toBeDefined();
    expect(screen.getByText('(1 in progress)')).toBeDefined();
  });

  it('renders deliverables execution list with status badges', () => {
    renderWithClient(
      <ProjectDetail
        workspaceId="ws-123"
        project={mockProject}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Project Deliverables & Milestones')).toBeDefined();
    expect(screen.getByText('Auth & Onboarding')).toBeDefined();
    expect(screen.getByText('Push Notifications')).toBeDefined();
    expect(screen.getByText('Billed')).toBeDefined();
  });

  it('renders project financials card with linked invoices and create progress invoice action', () => {
    renderWithClient(
      <ProjectDetail
        workspaceId="ws-123"
        project={mockProject}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Project Financials & Invoices')).toBeDefined();
    expect(screen.getByText('Create Progress Invoice')).toBeDefined();
    expect(screen.getByText('INV-2026-0001')).toBeDefined();
  });
});
