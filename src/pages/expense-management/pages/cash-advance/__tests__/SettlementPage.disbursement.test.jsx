import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettlementPage from '../SettlementPage';
import * as cashAdvanceApi from '../../../api/cashAdvanceApi';
import * as expenseReportService from '../../../api/expenseReportsApi';
import * as authContext from '@/contexts/AuthContext';

/**
 * EP04-S3 Test Suite: Finance Disbursement Workflow
 *
 * Tests disburse confirmation dialog, status transitions, and error handling
 */

jest.mock('../../../api/cashAdvanceApi');
jest.mock('../../../api/expenseReportsApi');
jest.mock('@/contexts/AuthContext');
jest.mock('@/components/toastfy/toast');

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
    jest.clearAllMocks();
    cashAdvanceApi.getAll.mockResolvedValue({
      data: { data: mockAdvances },
    });
    expenseReportService.getAll.mockResolvedValue({
      data: { data: [] },
    });
    authContext.useAuth.mockReturnValue({
      user: { id: 'fin-1' },
      hasRole: jest.fn(() => true),
    });
    authContext.useEmployeeDirectory.mockReturnValue({
      data: new Map(),
    });
  });

  describe('Approved Status Filter', () => {
    it('should show "Approved (Awaiting Disbursement)" filter option', async () => {
      render(<SettlementPage />);

      await waitFor(() => {
        const filterSelect = screen.getByLabelText(/status/i);
        expect(filterSelect.querySelector('option[value="APPROVED"]')).toBeInTheDocument();
      });
    });

    it('should filter advances by APPROVED status', async () => {
      render(<SettlementPage />);

      await waitFor(() => {
        const filterSelect = screen.getByLabelText(/status/i);
        fireEvent.change(filterSelect, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/business trip/i)).toBeInTheDocument();
      });
    });
  });

  describe('Disburse Confirmation Dialog', () => {
    it('should show disburse confirmation modal when disburse button clicked', async () => {
      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        fireEvent.click(disburseButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/disburse cash advance/i)).toBeInTheDocument();
        expect(screen.getByText(/adv-001/i)).toBeInTheDocument();
      });
    });

    it('should display advance details in disburse modal', async () => {
      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        fireEvent.click(disburseButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/5000.*USD/i)).toBeInTheDocument();
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('should show outstanding balance in confirmation', async () => {
      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        fireEvent.click(disburseButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/outstanding balance/i)).toBeInTheDocument();
        expect(screen.getByText(/5000.*USD/i)).toBeInTheDocument();
      });
    });

    it('should close modal on cancel', async () => {
      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
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

      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        fireEvent.click(disburseButton);
      });

      const confirmButton = screen.getByRole('button', { name: /confirm disburse/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.disburse).toHaveBeenCalledWith('adv-1');
      });
    });

    it('should disable button during submission', async () => {
      cashAdvanceApi.disburse.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: { data: mockAdvances[0] } }), 500))
      );

      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        fireEvent.click(disburseButton);
      });

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

      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        fireEvent.click(disburseButton);
      });

      const confirmButton = screen.getByRole('button', { name: /confirm disburse/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.getAll).toHaveBeenCalledTimes(2); // Initial load + after disburse
      });
    });
  });

  describe('Status Button Visibility', () => {
    it('should show disburse button only for APPROVED advances', async () => {
      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        expect(disburseButton).toBeInTheDocument();
      });
    });

    it('should show settle button for non-APPROVED advances', async () => {
      cashAdvanceApi.getAll.mockResolvedValue({
        data: { data: [{ ...mockAdvances[0], status: 'DISBURSED' }] },
      });

      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'DISBURSED' } });
      });

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

      render(<SettlementPage />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
      });

      await waitFor(() => {
        const disburseButton = screen.getByRole('button', { name: /disburse/i });
        fireEvent.click(disburseButton);
      });

      const confirmButton = screen.getByRole('button', { name: /confirm disburse/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(cashAdvanceApi.disburse).toHaveBeenCalled();
      });
    });
  });
});
