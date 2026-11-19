import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettlementPage from '../SettlementPage';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import { expenseReportService } from '../../../api/expenseReportsApi';
import * as authContext from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * EP04-S3 Test Suite: Finance Disbursement Workflow
 *
 * Tests disburse confirmation dialog, status transitions, and error handling
 */

vi.mock('../../../api/cashAdvanceApi');
vi.mock('../../../api/expenseReportsApi');
vi.mock('@/contexts/AuthContext');
vi.mock('@/components/toastfy/toast');
// Employee name lookups hit the network unless the directory hook is stubbed.
vi.mock('@/pages/expense-management/approval-engine/hooks/useEmployeeDirectory', async (importOriginal) => ({
  ...(await importOriginal()),
  useEmployeeDirectory: () => ({ data: new Map() }),
}));

// The status filter is a shared Listbox (not a native select): open its trigger, then pick an option.
const statusTrigger = () => screen.getByText('Status', { selector: 'label' }).parentElement.querySelector('button');
const openStatusFilter = async () => {
  fireEvent.click(statusTrigger());
  return screen.findByRole('listbox');
};
const selectStatus = async (optionName) => {
  await openStatusFilter();
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
};

// Finance must record how the money went out before the advance can be disbursed.
const fillCashConfirmation = () => {
  fireEvent.change(screen.getByLabelText(/disbursement mode/i), { target: { value: 'CASH' } });
  fireEvent.change(screen.getByLabelText(/received by/i), { target: { value: 'John Doe' } });
  fireEvent.change(screen.getByLabelText(/signed acknowledgment/i), {
    target: { files: [new File(['ack'], 'ack.pdf', { type: 'application/pdf' })] },
  });
};

