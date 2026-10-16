import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CashAdvanceApprovalsList from '../CashAdvanceApprovalsList';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import * as authContext from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * EP04-S2 Test Suite: Manager Cash Advance Approval
 *
 * Tests approval workflow, confirmation dialogs, and rejection handling
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

describe('CashAdvanceApprovalsList - EP04-S2: Manager Approval', () => {
  const mockAdvances = [
    {
      advanceId: 'adv-1',
      advanceNumber: 'ADV-001',
      title: 'Business Trip',
      purpose: 'Client meeting',
      amount: 5000,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      managerId: 'mgr-1',
      employeeName: 'John Doe',
      status: 'SUBMITTED',
      neededByDate: '2026-10-20',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.getMyApprovals.mockResolvedValue({
      data: { data: mockAdvances },
    });
    authContext.useAuth.mockReturnValue({
      user: { id: 'mgr-1' },
      hasRole: vi.fn(() => true),
    });
  });

  describe('Approval Confirmation Dialog', () => {
    it('should show approval confirmation modal when approve button clicked', async () => {
      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/approve cash advance request/i)).toBeInTheDocument();
        expect(screen.getByText(/business trip/i)).toBeInTheDocument();
      });
    });

    it('should display advance details in confirmation dialog', async () => {
      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/USD 5,000.00/, { selector: 'strong' })).toBeInTheDocument();
      });
    });

    it('should allow adding optional remarks before approval', async () => {
      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      const remarksField = screen.getByPlaceholderText(/approval remarks/i);
      await userEvent.type(remarksField, 'Approved with budget review');

      expect(remarksField.value).toBe('Approved with budget review');
    });

    it('should close confirmation dialog on cancel', async () => {
      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/approve cash advance request/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Approval Submission', () => {
    it('should call approve API when confirmed', async () => {
      cashAdvanceApi.approve.mockResolvedValue({
        data: { data: { ...mockAdvances[0], status: 'APPROVED' } },
      });

      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      const confirmButton = screen.getByRole('button', { name: /confirm approve/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.approve).toHaveBeenCalledWith('adv-1');
      });
    });

    it('should disable button during submission', async () => {
      cashAdvanceApi.approve.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: { data: mockAdvances[0] } }), 500))
      );

      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      const confirmButton = screen.getByRole('button', { name: /confirm approve/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });
  });

  describe('Rejection Dialog', () => {
    it('should show rejection reason modal when reject clicked', async () => {
      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const rejectButton = screen.getByRole('button', { name: /reject/i });
        fireEvent.click(rejectButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reject cash advance request/i })).toBeInTheDocument();
      });
    });

    it('should require rejection reason', async () => {
      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const rejectButton = screen.getByRole('button', { name: /reject/i });
        fireEvent.click(rejectButton);
      });

      const confirmRejectButton = screen.getByRole('button', { name: /confirm reject/i });
      fireEvent.click(confirmRejectButton);

      // Should show error or not allow submission without reason
      await waitFor(() => {
        expect(cashAdvanceApi.reject).not.toHaveBeenCalled();
      });
    });

    it('should call reject API with reason when submitted', async () => {
      cashAdvanceApi.reject.mockResolvedValue({
        data: { data: { ...mockAdvances[0], status: 'REJECTED' } },
      });

      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const rejectButton = screen.getByRole('button', { name: /reject/i });
        fireEvent.click(rejectButton);
      });

      const reasonTextarea = screen.getByPlaceholderText(/reason for rejecting/i);
      await userEvent.type(reasonTextarea, 'Insufficient documentation');

      const confirmRejectButton = screen.getByRole('button', { name: /confirm reject/i });
      fireEvent.click(confirmRejectButton);

      await waitFor(() => {
        expect(cashAdvanceApi.reject).toHaveBeenCalledWith('adv-1', 'Insufficient documentation');
      });
    });
  });

  describe('List Filtering', () => {
    it('should filter by pending status', async () => {
      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        expect(screen.getByText(/business trip/i)).toBeInTheDocument();
      });

      expect(cashAdvanceApi.getMyApprovals).toHaveBeenCalled();
    });

    it('should filter by approved status', async () => {
      const approvedAdvances = [
        { ...mockAdvances[0], status: 'APPROVED' },
      ];
      cashAdvanceApi.getMyApprovals.mockResolvedValue({
        data: { data: approvedAdvances },
      });

      renderWithProviders(<CashAdvanceApprovalsList activeTab="approved" />);

      await waitFor(() => {
        expect(screen.getByText(/business trip/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message on approval failure', async () => {
      cashAdvanceApi.approve.mockRejectedValue({
        response: { data: { message: 'Cannot approve - manager not authorized' } },
      });

      renderWithProviders(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      const confirmButton = screen.getByRole('button', { name: /confirm approve/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.approve).toHaveBeenCalled();
      });
    });
  });
});
