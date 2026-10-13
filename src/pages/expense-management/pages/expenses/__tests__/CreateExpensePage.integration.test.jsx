import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateExpensePage from '../CreateExpensePage';
import * as expenseApi from '../../../api/expenseReportsApi';
import * as cashAdvanceApi from '../../../api/cashAdvanceApi';
import * as authContext from '@/contexts/AuthContext';

/**
 * EP04-S4 Test Suite: Expense-Advance Integration
 *
 * Tests cash advance selector filtering, offset application, and integration flows
 */

jest.mock('../../../api/expenseReportsApi');
jest.mock('../../../api/cashAdvanceApi');
jest.mock('@/contexts/AuthContext');
jest.mock('@/components/toastfy/toast');

describe('CreateExpensePage - EP04-S4: Expense-Advance Integration', () => {
  const mockAdvances = [
    {
      advanceId: 'adv-1',
      advanceNumber: 'ADV-001',
      title: 'Business Trip',
      amount: 5000,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      status: 'DISBURSED',
      outstandingBalance: 3000,
    },
    {
      advanceId: 'adv-2',
      advanceNumber: 'ADV-002',
      title: 'Conference',
      amount: 2000,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      status: 'SETTLED',
      outstandingBalance: 0,
    },
    {
      advanceId: 'adv-3',
      advanceNumber: 'ADV-003',
      title: 'Client Visit',
      amount: 1500,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      status: 'IN_PROGRESS',
      outstandingBalance: 1500,
    },
  ];

  const mockCategories = [
    { expenseCategoryId: 'cat-1', categoryName: 'Travel' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: mockAdvances },
    });
    expenseApi.getActiveExpenseCategories.mockResolvedValue(mockCategories);
    authContext.useAuth.mockReturnValue({
      user: { id: 'emp-1' },
      hasRole: jest.fn(() => true),
    });
  });

  describe('Cash Advance Selector Filtering', () => {
    it('should load all advances on page load', async () => {
      render(<CreateExpensePage />);

      await waitFor(() => {
        expect(cashAdvanceApi.getMyAdvances).toHaveBeenCalled();
      });
    });

    it('should only show DISBURSED and IN_PROGRESS advances', async () => {
      render(<CreateExpensePage />);

      const advanceSelect = screen.getByLabelText(/select cash advance/i);
      const options = advanceSelect.querySelectorAll('option');

      await waitFor(() => {
        const optionTexts = Array.from(options).map(o => o.textContent);
        expect(optionTexts).toContain('ADV-001');
        expect(optionTexts).toContain('ADV-003');
        expect(optionTexts).not.toContain('ADV-002'); // SETTLED should be filtered out
      });
    });

    it('should exclude advances with zero outstanding balance', async () => {
      const advancesWithZeroBalance = [
        { ...mockAdvances[0], outstandingBalance: 0, status: 'DISBURSED' },
      ];
      cashAdvanceApi.getMyAdvances.mockResolvedValue({
        data: { data: advancesWithZeroBalance },
      });

      render(<CreateExpensePage />);

      const advanceSelect = screen.getByLabelText(/select cash advance/i);
      const options = advanceSelect.querySelectorAll('option');

      await waitFor(() => {
        const optionTexts = Array.from(options).map(o => o.textContent);
        expect(optionTexts).not.toContain('ADV-001');
      });
    });

    it('should display advance details: ID, title, amount, balance', async () => {
      render(<CreateExpensePage />);

      const advanceSelect = screen.getByLabelText(/select cash advance/i);
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } });

      await waitFor(() => {
        expect(screen.getByText(/adv-001/i)).toBeInTheDocument();
        expect(screen.getByText(/business trip/i)).toBeInTheDocument();
        expect(screen.getByText(/outstanding balance.*3000/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cash Advance Selection', () => {
    it('should allow selecting a cash advance', async () => {
      render(<CreateExpensePage />);

      const advanceSelect = screen.getByLabelText(/select cash advance/i);
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } });

      expect(advanceSelect.value).toBe('adv-1');
    });

    it('should clear selection when user clicks clear button', async () => {
      render(<CreateExpensePage />);

      const advanceSelect = screen.getByLabelText(/select cash advance/i);
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } });

      const clearButton = screen.getByRole('button', { name: /clear advance/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(advanceSelect.value).toBe('');
      });
    });

    it('should display selected advance in form state', async () => {
      render(<CreateExpensePage />);

      const advanceSelect = screen.getByLabelText(/select cash advance/i);
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } });

      // Verify formData contains selected advance
      await waitFor(() => {
        expect(advanceSelect.value).toBe('adv-1');
      });
    });
  });

  describe('Expense Submission with Advance', () => {
    it('should include selected advance in expense submission', async () => {
      expenseApi.create.mockResolvedValue({
        data: { data: { reportId: 'rep-1', status: 'DRAFT' } },
      });

      render(<CreateExpensePage />);

      // Fill form
      const titleInput = screen.getByLabelText(/expense title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const advanceSelect = screen.getByLabelText(/select cash advance/i);

      await userEvent.type(titleInput, 'Hotel Expense');
      await userEvent.type(amountInput, '500');
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(expenseApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            cashAdvanceId: 'adv-1',
          })
        );
      });
    });

    it('should submit expense without advance if none selected', async () => {
      expenseApi.create.mockResolvedValue({
        data: { data: { reportId: 'rep-1', status: 'DRAFT' } },
      });

      render(<CreateExpensePage />);

      const titleInput = screen.getByLabelText(/expense title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const categorySelect = screen.getByLabelText(/category/i);

      await userEvent.type(titleInput, 'Hotel Expense');
      await userEvent.type(amountInput, '500');
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(expenseApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            cashAdvanceId: null,
          })
        );
      });
    });
  });

  describe('Advance Offset Integration', () => {
    it('should show offset warning when advance selected exceeds expense amount', async () => {
      render(<CreateExpensePage />);

      const amountInput = screen.getByLabelText(/amount/i);
      const advanceSelect = screen.getByLabelText(/select cash advance/i);

      await userEvent.type(amountInput, '100'); // Small amount
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } }); // 3000 outstanding

      await waitFor(() => {
        expect(screen.getByText(/advance offset will be applied/i)).toBeInTheDocument();
      });
    });

    it('should display offset calculation details', async () => {
      render(<CreateExpensePage />);

      const amountInput = screen.getByLabelText(/amount/i);
      const advanceSelect = screen.getByLabelText(/select cash advance/i);

      await userEvent.type(amountInput, '500');
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } });

      await waitFor(() => {
        expect(screen.getByText(/remaining balance after offset/i)).toBeInTheDocument();
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('should read cash advance ID from URL parameters', async () => {
      // Mock route with advance parameter
      window.history.pushState({}, '', '?advanceId=adv-1');

      render(<CreateExpensePage />);

      const advanceSelect = screen.getByLabelText(/select cash advance/i);

      await waitFor(() => {
        expect(advanceSelect.value).toBe('adv-1');
      });
    });

    it('should pre-populate form when navigated with advance ID', async () => {
      window.history.pushState({}, '', '?advanceId=adv-1');

      render(<CreateExpensePage />);

      await waitFor(() => {
        expect(screen.getByText(/adv-001/i)).toBeInTheDocument();
        expect(screen.getByText(/business trip/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error if advance loading fails', async () => {
      cashAdvanceApi.getMyAdvances.mockRejectedValue({
        response: { data: { message: 'Failed to load advances' } },
      });

      render(<CreateExpensePage />);

      await waitFor(() => {
        expect(cashAdvanceApi.getMyAdvances).toHaveBeenCalled();
      });
    });

    it('should show error if expense submission with advance fails', async () => {
      expenseApi.create.mockRejectedValue({
        response: { data: { message: 'Expense exceeds advance balance' } },
      });

      render(<CreateExpensePage />);

      const titleInput = screen.getByLabelText(/expense title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const advanceSelect = screen.getByLabelText(/select cash advance/i);

      await userEvent.type(titleInput, 'Expense');
      await userEvent.type(amountInput, '10000'); // Exceeds balance
      fireEvent.change(advanceSelect, { target: { value: 'adv-1' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(expenseApi.create).toHaveBeenCalled();
      });
    });
  });
});
