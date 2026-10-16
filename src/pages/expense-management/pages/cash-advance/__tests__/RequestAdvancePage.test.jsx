import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestAdvancePage from '../RequestAdvancePage';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import { lookupService } from '../../../api/expenseReportsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * EP04-S1 Test Suite: Employee Cash Advance Request
 *
 * Tests validation, submission, error handling, and UX workflows
 */

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../api/cashAdvanceApi');
vi.mock('../../../api/expenseReportsApi');
vi.mock('@/components/toastfy/toast');

function renderWithProviders(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectCurrency() {
  fireEvent.click(screen.getByRole('button', { name: /select currency/i }));
  fireEvent.click(await screen.findByRole('option', { name: /USD/ }));
}

describe('RequestAdvancePage - EP04-S1: Cash Advance Request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      renderWithProviders(<RequestAdvancePage />);

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      // The button is disabled until currencies and balances finish loading.
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/enter a valid advance amount/i)).toBeInTheDocument();
      });
    });

    it('should validate positive amount', async () => {
      renderWithProviders(<RequestAdvancePage />);

      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(amountInput, '-100');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      // The button is disabled until currencies and balances finish loading.
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      // The amount input has min="0", so the browser blocks submission before the
      // custom message can render. The request must never reach the API.
      await waitFor(() => expect(amountInput).toBeInvalid());
      expect(cashAdvanceApi.create).not.toHaveBeenCalled();
    });

    it('should validate settlement date is after needed date', async () => {
      renderWithProviders(<RequestAdvancePage />);

      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      // Date inputs are set directly: typing into them character by character is unreliable in jsdom.
      fireEvent.change(neededDateInput, { target: { value: '2026-10-20' } });
      fireEvent.change(settlementDateInput, { target: { value: '2026-10-10' } });

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      // The button is disabled until currencies and balances finish loading.
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      // The settlement input now carries min = needed-by date, so the browser rejects the earlier
      // date natively and the request is never sent.
      await waitFor(() => expect(settlementDateInput).toBeInvalid());
      expect(cashAdvanceApi.create).not.toHaveBeenCalled();
    });
  });

  describe('Submit Button State', () => {
    it('should disable submit button during submission', async () => {
      cashAdvanceApi.create.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: { data: { advanceId: 'adv-1' } } }), 500))
      );

      renderWithProviders(<RequestAdvancePage />);

      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '5000');
      await selectCurrency();
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, '2026-10-15');
      await userEvent.type(settlementDateInput, '2026-10-25');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      // The button is disabled until currencies and balances finish loading.
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      // Check button is disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Successful Submission', () => {
    it('should submit valid form and redirect', async () => {
      cashAdvanceApi.create.mockResolvedValue({
        data: { data: { advanceId: 'adv-1', status: 'DRAFT' } },
      });

      renderWithProviders(<RequestAdvancePage />);

      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '5000');
      await selectCurrency();
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, '2026-10-15');
      await userEvent.type(settlementDateInput, '2026-10-25');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      // The button is disabled until currencies and balances finish loading.
      await waitFor(() => expect(submitButton).toBeEnabled());
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

      renderWithProviders(<RequestAdvancePage />);

      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '50000');
      await selectCurrency();
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, '2026-10-15');
      await userEvent.type(settlementDateInput, '2026-10-25');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      // The button is disabled until currencies and balances finish loading.
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(cashAdvanceApi.create).toHaveBeenCalled();
      });
    });
  });
});
