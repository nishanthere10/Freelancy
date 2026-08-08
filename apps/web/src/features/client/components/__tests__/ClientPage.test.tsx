import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientPage } from '../ClientPage';

// Mock the hooks
vi.mock('../../hooks', () => ({
  useClients: () => ({
    data: [
      {
        id: 'c1',
        workspaceId: 'w1',
        name: 'Acme Corp',
        email: 'acme@corp.com',
        phone: '+919876543210',
        website: 'https://acme.com',
        companyName: 'Acme Pvt Ltd',
        gstNumber: '29AABCM1234D1ZX',
        status: 'active',
        createdAt: '2026-08-08T10:00:00.000Z',
        updatedAt: '2026-08-08T10:00:00.000Z',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteClient: () => ({ mutate: vi.fn(), isPending: false }),
  useRestoreClient: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('ClientPage', () => {
  it('renders clients list correctly', () => {
    render(<ClientPage workspaceId="w1" />);
    expect(screen.getByText('Clients')).toBeDefined();
    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('acme@corp.com')).toBeDefined();
  });
});