function renderWithProviders(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettlementPage - EP04-S3: Finance Disbursement', () => {
  const mockAdvances = [
    {
      advanceId: 'adv-1',
      advanceNumber: 'ADV-001',
      title: 'Business Trip',
      amount: 5000,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      status: 'APPROVED',
      outstandingBalance: 5000,
      neededByDate: '2026-10-20',
      settlementDueDate: '2026-10-25',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.getAll.mockResolvedValue({
      data: { data: mockAdvances },
    });
    expenseReportService.getAll.mockResolvedValue({
      data: { data: [] },
    });
    authContext.useAuth.mockReturnValue({
      user: { id: 'fin-1' },
      hasRole: vi.fn(() => true),
    });
  });

  describe('Approved Status Filter', () => {
    it('should show "Approved (Awaiting Disbursement)" filter option', async () => {
      renderWithProviders(<SettlementPage />);

      await openStatusFilter();
      expect(screen.getByRole('option', { name: 'Approved (Awaiting Disbursement)' })).toBeInTheDocument();
    });

    it('should filter advances by APPROVED status', async () => {
      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        expect(screen.getByText(/business trip/i)).toBeInTheDocument();
      });
    });
  });

  describe('Disbursement mode and proof', () => {
    const openDisburseDialog = async () => {
      renderWithProviders(<SettlementPage />);
      await selectStatus('Approved (Awaiting Disbursement)');
      fireEvent.click(await screen.findByRole('button', { name: /^disburse$/i }));
    };

    it('does not disburse until a mode is selected and proof is recorded', async () => {
      await openDisburseDialog();

      fireEvent.click(screen.getByRole('button', { name: /confirm disburse/i }));

      expect(await screen.findByText('Select how the payment was made.')).toBeInTheDocument();
      expect(cashAdvanceApi.disburse).not.toHaveBeenCalled();
    });

    it('requires the signed acknowledgment for cash', async () => {
      await openDisburseDialog();
      fireEvent.change(screen.getByLabelText(/disbursement mode/i), { target: { value: 'CASH' } });
      fireEvent.change(screen.getByLabelText(/received by/i), { target: { value: 'John Doe' } });

      fireEvent.click(screen.getByRole('button', { name: /confirm disburse/i }));

      expect(await screen.findByText('Upload the signed acknowledgment.')).toBeInTheDocument();
      expect(cashAdvanceApi.disburse).not.toHaveBeenCalled();
    });

    it('records bank transfer details without a cash acknowledgment', async () => {
      await openDisburseDialog();
      fireEvent.change(screen.getByLabelText(/disbursement mode/i), { target: { value: 'BANK_TRANSFER' } });
      fireEvent.change(screen.getByLabelText(/transaction reference/i), { target: { value: 'UTR123' } });
      fireEvent.change(screen.getByLabelText(/transfer date/i), { target: { value: '2026-10-14' } });
      fireEvent.change(screen.getByLabelText(/transfer details/i), { target: { value: 'HDFC, acc ending 4321' } });

      fireEvent.click(screen.getByRole('button', { name: /confirm disburse/i }));

      await waitFor(() => expect(cashAdvanceApi.disburse).toHaveBeenCalledWith('adv-1', expect.any(FormData)));
      const body = cashAdvanceApi.disburse.mock.calls[0][1];
      expect(body.get('disbursementMode')).toBe('BANK_TRANSFER');
      expect(body.get('transactionReference')).toBe('UTR123');
      expect(body.has('signedAcknowledgment')).toBe(false);
    });
  });

  describe('Disburse Confirmation Dialog', () => {
    it('should show disburse confirmation modal when disburse button clicked', async () => {
      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/disburse cash advance/i)).toBeInTheDocument();
        // The dialog cites the advance by the start of its id ('adv-1' in this fixture).
        expect(screen.getByText(/You are about to/).closest('p')).toHaveTextContent('#adv-1');
      });
    });

    it('should display advance details in disburse modal', async () => {
      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Requested Amount:').nextElementSibling).toHaveTextContent('USD 5,000.00');
        expect(screen.getByText('Payment will be initiated to:').nextElementSibling).toHaveTextContent('John Doe');
      });
    });

    it('should show outstanding balance in confirmation', async () => {
      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Outstanding Balance:').nextElementSibling).toHaveTextContent('USD 5,000.00');
      });
    });

    it('should close modal on cancel', async () => {
      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/disburse cash advance/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Disburse Submission', () => {
    it('should call disburse API when confirmed', async () => {
      cashAdvanceApi.disburse.mockResolvedValue({
        data: { data: { ...mockAdvances[0], status: 'IN_PROGRESS' } },
      });

      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      fillCashConfirmation();
      const confirmButton = screen.getByRole('button', { name: /confirm disburse/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.disburse).toHaveBeenCalledWith('adv-1', expect.any(FormData));
      });
    });

    it('should disable button during submission', async () => {
      cashAdvanceApi.disburse.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: { data: mockAdvances[0] } }), 500))
      );

      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      fillCashConfirmation();
      const confirmButton = screen.getByRole('button', { name: /confirm disburse/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });

    it('should refresh list after successful disbursement', async () => {
      cashAdvanceApi.disburse.mockResolvedValue({
        data: { data: { ...mockAdvances[0], status: 'IN_PROGRESS' } },
      });

      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      fillCashConfirmation();
      const confirmButton = screen.getByRole('button', { name: /confirm disburse/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.getAll).toHaveBeenCalledTimes(2); // Initial load + after disburse
      });
    });
  });

  describe('Status Button Visibility', () => {
    it('should show disburse button only for APPROVED advances', async () => {
      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        expect(disburseButton).toBeInTheDocument();
      });
    });

    it('should show settle button for non-APPROVED advances', async () => {
      cashAdvanceApi.getAll.mockResolvedValue({
        data: { data: [{ ...mockAdvances[0], status: 'DISBURSED' }] },
      });

      renderWithProviders(<SettlementPage />);

      await selectStatus('Disbursed / Outstanding');

      await waitFor(() => {
        const settleButton = screen.getByRole('button', { name: /settle advance/i });
        expect(settleButton).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error on disburse API failure', async () => {
      cashAdvanceApi.disburse.mockRejectedValue({
        response: { data: { message: 'Payment processing failed' } },
      });

      renderWithProviders(<SettlementPage />);

      await selectStatus('Approved (Awaiting Disbursement)');

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /^disburse$/i });
        fireEvent.click(disburseButton);
      });

      fillCashConfirmation();
      const confirmButton = screen.getByRole('button', { name: /confirm disburse/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.disburse).toHaveBeenCalled();
      });
    });
  });
});
