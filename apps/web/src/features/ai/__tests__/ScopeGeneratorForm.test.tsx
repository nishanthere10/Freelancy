import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScopeGeneratorForm } from '../components/ScopeGeneratorForm';

describe('ScopeGeneratorForm', () => {
  it('renders correctly with title, templates, and submit button', () => {
    render(<ScopeGeneratorForm onGenerate={vi.fn()} isLoading={false} />);

    expect(screen.getByText('AI Project Scope Analysis')).toBeDefined();
    expect(screen.getByText('E-Commerce Marketplace')).toBeDefined();
    expect(
      screen.getByRole('button', { name: /generate scope plan/i })
    ).toBeDefined();
  });

  it('populates textarea when a quick-fill example is clicked', async () => {
    const user = userEvent.setup();
    render(<ScopeGeneratorForm onGenerate={vi.fn()} isLoading={false} />);

    const quickFillBtn = screen.getByRole('button', {
      name: /e-commerce marketplace/i,
    });
    await user.click(quickFillBtn);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe(
      'Build a multi-vendor marketplace for artisan goods with customer accounts, Stripe Connect payouts, search filters, and an admin dashboard.'
    );
  });

  it('validates minimum length on submission', async () => {
    const handleGenerate = vi.fn();

    const { container } = render(
      <ScopeGeneratorForm onGenerate={handleGenerate} isLoading={false} />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Short' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/please provide at least 15 characters/i)
      ).toBeDefined();
    });

    expect(handleGenerate).not.toHaveBeenCalled();
  });

  it('calls onGenerate with input text on valid submission', async () => {
    const user = userEvent.setup();
    const handleGenerate = vi.fn();

    const { container } = render(
      <ScopeGeneratorForm onGenerate={handleGenerate} isLoading={false} />
    );

    const quickFillBtn = screen.getByRole('button', {
      name: /e-commerce marketplace/i,
    });
    await user.click(quickFillBtn);

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(handleGenerate).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it('disables textarea and shows loading state when isLoading is true', () => {
    render(<ScopeGeneratorForm onGenerate={vi.fn()} isLoading={true} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    expect(screen.getByText(/analyzing with ai\.\.\./i)).toBeDefined();
  });
});
