import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CashAdvanceApprovalsList from '../CashAdvanceApprovalsList';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import * as authContext from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../api/cashAdvanceApi');
vi.mock('@/contexts/AuthContext');
vi.mock('@/components/toastfy/toast');
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><CashAdvanceApprovalsList activeTab="pending" /></MemoryRouter>
    </QueryClientProvider>,
  );
}

const carryForwardRequest = {
  advanceId: 'adv-cf', advanceNumber: 'ADV-CF', title: 'Pune trip', purpose: 'Client visit',
  amount: 2000, additionalAmountRequested: 2000, totalAdvanceAllocation: 2550,
  requestType: 'ADVANCE_PLUS_CARRY_FORWARD', currencyCode: 'INR',
  employeeId: 'emp-1', managerId: 'mgr-1', employeeName: 'Sindhu', status: 'SUBMITTED',
};

describe('Decision window: Cash Advance + Carry Forward', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.getMyApprovals.mockResolvedValue({ data: { data: [carryForwardRequest] } });
    authContext.useAuth.mockReturnValue({ user: { id: 'mgr-1' }, hasRole: vi.fn(() => true) });
  });

  it('pays only the new cash and says the employee accounts for the total, including the carry forward', async () => {
    cashAdvanceApi.approvalBalance.mockResolvedValue({
      currencyCode: 'SGD', pendingBalanceTotal: 968, committedAmount: 0,
      otherOpenAdvances: [{ advanceId: 'a-1', title: 'Bengaluru visit', outstandingBalance: 968, currencyCode: 'INR' }],
    });
    renderList();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /approve/i })));

    expect(await screen.findByText('Finance will pay the employee (new cash)')).toBeInTheDocument();
    const note = screen.getByTestId('carry-forward-payout-note');
    expect(note).toHaveTextContent('Only the new cash is paid');
    expect(note).toHaveTextContent('INR 2,550.00');
    expect(note).toHaveTextContent('INR 550.00 carried forward that they already hold');
  });

  it("shows other advances in their own currency, not the request's", async () => {
    cashAdvanceApi.approvalBalance.mockResolvedValue({
      currencyCode: 'SGD', pendingBalanceTotal: 968, committedAmount: 0,
      otherOpenAdvances: [{ advanceId: 'a-1', title: 'Bengaluru visit', outstandingBalance: 968, currencyCode: 'INR' }],
    });
    renderList();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /approve/i })));

    const summary = await screen.findByText(/Employee already holds/);
    expect(summary).toHaveTextContent('INR 968.00');
    expect(summary).not.toHaveTextContent('SGD');
  });
});
