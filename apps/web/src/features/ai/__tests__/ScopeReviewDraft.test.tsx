import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ScopeAnalysisRecord } from '@api/ai';
import { ScopeReviewDraft } from '../components/ScopeReviewDraft';

const mockScopeRecord: ScopeAnalysisRecord = {
  id: 'scope_1111_2222_3333',
  workspaceId: 'ws_1111',
  projectId: null,
  actorUserId: 'usr_1',
  inputText: 'Build an automated SaaS billing application',
  result: {
    summary: 'Comprehensive SaaS billing platform with Stripe integration.',
    deliverables: [
      {
        title: 'Architecture & Database Design',
        description: 'PostgreSQL schema and API specifications.',
        estimated_hours: 15,
        complexity: 'medium',
        skills_required: ['PostgreSQL', 'Drizzle'],
      },
      {
        title: 'Stripe Billing & Subscriptions',
        description: 'Webhook integration and customer checkout portal.',
        estimated_hours: 30,
        complexity: 'high',
        skills_required: ['Stripe', 'Node.js'],
      },
    ],
    timeline_weeks: 3,
    risks_and_dependencies: ['Stripe webhook latency during traffic spikes'],
    recommended_tech_stack: ['Next.js 16', 'FastAPI', 'Neon PostgreSQL'],
    confidence_score: 94,
  },
  confirmedAt: null,
  createdAt: '2026-08-30T12:00:00Z',
  updatedAt: '2026-08-30T12:00:00Z',
};

describe('ScopeReviewDraft', () => {
  it('renders summary, confidence, and total calculated hours', () => {
    render(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />
    );

    expect(
      screen.getByText('Comprehensive SaaS billing platform with Stripe integration.')
    ).toBeDefined();
    expect(screen.getByText('94% Confidence')).toBeDefined();
    expect(screen.getByText('45 hrs')).toBeDefined(); // 15 + 30
    expect(screen.getByText('3 weeks')).toBeDefined();
    expect(screen.getByText('2 items')).toBeDefined();
  });

  it('renders deliverable milestones with complexity badges and required skills', () => {
    render(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />
    );

    expect(screen.getByText('Architecture & Database Design')).toBeDefined();
    expect(screen.getByText('Stripe Billing & Subscriptions')).toBeDefined();
    expect(screen.getByText('medium Complexity')).toBeDefined();
    expect(screen.getByText('high Complexity')).toBeDefined();
    expect(screen.getByText('Drizzle')).toBeDefined();
    expect(screen.getByText('Stripe')).toBeDefined();
  });

  it('renders risks and recommended tech stack items', () => {
    render(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        isConfirming={false}
      />
    );

    expect(
      screen.getByText('Stripe webhook latency during traffic spikes')
    ).toBeDefined();
    expect(screen.getByText('Next.js 16')).toBeDefined();
    expect(screen.getByText('Neon PostgreSQL')).toBeDefined();
  });

  it('handles approve and discard user actions', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleDiscard = vi.fn();

    render(
      <ScopeReviewDraft
        scopeRecord={mockScopeRecord}
        onConfirm={handleConfirm}
        onDiscard={handleDiscard}
        isConfirming={false}
      />
    );

    const approveBtn = screen.getByRole('button', {
      name: /approve & confirm scope/i,
    });
    await user.click(approveBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const discardBtn = screen.getByRole('button', {
      name: /modify brief \/ start over/i,
    });
    await user.click(discardBtn);
    expect(handleDiscard).toHaveBeenCalledTimes(1);
  });
});
