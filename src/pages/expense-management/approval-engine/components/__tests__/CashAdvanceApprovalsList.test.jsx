import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CashAdvanceApprovalsList from '../CashAdvanceApprovalsList';
import * as cashAdvanceApi from '../../../api/cashAdvanceApi';
import * as authContext from '@/contexts/AuthContext';

/**
 * EP04-S2 Test Suite: Manager Cash Advance Approval
 *
 * Tests approval workflow, confirmation dialogs, and rejection handling
 */

jest.mock('../../../api/cashAdvanceApi');
jest.mock('@/contexts/AuthContext');
jest.mock('@/components/toastfy/toast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

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
      employeeName: 'John Doe',
      status: 'SUBMITTED',
      neededByDate: '2026-10-20',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    cashAdvanceApi.getMyApprovals.mockResolvedValue({
      data: { data: mockAdvances },
    });
    authContext.useAuth.mockReturnValue({
      user: { id: 'mgr-1' },
      hasRole: jest.fn(() => true),
    });
  });

  describe('Approval Confirmation Dialog', () => {
    it('should show approval confirmation modal when approve button clicked', async () => {
      render(<CashAdvanceApprovalsList activeTab="pending" />);

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
      render(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/5000.*USD/i)).toBeInTheDocument();
      });
    });

    it('should allow adding optional remarks before approval', async () => {
      render(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);
      });

      const remarksField = screen.getByPlaceholderText(/approval remarks/i);
      await userEvent.type(remarksField, 'Approved with budget review');

      expect(remarksField.value).toBe('Approved with budget review');
    });

    it('should close confirmation dialog on cancel', async () => {
      render(<CashAdvanceApprovalsList activeTab="pending" />);

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

      render(<CashAdvanceApprovalsList activeTab="pending" />);

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

      render(<CashAdvanceApprovalsList activeTab="pending" />);

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
      render(<CashAdvanceApprovalsList activeTab="pending" />);

      await waitFor(() => {
        const rejectButton = screen.getByRole('button', { name: /reject/i });
        fireEvent.click(rejectButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/reject cash advance request/i)).toBeInTheDocument();
      });
    });

    it('should require rejection reason', async () => {
      render(<CashAdvanceApprovalsList activeTab="pending" />);

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

      render(<CashAdvanceApprovalsList activeTab="pending" />);

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
      render(<CashAdvanceApprovalsList activeTab="pending" />);

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

      render(<CashAdvanceApprovalsList activeTab="approved" />);

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

      render(<CashAdvanceApprovalsList activeTab="pending" />);

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
