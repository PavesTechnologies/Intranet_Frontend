import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CashAdvanceApprovalsList from '../CashAdvanceApprovalsList';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import * as authContext from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * Cash advances have no expense line items, so the approval table must not show an Expenses column. The other
 * columns and the actions stay in place.
 */

vi.mock('../../../api/cashAdvanceApi');
vi.mock('@/contexts/AuthContext');
vi.mock('@/components/toastfy/toast');
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));

function renderWithProviders(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CashAdvanceApprovalsList - columns', () => {
  const mockAdvances = [
    {
      advanceId: 'adv-1',
      advanceNumber: 'ADV-001',
      title: 'Business Trip',
      purpose: 'Client meeting',
      amount: 5000,
      currencyCode: 'INR',
      employeeId: 'emp-1',
      managerId: 'mgr-1',
      status: 'PENDING_MANAGER_APPROVAL',
      neededByDate: '2026-10-20',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.getMyApprovals.mockResolvedValue({ data: { data: mockAdvances } });
    authContext.useAuth.mockReturnValue({ user: { id: 'mgr-1' }, hasRole: vi.fn(() => true) });
  });

  it('does not show an Expenses or Policy column for cash advances', async () => {
    renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

    await waitFor(() => expect(screen.getByText(/business trip/i)).toBeInTheDocument());

    expect(screen.queryByRole('columnheader', { name: /^expenses$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^policy$/i })).not.toBeInTheDocument();
  });

  it('keeps the remaining columns', async () => {
    renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

    await waitFor(() => expect(screen.getByText(/business trip/i)).toBeInTheDocument());

    expect(screen.getByRole('columnheader', { name: /^report$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^employee$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^amount$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^actions$/i })).toBeInTheDocument();
  });
});
