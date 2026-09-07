import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DriftAnalysisModal } from '../components/DriftAnalysisModal';
import * as driftHooks from '../hooks/useDriftAnalysis';
import type { DriftAnalysisRecord } from '@api/ai';

vi.mock('../hooks/useDriftAnalysis');

const mockDriftRecord: DriftAnalysisRecord = {
  id: 'drift_123',
  workspaceId: 'ws_test',
  scopeAnalysisId: 'scope_test',
  actorUserId: 'usr_test',
  changeRequestText: 'Can we add automated recurring invoices and payment switcher?',
  result: {
    summary: 'The change request introduces moderate scope drift requiring revised timeline.',
    recommendation: 'negotiate',
    recommendation_rationale: 'Additional backend logic and webhooks needed.',
    affected_deliverables: [
      {
        title: 'Payment Gateway Integration',
        impact_description: 'Requires multi-currency adapter',
        additional_hours: 8,
      },
    ],
    timeline_delta_days: 5,
    budget_delta_percentage: 15.0,
    new_deliverables_required: ['Admin notification system'],
    confidence_score: 88,
  },
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-01T12:00:00Z',
};

describe('DriftAnalysisModal', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(driftHooks.useAnalyzeDrift).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof driftHooks.useAnalyzeDrift>);
  });

  it('renders initial input state when open', () => {
    render(
      <DriftAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId="ws_test"
        scopeAnalysisId="scope_test"
        scopeTitle="SaaS Invoicing App"
      />
    );

    expect(screen.getByText('Scope Drift Detection')).toBeDefined();
    expect(screen.getByText(/Evaluating change request against: SaaS Invoicing App/i)).toBeDefined();
    expect(screen.getByLabelText(/Client Change Request \/ Message/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /analyze scope drift/i })).toBeDefined();
  });

  it('disables submit button when input is fewer than 10 characters', () => {
    render(
      <DriftAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId="ws_test"
        scopeAnalysisId="scope_test"
      />
    );

    const submitBtn = screen.getByRole('button', {
      name: /analyze scope drift/i,
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Too short' } });
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(textarea, {
      target: { value: 'This is long enough for drift analysis' },
    });
    expect(submitBtn.disabled).toBe(false);
  });

  it('shows loading state when analysis mutation is pending', () => {
    vi.mocked(driftHooks.useAnalyzeDrift).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as unknown as ReturnType<typeof driftHooks.useAnalyzeDrift>);

    render(
      <DriftAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId="ws_test"
        scopeAnalysisId="scope_test"
      />
    );

    expect(screen.getByTestId('drift-loading')).toBeDefined();
    expect(
      screen.getByText(/Evaluating Scope Drift Impact\.\.\./i)
    ).toBeDefined();
  });

  it('renders results with negotiation recommendation and confidence score', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue(mockDriftRecord);

    render(
      <DriftAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId="ws_test"
        scopeAnalysisId="scope_test"
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(
      textarea,
      'Can we add automated recurring invoices and payment switcher?'
    );

    const submitBtn = screen.getByRole('button', {
      name: /analyze scope drift/i,
    });
    await user.click(submitBtn);

    expect(screen.getByTestId('drift-results')).toBeDefined();
    expect(screen.getByTestId('recommendation-badge')).toBeDefined();
    expect(screen.getByText(/Negotiation Required/i)).toBeDefined();
    expect(screen.getByText('88%')).toBeDefined();
    expect(
      screen.getByText(
        'The change request introduces moderate scope drift requiring revised timeline.'
      )
    ).toBeDefined();
  });

  it('renders impact metrics and affected deliverables', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue(mockDriftRecord);

    render(
      <DriftAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId="ws_test"
        scopeAnalysisId="scope_test"
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(
      textarea,
      'Can we add automated recurring invoices and payment switcher?'
    );

    const submitBtn = screen.getByRole('button', {
      name: /analyze scope drift/i,
    });
    await user.click(submitBtn);

    expect(screen.getByText('+5 days')).toBeDefined();
    expect(screen.getByText('+15%')).toBeDefined();
    expect(screen.getByText('Payment Gateway Integration')).toBeDefined();
    expect(screen.getByText('+8h')).toBeDefined();
    expect(screen.getByText('Admin notification system')).toBeDefined();
  });
});
