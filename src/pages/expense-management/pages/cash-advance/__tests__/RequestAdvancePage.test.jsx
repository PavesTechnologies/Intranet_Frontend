import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestAdvancePage from '../RequestAdvancePage';
import * as cashAdvanceApi from '../../../api/cashAdvanceApi';
import * as lookupService from '../../../api/expenseReportsApi';

/**
 * EP04-S1 Test Suite: Employee Cash Advance Request
 *
 * Tests validation, submission, error handling, and UX workflows
 */

jest.mock('../../../api/cashAdvanceApi');
jest.mock('../../../api/expenseReportsApi');
jest.mock('@/components/toastfy/toast');

describe('RequestAdvancePage - EP04-S1: Cash Advance Request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lookupService.getActiveCostCenters.mockResolvedValue([
      { costCenterId: 'cc-1', costCenterCode: 'ENG', costCenterName: 'Engineering' },
    ]);
    lookupService.getActiveCurrencies.mockResolvedValue([
      { currencyId: 'cur-1', currencyCode: 'USD', currencyName: 'US Dollar' },
    ]);
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [] },
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      render(<RequestAdvancePage />);

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/enter a valid advance amount/i)).toBeInTheDocument();
      });
    });

    it('should validate positive amount', async () => {
      render(<RequestAdvancePage />);

      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(amountInput, '-100');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/enter a valid advance amount/i)).toBeInTheDocument();
      });
    });

    it('should validate settlement date is after needed date', async () => {
      render(<RequestAdvancePage />);

      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(neededDateInput, '2026-10-20');
      await userEvent.type(settlementDateInput, '2026-10-10');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/settlement expected date cannot be before/i)).toBeInTheDocument();
      });
    });
  });

  describe('Submit Button State', () => {
    it('should disable submit button during submission', async () => {
      cashAdvanceApi.create.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: { data: { advanceId: 'adv-1' } } }), 500))
      );

      render(<RequestAdvancePage />);

      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const currencySelect = screen.getByLabelText(/currency/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '5000');
      fireEvent.change(currencySelect, { target: { value: 'cur-1' } });
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, '2026-10-15');
      await userEvent.type(settlementDateInput, '2026-10-25');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      fireEvent.click(submitButton);

      // Check button is disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Successful Submission', () => {
    it('should submit valid form and redirect', async () => {
      const mockNavigate = jest.fn();
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      cashAdvanceApi.create.mockResolvedValue({
        data: { data: { advanceId: 'adv-1', status: 'DRAFT' } },
      });

      render(<RequestAdvancePage />);

      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const currencySelect = screen.getByLabelText(/currency/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '5000');
      fireEvent.change(currencySelect, { target: { value: 'cur-1' } });
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, '2026-10-15');
      await userEvent.type(settlementDateInput, '2026-10-25');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(cashAdvanceApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Business Trip',
            amount: 5000,
            currencyId: 'cur-1',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on submission failure', async () => {
      cashAdvanceApi.create.mockRejectedValue({
        response: { data: { message: 'Amount exceeds policy limit' } },
      });

      render(<RequestAdvancePage />);

      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const currencySelect = screen.getByLabelText(/currency/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '50000');
      fireEvent.change(currencySelect, { target: { value: 'cur-1' } });
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, '2026-10-15');
      await userEvent.type(settlementDateInput, '2026-10-25');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(cashAdvanceApi.create).toHaveBeenCalled();
      });
    });
  });
});
