import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CashAdvanceApprovalsList from '../CashAdvanceApprovalsList';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import * as authContext from '@/contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../api/cashAdvanceApi');
vi.mock('@/contexts/AuthContext');
vi.mock('@/components/toastfy/toast');
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));

const submitted = {
  advanceId: 'adv-embedded-1',
  title: 'new testing advance',
  purpose: 'new testing advance',
  amount: 1000,
  currencyCode: 'INR',
  employeeId: '5100021',
  managerId: '5100023',
  status: 'SUBMITTED',
  neededByDate: '2026-11-16',
  settlementDueDate: '2026-11-16',
};

describe('CashAdvanceApprovalsList embedded in the shared approvals table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.getMyApprovals.mockResolvedValue({ data: { data: { content: [submitted] } } });
    authContext.useAuth.mockReturnValue({ user: { id: '5100023' }, hasRole: vi.fn(() => true) });
  });

  it('renders the pending cash advance as a row inside the table', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <table>
            <tbody>
              <CashAdvanceApprovalsList activeTab="pending" stage="MANAGER" embedded />
            </tbody>
          </table>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('new testing advance')).toBeInTheDocument());
  });
});
